import {
  PermissionsBitField,
  CommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  ApplicationCommandOptionType,
  Attachment,
  GuildMember,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  resolveColor,
  ButtonStyle,
  CommandInteractionOption,
  CacheType,
} from "discord.js";
import chalk from "chalk";
import { Manager } from "../../manager.js";
import { GlobalInteraction, NoAutoInteraction } from "../../@types/Interaction.js";
import {
  CheckPermissionResultInterface,
  CheckPermissionServices,
} from "../../services/CheckPermissionService.js";
import axios from "axios";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Accessableby } from "../../structures/Command.js";
import { ConvertToMention } from "../../utilities/ConvertToMention.js";
import { RatelimitReplyService } from "../../services/RatelimitReplyService.js";
import { RateLimitManager } from "@sapphire/ratelimits";
import { AutoCompleteService } from "../../services/AutoCompleteService.js";
import { TopggServiceEnum } from "../../services/TopggService.js";
import { AutoReconnectBuilderService } from "../../services/AutoReconnectBuilderService.js";

const commandRateLimitManager = new RateLimitManager(1000);

/**
 * @param {GlobalInteraction} interaction
 */

export default class {
  async execute(client: Manager, interaction: GlobalInteraction) {
    if (interaction.isAutocomplete()) return new AutoCompleteService(client, interaction);
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.guild || interaction.user.bot) return;

    if (!client.isDatabaseConnected)
      return client.logger.warn(
        "DatabaseService",
        chalk.red(
          `The database is not yet connected so this event will temporarily not execute. Please try again later!`
        )
      );

    let guildModel = await client.db.language.get(`${interaction.guild.id}`);
    if (!guildModel) {
      guildModel = await client.db.language.set(
        `${interaction.guild.id}`,
        client.config.bot.LANGUAGE
      );
    }

    const language = guildModel;

    let subCommandName = "";
    try {
      subCommandName = interaction.options.getSubcommand();
    } catch {}
    let subCommandGroupName;
    try {
      subCommandGroupName = interaction.options.getSubcommandGroup();
    } catch {}

    const commandNameArray = [];

    if (interaction.commandName) commandNameArray.push(interaction.commandName);
    if (subCommandName.length !== 0 && !subCommandGroupName) commandNameArray.push(subCommandName);
    if (subCommandGroupName) {
      commandNameArray.push(subCommandGroupName);
      commandNameArray.push(subCommandName);
    }

    const command = client.commands.get(commandNameArray.join("-"));

    if (!command) return commandNameArray.length == 0;

    //////////////////////////////// Ratelimit check start ////////////////////////////////
    const ratelimit = commandRateLimitManager.acquire(
      `${interaction.user.id}@${command.name.join("-")}`
    );

    if (ratelimit.limited) {
      new RatelimitReplyService({
        client: client,
        language: language,
        interaction: interaction,
        time: Number(((ratelimit.expires - Date.now()) / 1000).toFixed(1)),
      }).reply();
      return;
    } else if (ratelimit.limited) return;

    ratelimit.consume();
    //////////////////////////////// Ratelimit check end ////////////////////////////////

    //////////////////////////////// Permission check start ////////////////////////////////
    const permissionChecker = new CheckPermissionServices();

    // Default permission
    const defaultPermissions = [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.ReadMessageHistory,
    ];
    const musicPermissions = [PermissionFlagsBits.Speak, PermissionFlagsBits.Connect];
    const managePermissions = [PermissionFlagsBits.ManageChannels];

    async function respondError(
      interaction: ChatInputCommandInteraction | CommandInteraction,
      permissionResult: CheckPermissionResultInterface
    ) {
      const selfErrorString = `${client.i18n.get(language, "interaction", "no_perms", {
        perm: permissionResult.result,
      })}`;
      const embed = new EmbedBuilder()
        .setDescription(
          permissionResult.channel == "Self"
            ? selfErrorString
            : `${client.i18n.get(language, "interaction", "no_perms_channel", {
                perm: permissionResult.result,
                channel: permissionResult.channel,
              })}`
        )
        .setColor(client.color_main);
      await interaction.reply({
        embeds: [embed],
      });
    }

    if (command.name[0] !== "help") {
      const returnData = await permissionChecker.interaction(interaction, defaultPermissions);
      if (returnData.result !== "PermissionPass") return respondError(interaction, returnData);
    }
    if (command.category.toLocaleLowerCase() == "music") {
      const returnData = await permissionChecker.interaction(interaction, musicPermissions);
      if (returnData.result !== "PermissionPass") return respondError(interaction, returnData);
    }
    if (command.accessableby.includes(Accessableby.Manager)) {
      const returnData = await permissionChecker.interaction(interaction, managePermissions);
      if (returnData.result !== "PermissionPass") return respondError(interaction, returnData);
    } else if (command.permissions.length !== 0) {
      const returnData = await permissionChecker.interaction(interaction, command.permissions);
      if (returnData.result !== "PermissionPass") return respondError(interaction, returnData);
    }
    //////////////////////////////// Permission check end ////////////////////////////////

    //////////////////////////////// Check availability start ////////////////////////////////
    const isNotManager = !(interaction.member!.permissions as Readonly<PermissionsBitField>).has(
      PermissionsBitField.Flags.ManageGuild
    );

    if (command.accessableby.includes(Accessableby.Manager) && isNotManager)
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(language, "interaction", "no_manage_guild_perms", {
                perm: "ManageGuild",
              })}`
            )
            .setColor(client.color_main),
        ],
      });

    if (command.playerCheck) {
      const player = client.mewslink.players.get(interaction.guild!.id);
      const twentyFourBuilder = new AutoReconnectBuilderService(client);
      const is247 = await twentyFourBuilder.get(interaction.guild!.id);
      if (
        !player ||
        (is247 && is247.twentyfourseven && player.queue.length == 0 && !player.queue.current)
      )
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(`${client.i18n.get(language, "interaction", "no_player")}`)
              .setColor(client.color_main),
          ],
        });
    }

    if (command.sameVoiceCheck) {
      const { channel } = (interaction.member as GuildMember)!.voice;
      if (
        !channel ||
        (interaction.member as GuildMember)!.voice.channel !==
          interaction.guild!.members.me!.voice.channel
      )
        return (interaction as NoAutoInteraction).reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(`${client.i18n.get(language, "interaction", "no_same_voice")}`)
              .setColor(client.color_main),
          ],
        });
    }

    if (command.lavalink && client.lavalinkUsing.length == 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(`${client.i18n.get(language, "interaction", "no_node")}`)
            .setColor(client.color_main),
        ],
      });
    }

    //////////////////////////////// DJ ROLE CHECK START ////////////////////////////////
    if (command.djRole) {
      const djData = await client.db.DjRole.get(interaction.guild.id);
      const isOwner = interaction.user.id === String(client.owner);
      const isAdmin = client.config.bot.ADMIN.map(String).includes(interaction.user.id);

      // Jika fitur DJ diaktifkan (enable: true)
      if (djData && djData.enable === true) {
        const member = interaction.member as GuildMember;
        const hasDjRole = djData.roleid ? member.roles.cache.has(djData.roleid) : false;

        // Jika user bukan DJ, bukan Manager Server, bukan Bot Owner, dan bukan Admin Bot
        if (!hasDjRole && isNotManager && !isOwner && !isAdmin) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  `${client.i18n.get(language, "interaction", "not_dj_role", {
                    role: djData.roleid ? `<@&${djData.roleid}>` : "None",
                  })}`
                )
                .setColor(client.color_main),
            ],
          });
        }
      }
    }
    //////////////////////////////// DJ ROLE CHECK END ////////////////////////////////

    const User = await client.db.premium.get(interaction.user.id);
    const Guild = await client.db.preGuild.get(interaction.guild.id);
    const isPremiumUser = User && User.isPremium;
    const isPremiumGuild = Guild && Guild.isPremium;
    const isOwner = interaction.user.id === String(client.owner);
    const isAdmin = client.config.bot.ADMIN.map(String).includes(interaction.user.id);

    const userPerm = {
      owner: isOwner,
      admin: isOwner || isAdmin,
      Premium: isOwner || isAdmin || isPremiumUser || isPremiumGuild,
    };

    const BlacklistUser = await client.db.BlacklistUser.get(interaction.user.id);
    if (BlacklistUser) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder().setColor(client.color_main).setDescription(
            `${client.i18n.get(language, "interaction", "blacklist_user", {
              user: interaction.user.displayName,
              serversupport: client.config.bot.SERVER_SUPPORT_URL,
            })}`
          ),
        ],
      });
    }

    const BlacklistGuild = await client.db.BlacklistGuild.get(interaction.guild.id);
    if (!isOwner && !isAdmin && BlacklistGuild) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder().setColor(client.color_main).setDescription(
            `${client.i18n.get(language, "interaction", "blacklist_guild", {
              user: interaction.user.displayName,
              guild: interaction.guild.name,
              serversupport: client.config.bot.SERVER_SUPPORT_URL,
            })}`
          ),
        ],
      });
    }

    if (!isOwner && !isAdmin) {
      const maintenanceData = await client.db.maintenance.all();
      for (const entry of maintenanceData) {
        if (entry.value === "true") {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle(`${client.i18n.get(language, "interaction", "maintenance_title")}`)
                .setColor(client.color_main)
                .setDescription(
                  `${client.i18n.get(language, "interaction", "maintenance_desc", {
                    bot: client.user!.username,
                    serversupport: client.config.bot.SERVER_SUPPORT_URL,
                  })}`
                ),
            ],
          });
        }
      }
    }

    const isMissingPremium =
      command.accessableby.includes(Accessableby.Premium) && !userPerm.Premium;
    if (isMissingPremium) {
      const premiumButton = new ButtonBuilder()
        .setLabel(client.i18n.get(language, "interaction", "no_premium_button"))
        .setStyle(ButtonStyle.Link)
        .setURL(client.config.bot.PREMIUM_URL)
        .setEmoji(client.config.MENU_HELP_EMOJI.E_PREMIUM);

      const noPremiumEmbed = new ContainerBuilder()
        .setAccentColor(resolveColor(client.color_main))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### ${client.i18n.get(language, "interaction", "no_premium_author")}`
          )
        )
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                client.i18n.get(language, "interaction", "no_premium_desc", {
                  user: `${interaction.user}`,
                  serversupport: client.config.bot.SERVER_SUPPORT_URL,
                  premium: client.config.bot.PREMIUM_URL,
                })
              )
            )
            .setButtonAccessory(premiumButton)
        );
      return interaction.reply({
        components: [noPremiumEmbed],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    if (command.accessableby.includes(Accessableby.Owner) && !userPerm.owner)
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(`${client.i18n.get(language, "interaction", "owner_only")}`)
            .setColor(client.color_main),
        ],
      });

    if (command.accessableby.includes(Accessableby.Admin) && !userPerm.admin)
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(language, "interaction", "no_admin_perms", { perm: "admin" })}`
            )
            .setColor(client.color_main),
        ],
      });

    if (client.topgg) {
      if (command.accessableby.includes(Accessableby.Voter)) {
        if (!userPerm.Premium) {
          const voteChecker = await client.topgg.checkVote(interaction.user.id);
          if (voteChecker == TopggServiceEnum.ERROR) {
            const embed = new EmbedBuilder()
              .setAuthor({
                name: client.i18n.get(language, "interaction", "topgg_error_author"),
              })
              .setDescription(
                client.i18n.get(language, "interaction", "topgg_error_desc", {
                  serversupport: client.config.bot.SERVER_SUPPORT_URL,
                  premium: client.config.bot.PREMIUM_URL,
                })
              )
              .setColor(client.color_main);
            return interaction.reply({
              content: " ",
              embeds: [embed],
            });
          }

          if (voteChecker == TopggServiceEnum.UNVOTED) {
            const voteButton = new ButtonBuilder()
              .setLabel(client.i18n.get(language, "interaction", "topgg_unvote_button"))
              .setStyle(ButtonStyle.Link)
              .setURL(`https://top.gg/bot/${client.user?.id}/vote`);

            const TopggUnvotedEmbed = new ContainerBuilder()
              .setAccentColor(resolveColor(client.color_main))
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `### ${client.i18n.get(language, "interaction", "topgg_unvote_author")}`
                )
              )
              .addSectionComponents(
                new SectionBuilder()
                  .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                      client.i18n.get(language, "interaction", "topgg_unvote_desc", {
                        user: `${interaction.user}`,
                        serversupport: client.config.bot.SERVER_SUPPORT_URL,
                        premium: client.config.bot.PREMIUM_URL,
                      })
                    )
                  )
                  .setButtonAccessory(voteButton)
              );

            return interaction.reply({
              components: [TopggUnvotedEmbed],
              flags: MessageFlags.IsComponentsV2,
            });
          }
        }
      }
    }

    try {
      const args: string[] = [];
      let attachments: Attachment | undefined;
      let subCommandGroupName: string;

      function argConvert(dataArray: readonly CommandInteractionOption<CacheType>[]) {
        for (const data of dataArray) {
          if (data.type === ApplicationCommandOptionType.Subcommand) {
            argConvert(data.options!);
          }
          if (data.type === ApplicationCommandOptionType.SubcommandGroup) {
            const subCommandGroupOptions = data.options?.find(
              (option) => option.name === subCommandGroupName
            )?.options;
            if (subCommandGroupOptions) {
              argConvert(subCommandGroupOptions);
            }
          }
          const check = new ConvertToMention().execute({
            type: data.type,
            value: String(data.value),
          });
          if (check !== "error") {
            args.push(check);
          } else if (data.type === ApplicationCommandOptionType.Attachment) {
            attachments = data.attachment;
          } else {
            if (data.value) args.push(String(data.value));
            if (data.options) {
              for (const optionData of data.options) {
                if (optionData.value) args.push(String(optionData.value));
              }
            }
          }
        }
      }

      argConvert(interaction.options.data);

      const handler = new CommandHandler({
        interaction: interaction as CommandInteraction,
        language: language,
        client: client,
        args: args,
        prefix: "/",
      });

      if (attachments) handler.attactments.push(attachments);

      client.logger.info(
        "Slash Commands",
        `${chalk.hex("#00D100").bold(commandNameArray.join("-"))} used by ${chalk.hex("#00D100")(
          interaction.user.displayName
        )} (${chalk.hex("#00D100")(interaction.user.id)}) from ${chalk.hex("#00D100")(
          interaction.guild.name
        )} (${chalk.hex("#00D100")(interaction.guild.id)})`
      );

      ////////// CommandUserUsage //////////
      let commandUsage = await client.db.CommandUserUsage.get(`${interaction.user.id}`);
      if (!commandUsage) {
        commandUsage = await client.db.CommandUserUsage.set(`${interaction.user.id}`, {
          userid: interaction.user.id,
          username: interaction.user.username,
          total: 1,
        });
      } else {
        commandUsage.total += 1;
        await client.db.CommandUserUsage.set(`${interaction.user.id}`, commandUsage);
      }
      ////////// CommandUserUsage //////////

      ////////// CommandGlobalUsage //////////
      let globalCommandUsage = await client.db.CommandGlobalUsage.get("global");
      if (!globalCommandUsage) {
        globalCommandUsage = await client.db.CommandGlobalUsage.set("global", {
          total: 1,
        });
      } else {
        globalCommandUsage.total += 1;
        await client.db.CommandGlobalUsage.set("global", globalCommandUsage);
      }
      ////////// CommandGlobalUsage //////////

      command.execute(client, handler);
    } catch (error) {
      client.logger.error("CommandManager", error);
      interaction.reply({
        content: `${client.i18n.get(language, "interaction", "unexpected_error")}\n ${error}`,
      });
    }
  }
}
