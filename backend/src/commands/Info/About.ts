import { Manager } from "../../manager.js";
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { stripIndents } from "common-tags";
import { Command, Accessableby } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["about"];
  public description = "Shows the bot information";
  public category = "Info";
  public accessableby = data.COMMANDS_ACCESS.INFO.About;
  public usage = "";
  public aliases = [];
  public lavalink = false;
  public options = [];
  public playerCheck = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.SilentDeferReply();

    const AboutEmbed = new EmbedBuilder()
      .setAuthor({
        name: `${handler.guild!.members.me!.displayName} Aboutme!`,
        url: `https://discord.com/oauth2/authorize?client_id=${client.user!.id}&permissions=8&scope=bot`,
        iconURL: client.user!.displayAvatarURL() as string,
      })
      .setColor(client.color_main)
      .setDescription(
        stripIndents`
      ${client.i18n.get(handler.language, "commands.info", "about_desc1", {
        bot: `<@${client.user!.id}>`,
      })}
      ${client.i18n.get(handler.language, "commands.info", "about_desc2", {
        prefix: client.prefix,
        website: client.config.bot.COMMANDS_URL,
      })}
      ${client.i18n.get(handler.language, "commands.info", "about_desc3", {
        prefix: client.prefix,
        serversupport: client.config.bot.SERVER_SUPPORT_URL,
        website: client.config.bot.COMMANDS_URL,
        bot: client.user!.username,
      })}`
      )
      .setImage(client.config.bot.IMAGES_URL_ABOUT);
    if (client.config.bot.TEAM_NAME) {
      AboutEmbed.addFields({
        name: "Meet The Team",
        value: `**[${client.config.bot.TEAM_NAME}](${client.config.bot.WEBSITE_URL})**`,
        inline: true,
      });
    }

    AboutEmbed.addFields({
      name: "Type",
      value: "**Music bot**",
      inline: true,
    });

    if (client.config.bot.PREMIUM_URL) {
      AboutEmbed.addFields({
        name: "Support Me",
        value: `**[Get Premium](${client.config.bot.PREMIUM_URL})**`,
        inline: true,
      });
    }

    const AboutButton = new ActionRowBuilder<ButtonBuilder>();
    AboutButton.addComponents(
      new ButtonBuilder()
        .setLabel("Invite Me")
        .setStyle(ButtonStyle.Link)
        .setURL(
          `https://discord.com/oauth2/authorize?client_id=${client.user!.id}&permissions=8&scope=bot`
        )
    );

    AboutButton.addComponents(
      new ButtonBuilder()
        .setLabel("Server Support")
        .setStyle(ButtonStyle.Link)
        .setURL(client.config.bot.SERVER_SUPPORT_URL)
    );
    AboutButton.addComponents(
      new ButtonBuilder()
        .setLabel("Vote")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://top.gg/bot/${client.user?.id}/vote`)
    );

    await handler.editReply({
      embeds: [AboutEmbed],
      components: [AboutButton],
    });
  }
}
