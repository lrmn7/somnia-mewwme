import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Message,
  PermissionFlagsBits,
  GuildMember,
  PermissionsBitField,
  CommandInteraction,
  EmbedBuilder,
  ApplicationCommandOptionType,
  Attachment,
  ChatInputCommandInteraction,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  resolveColor,
  CommandInteractionOption,
  CacheType,
} from "discord.js";
import { Manager } from "../../manager.js";
import {
  CheckPermissionResultInterface,
  CheckPermissionServices,
} from "../../services/CheckPermissionService.js";
import chalk from "chalk";
import axios from "axios";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Accessableby } from "../../structures/Command.js";
import { RatelimitReplyService } from "../../services/RatelimitReplyService.js";
import { RateLimitManager } from "@sapphire/ratelimits";
import { TopggServiceEnum } from "../../services/TopggService.js";
import { AutoReconnectBuilderService } from "../../services/AutoReconnectBuilderService.js";
const commandRateLimitManager = new RateLimitManager(1000);

export default class {
  async execute(client: Manager, message: Message) {
    if (message.author.bot || message.channel.type == ChannelType.DM) return;

    if (!client.isDatabaseConnected)
      return client.logger.warn(
        "DatabaseService",
        chalk.red(
          `The database is not yet connected so this event will temporarily not execute. Please try again later!`
        )
      );

    let guildModel = await client.db.language.get(`${message.guild!.id}`);
    if (!guildModel) {
      guildModel = await client.db.language.set(`${message.guild!.id}`, client.config.bot.LANGUAGE);
    }

    const language = guildModel;

    let PREFIX = client.prefix;

    const mention = new RegExp(`^<@!?${client.user!.id}>( |)$`);

    const GuildPrefix = await client.db.prefix.get(`${message.guild!.id}`);
    if (GuildPrefix) PREFIX = GuildPrefix;
    else if (!GuildPrefix)
      PREFIX = String(await client.db.prefix.set(`${message.guild!.id}`, client.prefix));

    if (message.content.match(mention)) {
      const MentionButton = new ActionRowBuilder<ButtonBuilder>();
      if (client.config.bot.PREMIUM_URL) {
        MentionButton.addComponents(
          new ButtonBuilder()
            .setLabel(client.i18n.get(language, "interaction", "no_premium_button"))
            .setStyle(ButtonStyle.Link)
            .setURL(client.config.bot.PREMIUM_URL)
        );
      }

      await message.reply({
        content: client.i18n.get(language, "interaction", "mention_content", {
          user: message.author.displayName,
          bots: client.user!.username,
          prefix: PREFIX,
          bot: `<@${client.user!.id}>`,
          support: client.config.bot.SERVER_SUPPORT_URL,
          website: client.config.bot.WEBSITE_URL,
          votelink: `https://top.gg/bot/${client.user?.id}/vote`,
          premium: client.config.bot.PREMIUM_URL,
        }),
        embeds: [],
        components: MentionButton.components.length ? [MentionButton] : [],
      });
    }
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const prefixRegex = new RegExp(`^(<@!?${client.user!.id}>|${escapeRegex(PREFIX)})\\s*`);
    if (!prefixRegex.test(message.content)) return;
    const [matchedPrefix] = message.content.match(prefixRegex) as RegExpMatchArray;
    const args = message.content.slice(matchedPrefix.length).trim().split(/ +/g);
    const cmd = args.shift()!.toLowerCase();

    const command =
      client.commands.get(cmd) || client.commands.get(client.aliases.get(cmd) as string);
    if (!command) return;

    const setup = await client.db.setup.get(String(message.guildId));

    if (setup && setup.channel == message.channelId) return;

    //////////////////////////////// Ratelimit check start ////////////////////////////////
    const ratelimit = commandRateLimitManager.acquire(
      `${message.author.id}@${command.name.join("-")}`
    );

    if (ratelimit.limited) {
      new RatelimitReplyService({
        client: client,
        language: language,
        message: message,
        time: Number(((ratelimit.expires - Date.now()) / 1000).toFixed(1)),
      }).reply();
      return;
    }

    ratelimit.consume();
    //////////////////////////////// Ratelimit check end ////////////////////////////////

    //////////////////////////////// Permission check start ////////////////////////////////
    const permissionChecker = new CheckPermissionServices();

    //Default permission
    const defaultPermissions = [
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.ReadMessageHistory,
    ];
    const allCommandPermissions = [PermissionFlagsBits.ManageMessages];
    const musicPermissions = [PermissionFlagsBits.Speak, PermissionFlagsBits.Connect];
    const managePermissions = [PermissionFlagsBits.ManageChannels];

    async function respondError(permissionResult: CheckPermissionResultInterface) {
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
      const dmChannel =
        message.author.dmChannel == null
          ? await message.author.createDM()
          : message.author.dmChannel;
      dmChannel.send({
        embeds: [embed],
      });
    }

    const returnData = await permissionChecker.message(message, defaultPermissions);
    if (returnData.result !== "PermissionPass") return respondError(returnData);

    if (command.accessableby.includes(Accessableby.Manager)) {
      const returnData = await permissionChecker.message(message, managePermissions);
      if (returnData.result !== "PermissionPass") return respondError(returnData);
    } else if (command.category == "Music") {
      const returnData = await permissionChecker.message(message, musicPermissions);
      if (returnData.result !== "PermissionPass") return respondError(returnData);
    } else if (command.name.join("-") !== "help") {
      const returnData = await permissionChecker.message(message, allCommandPermissions);
      if (returnData.result !== "PermissionPass") return respondError(returnData);
    } else if (command.permissions.length !== 0) {
      const returnData = await permissionChecker.message(message, command.permissions);
      if (returnData.result !== "PermissionPass") return respondError(returnData);
    }
    //////////////////////////////// Permission check end ////////////////////////////////

    //////////////////////////////// Check avalibility start ////////////////////////////////
    if (command.lavalink && client.lavalinkUsing.length == 0) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(`${client.i18n.get(language, "interaction", "no_node")}`)
            .setColor(client.color_main),
        ],
      });
    }

    if (command.playerCheck) {
      const player = client.mewslink.players.get(message.guild!.id);
      const twentyFourBuilder = new AutoReconnectBuilderService(client);
      const is247 = await twentyFourBuilder.get(message.guild!.id);
      if (
        !player ||
        (is247 && is247.twentyfourseven && player.queue.length == 0 && !player.queue.current)
      )
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(`${client.i18n.get(language, "interaction", "no_player")}`)
              .setColor(client.color_main),
          ],
        });
    }

    if (command.sameVoiceCheck) {
      const { channel } = message.member!.voice;
      if (!channel || message.member!.voice.channel !== message.guild!.members.me!.voice.channel)
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(`${client.i18n.get(language, "interaction", "no_same_voice")}`)
              .setColor(client.color_main),
          ],
        });
    }

    if (
      command.accessableby.includes(Accessableby.Manager) &&
      !message.member!.permissions.has(PermissionFlagsBits.ManageGuild)
    )
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(language, "interaction", "no_manage_guild_perms", { perm: "ManageGuild" })}`
            )
            .setColor(client.color_main),
        ],
      });
    //////////////////////////////// Check avalibility end ////////////////////////////////

    //////////////////////////////// DJ ROLE CHECK START ////////////////////////////////
    if (command.djRole) {
      const djData = await client.db.DjRole.get(message.guild.id);
      const isOwner = message.author.id === String(client.owner);
      const isAdmin = client.config.bot.ADMIN.map(String).includes(message.author.id);
      const isNotManager = !message.member!.permissions.has(PermissionFlagsBits.ManageGuild);

      if (djData && djData.enable === true) {
        const member = message.member as GuildMember;
        const hasDjRole = djData.roleid ? member.roles.cache.has(djData.roleid) : false;

        if (!hasDjRole && isNotManager && !isOwner && !isAdmin) {
          return message.reply({
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

    const User = await client.db.premium.get(message.author.id);
    const Guild = await client.db.preGuild.get(String(message.guild?.id));
    const isPremiumUser = User && User.isPremium;
    const isPremiumGuild = Guild && Guild.isPremium;
    const isOwner = message.author.id === String(client.owner);
    const isAdmin = client.config.bot.ADMIN.map(String).includes(message.author.id);

    const userPerm = {
      owner: isOwner,
      admin: isOwner || isAdmin,
      Premium: isOwner || isAdmin || isPremiumUser || isPremiumGuild,
    };

    const BlacklistUser = await client.db.BlacklistUser.get(message.author.id);
    if (BlacklistUser) {
      return message.reply({
        embeds: [
          new EmbedBuilder().setColor(client.color_main).setDescription(
            `${client.i18n.get(language, "interaction", "blacklist_user", {
              user: message.author.displayName,
              serversupport: client.config.bot.SERVER_SUPPORT_URL,
            })}`
          ),
        ],
      });
    }

    const BlacklistGuild = await client.db.BlacklistGuild.get(message.guild!.id);
    if (!isOwner && !isAdmin && BlacklistGuild) {
      return message.reply({
        embeds: [
          new EmbedBuilder().setColor(client.color_main).setDescription(
            `${client.i18n.get(language, "interaction", "blacklist_guild", {
              user: message.author.displayName,
              guild: message.guild!.name,
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
          return message.reply({
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

    if (command.accessableby.includes(Accessableby.Owner) && !userPerm.owner)
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(`${client.i18n.get(language, "interaction", "owner_only")}`)
            .setColor(client.color_main),
        ],
      });

    if (command.accessableby.includes(Accessableby.Admin) && !userPerm.admin)
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(language, "interaction", "no_admin_perms", { perm: "admin" })}`
            )
            .setColor(client.color_main),
        ],
      });

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
                  user: message.author.displayName,
                  serversupport: client.config.bot.SERVER_SUPPORT_URL,
                  premium: client.config.bot.PREMIUM_URL,
                })
              )
            )
            .setButtonAccessory(premiumButton)
        );
      return message.reply({
        components: [noPremiumEmbed],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    if (client.topgg) {
      if (command.accessableby.includes(Accessableby.Voter)) {
        if (!userPerm.Premium) {
          const voteChecker = await client.topgg.checkVote(message.author.id);
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
            const sentMessage = await message.reply({ content: " ", embeds: [embed] });
            setTimeout(async () => {
              try {
                await sentMessage.delete();
              } catch (error) {
                client.logger.error("TopggService", `Top gg service error`);
              }
            }, client.config.features.DELETE_MSG_TIMEOUT);
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
                        user: message.author.displayName,
                        serversupport: client.config.bot.SERVER_SUPPORT_URL,
                        premium: client.config.bot.PREMIUM_URL,
                      })
                    )
                  )
                  .setButtonAccessory(voteButton)
              );

            return message.reply({
              components: [TopggUnvotedEmbed],
              flags: MessageFlags.IsComponentsV2,
            });
          }
        }
      }
    }
    //////////////////////////////// Check accessibility end ////////////////////////////////

    try {
      const handler = new CommandHandler({
        message: message,
        language: language,
        client: client,
        args: args,
        prefix: PREFIX || client.prefix || "me",
      });

      if (message.attachments.size !== 0) handler.addAttachment(message.attachments);

      client.logger.info(
        "Prefix Commands",
        `${chalk.hex("#00FFC3")(command.name.join("-"))} used by ${chalk.hex("#00FFC3")(
          message.author.displayName
        )} (${chalk.hex("#00FFC3")(message.author.id)}) from ${chalk.hex("#00FFC3")(message.guild?.name)} (${chalk.hex(
          "#00FFC3"
        )(message.guild?.id)})`
      );

      ////////// CommandUserUsage //////////
      let commandUsage = await client.db.CommandUserUsage.get(`${message.author.id}`);
      if (!commandUsage) {
        commandUsage = await client.db.CommandUserUsage.set(`${message.author.id}`, {
          userid: message.author.id,
          username: message.author.username,
          total: 1,
        });
      } else {
        commandUsage.total += 1;
        await client.db.CommandUserUsage.set(`${message.author.id}`, commandUsage);
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
      message.reply({
        content: `${client.i18n.get(language, "interaction", "unexpected_error")}\n ${error}`,
      });
    }
  }
}
