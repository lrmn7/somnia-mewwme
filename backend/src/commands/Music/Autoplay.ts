import { EmbedBuilder } from "discord.js";
import { Manager } from "../../manager.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { MewslinkPlayer } from "../../mewslink/main.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
import { emitPlayerState } from "../../utilities/EmitPlayerState.js";
const data: Config = new ConfigDataService().data;

// Main code
export default class implements Command {
  public name = ["autoplay"];
  public description = "Autoplay music (Random play songs)";
  public category = "Music";
  public accessableby = data.COMMANDS_ACCESS.MUSIC.Autoplay;
  public usage = "";
  public aliases = [];
  public lavalink = true;
  public options = [];
  public playerCheck = true;
  public usingInteraction = true;
  public sameVoiceCheck = true;
  public permissions = [];
  public djRole = true;

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.deferReply();

    if (!client.config.features.AUTOPLAY_SUPPORT) {
      const AutoplayDisabledEmbed = new EmbedBuilder()
        .setDescription(
          `${client.i18n.get(handler.language, "commands.music", "autoplay_disabled", {
            user: String(handler.user?.displayName || handler.user?.tag),
            botname: client.user!.username || client.user!.displayName,
            serversupport: client.config.bot.SERVER_SUPPORT_URL,
          })}`
        )
        .setColor(client.color_main);

      return handler.editReply({ content: " ", embeds: [AutoplayDisabledEmbed] });
    }

    const player = client.mewslink.players.get(handler.guild!.id) as MewslinkPlayer;

    if (player.data.get("autoplay") === true) {
      player.data.set("autoplay", false);
      player.data.set("identifier", null);
      player.data.set("requester", null);

      const off = new EmbedBuilder()
        .setDescription(
          `${client.i18n.get(handler.language, "commands.music", "autoplay_off", {
            mode: handler.modeLang.disable,
            user: String(handler.user?.displayName || handler.user?.tag),
            botname: client.user!.username || client.user!.displayName,
          })}`
        )
        .setColor(client.color_main);

      await handler.editReply({ content: " ", embeds: [off] });
      emitPlayerState(client, player);
    } else {
      if (!player!.queue.current) {
        return handler.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.i18n.get(
                  handler.language,
                  "commands.music",
                  "autoplay_no_songs_playing",
                  {
                    user: String(handler.user?.displayName || handler.user?.tag),
                    botname: client.user!.username || client.user!.displayName,
                  }
                )}`
              )
              .setColor(client.color_main),
          ],
        });
      }

      const identifier = player.queue.current!.identifier;

      player.data.set("autoplay", true);
      player.data.set("identifier", identifier);
      player.data.set("requester", handler.user);
      player.data.set("source", player.queue.current?.source);
      player.data.set("author", player.queue.current?.author);
      player.data.set("title", player.queue.current?.title);

      const on = new EmbedBuilder()
        .setDescription(
          `${client.i18n.get(handler.language, "commands.music", "autoplay_on", {
            mode: handler.modeLang.enable,
            user: String(handler.user?.displayName || handler.user?.tag),
            botname: client.user!.username || client.user!.displayName,
          })}`
        )
        .setColor(client.color_main);

      await handler.editReply({ content: " ", embeds: [on] });
      emitPlayerState(client, player);
    }
  }
}
