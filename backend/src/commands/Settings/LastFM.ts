import {
  EmbedBuilder,
  ApplicationCommandOptionType,
  CommandInteractionOptionResolver,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags,
} from "discord.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["lastfm"];
  public description = "Manage your Last.fm account for Scrobbled";
  public category = "Settings";
  public accessableby = data.COMMANDS_ACCESS.SETTINGS.LastFm;
  public usage = "<login|logout>";
  public aliases = [];
  public lavalink = false;
  public playerCheck = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;
  public options = [
    {
      name: "type",
      description: "Choose Login or Logout",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        {
          name: "Login",
          value: "login",
        },
        {
          name: "Logout",
          value: "logout",
        },
      ],
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    if (!handler.interaction) return;
    await handler.deferReply();

    if (!client.config.features.WebServer.LAST_FM_SCROBBLED.Enable) {
      const embed = new EmbedBuilder()
        .setTitle(
          `${client.i18n.get(handler.language, "commands.settings", "lastfm_feature_disabled_title")}`
        )
        .setDescription(
          `${client.i18n.get(handler.language, "commands.settings", "lastfm_feature_disabled_desc")}`
        )
        .setColor(client.color_main);

      await handler.interaction?.reply({
        flags: MessageFlags.Ephemeral,
        embeds: [embed],
      });
      return;
    }

    const user = handler.user;
    const type = (await // @ts-ignore
    (handler.interaction?.options as CommandInteractionOptionResolver).getString("type")) as
      | "login"
      | "logout";

    if (type === "login") {
      const authUrl = `https://www.last.fm/api/auth?api_key=${client.config.features.WebServer.LAST_FM_SCROBBLED.ApiKey}&cb=${encodeURIComponent(`${client.config.features.WebServer.LAST_FM_SCROBBLED.Callback}?user=${user.id}`)}`;

      const LastFMButton = new ActionRowBuilder<ButtonBuilder>();
      LastFMButton.addComponents(
        new ButtonBuilder().setLabel("Login").setStyle(ButtonStyle.Link).setURL(authUrl)
      );

      const embed = new EmbedBuilder()
        .setDescription(
          `${client.i18n.get(handler.language, "commands.settings", "lastfm_login_desc", {
            url: authUrl,
            user: String(handler.user?.displayName || handler.user?.tag),
            botname: client.user!.username || client.user!.displayName,
          })}`
        )
        .setFooter({
          text: `${client.i18n.get(handler.language, "commands.settings", "lastfm_login_footer", {
            expired:
              String(client.config.features.WebServer.LAST_FM_SCROBBLED.ExpiredLink / 1000) +
              " seconds",
          })}`,
        })
        .setColor(client.color_main);

      const msg = await handler.editReply({
        embeds: [embed],
        components: [LastFMButton],
      });
      setTimeout(async () => {
        LastFMButton.components[0].setDisabled(true);
        if (msg) {
          await msg.edit({
            components: [LastFMButton],
          });
        }
      }, client.config.features.WebServer.LAST_FM_SCROBBLED.ExpiredLink);
      await client.db.LastFm.set(user!.id, { userId: user!.id });
    } else if (type === "logout") {
      const lastFmData = await client.db.LastFm.get(user.id);

      if (!lastFmData || !lastFmData.sessionKey) {
        return handler.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.i18n.get(handler.language, "commands.settings", "lastfm_not_login_desc", {
                  name: this.name[0],
                  user: String(handler.user?.displayName || handler.user?.tag),
                  botname: client.user!.username || client.user!.displayName,
                })}`
              )
              .setColor(client.color_main),
          ],
        });
      }
      await client.db.LastFm.delete(user.id);

      const embed = new EmbedBuilder()
        .setTitle(
          `${client.i18n.get(handler.language, "commands.settings", "lastfm_logout_title")}`
        )
        .setDescription(
          `${client.i18n.get(handler.language, "commands.settings", "lastfm_logout_desc", {
            user: String(handler.user?.displayName || handler.user?.tag),
            botname: client.user!.username || client.user!.displayName,
          })}`
        )
        .setColor(client.color_main);

      await handler.editReply({ embeds: [embed] });
    }
  }
}
