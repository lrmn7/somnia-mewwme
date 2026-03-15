import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["privacy", "policy"];
  public description = "Shows the privacy policy of the Bot";
  public category = "Info";
  public accessableby = data.COMMANDS_ACCESS.INFO.PrivacyPolicy;
  public usage = "";
  public aliases = ["pp", "priv", "privacy", "privacypolicy"];
  public lavalink = false;
  public options = [];
  public playerCheck = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.SilentDeferReply();

    const privacyembed = new EmbedBuilder()
      .setAuthor({
        name: `${client.user!.username} Privacy Policy!`,
        iconURL: client.user!.displayAvatarURL(),
        url: `https://discord.com/oauth2/authorize?client_id=${client.user!.id}&permissions=8&scope=bot`,
      })
      .setTitle(
        `${client.i18n.get(handler.language, "tos.and.privacy", "privacy_title", {
          bot: client.user!.username,
        })}`
      )
      .setDescription(
        `${client.i18n.get(handler.language, "tos.and.privacy", "privacy_desc", {
          bot: client.user!.username,
          serversupport: client.config.bot.SERVER_SUPPORT_URL,
        })}`
      )
      .setColor(client.color_second);

    const privacybutton = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel(client.i18n.get(handler.language, "tos.and.privacy", "privacy_label"))
        .setStyle(ButtonStyle.Link)
        .setURL(client.config.bot.PRIVACY_URL || "https://meww.me/privacy")
    );

    await handler.editReply({
      embeds: [privacyembed],
      components: [privacybutton],
    });
  }
}
