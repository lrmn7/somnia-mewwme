import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["terms", "of", "services"];
  public description = "Shows the terms of services of the Bot";
  public category = "Info";
  public accessableby = data.COMMANDS_ACCESS.INFO.TermsOfServices;
  public usage = "";
  public aliases = ["terms", "tos", "termsofservices"];
  public lavalink = false;
  public options = [];
  public playerCheck = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.SilentDeferReply();

    const termsembed = new EmbedBuilder()
      .setAuthor({
        name: `${client.user!.username} Terms Of Services!`,
        iconURL: client.user!.displayAvatarURL(),
        url: `https://discord.com/oauth2/authorize?client_id=${client.user!.id}&permissions=8&scope=bot`,
      })
      .setTitle(
        `${client.i18n.get(handler.language, "tos.and.privacy", "termsofservice_title", {
          bot: client.user!.username,
        })}`
      )
      .setDescription(
        `${client.i18n.get(handler.language, "tos.and.privacy", "termsofservice_desc", {
          bot: client.user!.username,
          serversupport: client.config.bot.SERVER_SUPPORT_URL,
        })}`
      )
      .setColor(client.color_second);

    const termsbutton = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel(client.i18n.get(handler.language, "tos.and.privacy", "tos_label"))
        .setStyle(ButtonStyle.Link)
        .setURL(client.config.bot.TERMS_URL || "https://meww.me/termsofservice")
    );

    await handler.editReply({
      embeds: [termsembed],
      components: [termsbutton],
    });
  }
}
