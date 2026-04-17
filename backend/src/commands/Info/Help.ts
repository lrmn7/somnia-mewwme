import {
  EmbedBuilder,
  ApplicationCommandOptionType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { stripIndents } from "common-tags";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["help"];
  public description = "Displays all commands that the bot has.";
  public category = "Info";
  public accessableby = data.COMMANDS_ACCESS.INFO.Help;
  public usage = "<commamnd_name>";
  public aliases = ["h"];
  public lavalink = false;
  public usingInteraction = true;
  public playerCheck = false;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;
  public options = [
    {
      name: "command",
      description: "The command name",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.SilentDeferReply();

    if (handler.args[0]) {
      const embed = new EmbedBuilder()
        .setThumbnail(client.user!.displayAvatarURL({ size: 2048 }))
        .setColor(client.color_main);

      let command = client.commands.get(
        client.aliases.get(handler.args[0].toLowerCase()) || handler.args[0].toLowerCase()
      );
      if (!command)
        return handler.editReply({
          embeds: [
            embed
              .setTitle(`${client.i18n.get(handler.language, "commands.info", "finder_invalid")}`)
              .setDescription(
                `${client.i18n.get(handler.language, "commands.info", "finder_example", {
                  command: `${handler.prefix}${this.name[0]}`,
                })}`
              ),
          ],
        });

      const eString = this.transalatedFinder(client, handler);

      embed.setDescription(stripIndents`
        ${eString.name} \`${command.name.join("-")}\`
        ${eString.des} \`${command.description || eString.desNone}\`
        ${eString.usage} ${
          command.usage
            ? `\`${handler.prefix}${
                handler.interaction ? command.name.join(" ") : command.name.join("-")
              } ${command.usage}\``
            : `\`${eString.usageNone}\``
        }
        ${eString.access} \`${command.accessableby}\`
        ${eString.aliases} \`${
          command.aliases && command.aliases.length !== 0
            ? command.aliases.join(", ") + eString.aliasesPrefix
            : eString.aliasesNone
        }\`
        ${eString.slash} \`${
          command.usingInteraction ? eString.slashEnable : eString.slashDisable
        }\`
        `);

      return handler.editReply({ embeds: [embed] });
    }

    const EmbedHome = new EmbedBuilder()
      .setAuthor({
        name: `${client.user!.username} Help Menu ♪`,
        iconURL: client.user!.displayAvatarURL(),
        url: `https://discord.com/oauth2/authorize?client_id=${client.user!.id}&permissions=8&scope=bot`,
      })
      .setTitle(`${client.i18n.get(handler.language, "commands.info", "homepage_title")}`)
      .setImage(client.config.bot.IMAGES_URL_HELPMENU)
      .setColor(client.color_main)
      .setDescription(
        `${client.i18n.get(handler.language, "commands.info", "homepage_desc", {
          premium: client.config.bot.PREMIUM_URL,
          bot: client.user!.username,
        })}`
      );

    const ButtonHome = new ActionRowBuilder<ButtonBuilder>();
    if (client.config.bot.WEBSITE_URL && client.config.MENU_HELP_EMOJI.E_WEBSITE) {
      ButtonHome.addComponents(
        new ButtonBuilder()
          .setLabel("Website")
          .setEmoji(client.config.MENU_HELP_EMOJI.E_WEBSITE)
          .setStyle(ButtonStyle.Link)
          .setURL(client.config.bot.WEBSITE_URL)
      );
    }
    if (client.config.bot.SERVER_SUPPORT_URL && client.config.MENU_HELP_EMOJI.E_SUPPORT) {
      ButtonHome.addComponents(
        new ButtonBuilder()
          .setLabel("Support")
          .setEmoji(client.config.MENU_HELP_EMOJI.E_SUPPORT)
          .setStyle(ButtonStyle.Link)
          .setURL(client.config.bot.SERVER_SUPPORT_URL)
      );
    }
    if (client.config.bot.PREMIUM_URL && client.config.MENU_HELP_EMOJI.E_PREMIUM) {
      ButtonHome.addComponents(
        new ButtonBuilder()
          .setLabel("Get Premium")
          .setEmoji(client.config.MENU_HELP_EMOJI.E_PREMIUM)
          .setStyle(ButtonStyle.Link)
          .setURL(client.config.bot.PREMIUM_URL)
      );
    }

    const selectmenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents([
      new StringSelectMenuBuilder()
        .setCustomId("help-category")
        .setPlaceholder(`${client.i18n.get(handler.language, "commands.info", "select_menu")}`)
        .setMaxValues(1)
        .setMinValues(1)
        .setOptions([
          new StringSelectMenuOptionBuilder()
            .setLabel("Home")
            .setValue("Home")
            .setEmoji(client.config.MENU_HELP_EMOJI.E_HOME || "❓"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Music")
            .setValue("Music")
            .setEmoji(client.config.MENU_HELP_EMOJI.E_MUSIC || "❓"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Filter")
            .setValue("Filter")
            .setEmoji(client.config.MENU_HELP_EMOJI.E_FILTER || "❓"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Playlist")
            .setValue("Playlist")
            .setEmoji(client.config.MENU_HELP_EMOJI.E_PLAYLIST || "❓"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Games")
            .setValue("Games")
            .setEmoji(client.config.MENU_HELP_EMOJI.E_GAMES || "❓"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Settings")
            .setValue("Settings")
            .setEmoji(client.config.MENU_HELP_EMOJI.E_SETTING || "❓"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Info")
            .setValue("Info")
            .setEmoji(client.config.MENU_HELP_EMOJI.E_INFO || "❓"),
          new StringSelectMenuOptionBuilder()
            .setLabel("All Commands")
            .setValue("All")
            .setEmoji(client.config.MENU_HELP_EMOJI.E_ALLCMD || "❓"),
        ]),
    ]);
    await handler
      .editReply({
        embeds: [EmbedHome],
        components: [selectmenu, ...(ButtonHome.components.length ? [ButtonHome] : [])],
      })
      .then(async (msg) => {
        if (msg) {
          let collector = await msg.createMessageComponentCollector({
            filter: async (i) => {
              return (
                (i.isStringSelectMenu() &&
                  i.user &&
                  i.message.author.id == client.user!.id &&
                  (i.user.id == handler.interaction?.user.id ||
                    (handler.message && i.user.id == handler.message.author.id))) ||
                false
              );
            },
            time: 60000,
          });

          collector.on("collect", async (m) => {
            if (m.isStringSelectMenu()) {
              if (m.customId === "help-category") {
                await m.deferUpdate();
                let [directory] = m.values;

                if (directory === "All") {
                  const categoriesAndCommands = client.commands.reduce(
                    (accumulator, command) => {
                      if (!accumulator[command.category]) {
                        accumulator[command.category] = [];
                      }
                      accumulator[command.category].push(`\`${command.name}\``);
                      return accumulator;
                    },
                    {} as { [key: string]: string[] }
                  );

                  const EmbedAllCommands = new EmbedBuilder()
                    .setAuthor({
                      name: `${client.user!.username} Help Menu ♪`,
                      iconURL: client.user!.displayAvatarURL(),
                      url: `https://discord.com/oauth2/authorize?client_id=${client.user!.id}&permissions=8&scope=bot`,
                    })
                    .setTitle(
                      `${client.i18n.get(handler.language, "commands.info", "homepage_title")}`
                    )
                    .setImage(client.config.bot.IMAGES_URL_COMMAND)
                    .setDescription(`Bot prefix is: \`${client.prefix} or /\``)
                    .setColor(client.color_main);

                  for (const [category, commands] of Object.entries(categoriesAndCommands)) {
                    const commandList = commands
                      .map((c) => `\`${c.split(",").join("-")}\``)
                      .join(", ");
                    EmbedAllCommands.addFields({
                      name: `${client.config.MENU_HELP_EMOJI.E_ALLCATEGORIES} ${category.toUpperCase()}`,
                      value: commandList,
                      inline: false,
                    });
                  }

                  msg.edit({ embeds: [EmbedAllCommands] });
                } else if (directory === "Home") {
                  msg.edit({
                    embeds: [EmbedHome],
                    components: [selectmenu, ...(ButtonHome.components.length ? [ButtonHome] : [])],
                  });
                } else {
                  const filteredCommands = client.commands.filter((c) => c.category === directory);
                  const EmbedSingleCommands = new EmbedBuilder()
                    .setAuthor({
                      name: `${client.user!.username} Help Menu ♪`,
                      iconURL: client.user!.displayAvatarURL(),
                      url: `https://discord.com/oauth2/authorize?client_id=${client.user!.id}&permissions=8&scope=bot`,
                    })
                    // .setThumbnail(client.user!.displayAvatarURL({ size: 2048 }))
                    .setImage(client.config.bot.IMAGES_URL_COMMAND)
                    .setTitle(
                      `${client.config.MENU_HELP_EMOJI.E_ALLCATEGORIES} ${directory.toUpperCase()} Commands`
                    )
                    .setColor(client.color_main);

                  if (filteredCommands.size > 0) {
                    const commandList = filteredCommands
                      .map(
                        (c) =>
                          `**[${c.name.join("-")}](${client.config.bot.COMMANDS_URL})** : **${c.description}**`
                      )
                      .join("\n");
                    EmbedSingleCommands.setDescription(`${commandList}`);
                  } else {
                    EmbedSingleCommands.setDescription(
                      `${client.config.MENU_HELP_EMOJI.E_ALLCATEGORIES}  ${directory.toUpperCase()} [0]\nNo commands found.`
                    );
                  }
                  msg.edit({ embeds: [EmbedSingleCommands] });
                }
              }
            }
          });

          collector.on("end", async (collected, reason) => {
            if (reason === "time") {
              const timedMessage = `${client.i18n.get(
                handler.language,
                "commands.info",
                "help_timeout",
                {
                  prefix: client.prefix,
                }
              )}`;
              selectmenu.components[0].setDisabled(true);
              collector.removeAllListeners();

              handler.editReply({
                content: timedMessage,
                embeds: [EmbedHome],
                components: [selectmenu, ...(ButtonHome.components.length ? [ButtonHome] : [])],
              });
            }
          });
        }
      });
  }

  private transalatedFinder(client: Manager, handler: CommandHandler) {
    return {
      name: `${client.i18n.get(handler.language, "commands.info", "finder_name")}`,
      des: `${client.i18n.get(handler.language, "commands.info", "finder_des")}`,
      usage: `${client.i18n.get(handler.language, "commands.info", "finder_usage")}`,
      access: `${client.i18n.get(handler.language, "commands.info", "finder_access")}`,
      aliases: `${client.i18n.get(handler.language, "commands.info", "finder_aliases")}`,
      slash: `${client.i18n.get(handler.language, "commands.info", "finder_slash")}`,
      desNone: `${client.i18n.get(handler.language, "commands.info", "finder_des_no")}`,
      usageNone: `${client.i18n.get(handler.language, "commands.info", "finder_usage_no")}`,
      aliasesPrefix: `${client.i18n.get(
        handler.language,
        "commands.info",
        "finder_aliases_prefix"
      )}`,
      aliasesNone: `${client.i18n.get(handler.language, "commands.info", "finder_aliases_no")}`,
      slashEnable: `${client.i18n.get(handler.language, "commands.info", "finder_slash_enable")}`,
      slashDisable: `${client.i18n.get(handler.language, "commands.info", "finder_slash_disable")}`,
    };
  }
}
