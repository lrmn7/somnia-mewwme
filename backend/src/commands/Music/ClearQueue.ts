import { Manager } from "../../manager.js";
import { EmbedBuilder } from "discord.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { MewslinkPlayer } from "../../mewslink/main.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["clearqueue"];
  public description = "Clear song in queue";
  public category = "Music";
  public accessableby = data.COMMANDS_ACCESS.MUSIC.ClearQueue;
  public usage = "";
  public aliases = ["clear", "cq"];
  public lavalink = true;
  public options = [];
  public playerCheck = true;
  public usingInteraction = true;
  public sameVoiceCheck = true;
  public permissions = [];
  public djRole = true;

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.deferReply();

    const player = client.mewslink.players.get(handler.guild!.id) as MewslinkPlayer;
    const currentTrack = player.queue.current;

    if (!currentTrack) {
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "no_songs_playing", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });
    }
    player.queue.clear();

    const cleared = new EmbedBuilder()
      .setDescription(
        `${client.i18n.get(handler.language, "commands.music", "clearqueue_msg", {
          user: handler.user!.displayName || handler.user!.tag,
          botname: client.user!.username || client.user!.displayName,
        })}`
      )
      .setColor(client.color_main);
    await handler.editReply({ content: " ", embeds: [cleared] });

    client.wsl.get(handler.guild!.id)?.send({
      op: "playerClearQueue",
      guild: handler.guild!.id,
    });
  }
}
