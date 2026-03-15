import { Manager } from "../../manager.js";
import { EmbedBuilder, Message } from "discord.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { MewslinkPlayer, MewslinkTrack } from "../../mewslink/main.js";
import { FormatDuration } from "../../utilities/FormatDuration.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
import { truncateString } from "mstg-kit";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["replay"];
  public description = "Replay the current song";
  public category = "Music";
  public accessableby = data.COMMANDS_ACCESS.MUSIC.Replay;
  public usage = "";
  public aliases = [];
  public lavalink = true;
  public playerCheck = true;
  public usingInteraction = true;
  public sameVoiceCheck = true;
  public permissions = [];
  public djRole = true;
  public options = [];

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

    if (!currentTrack.isSeekable) {
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "replay_not_seekable", {
                title: this.getTitle(client, currentTrack),
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });
    }

    await player.seek(0);

    const embed = new EmbedBuilder()
      .setDescription(
        `${client.i18n.get(handler.language, "commands.music", "replay_msg", {
          user: handler.user!.displayName || handler.user!.tag,
          title: this.getTitle(client, currentTrack),
          botname: client.user!.username || client.user!.displayName,
        })}`
      )
      .setColor(client.color_main);

    await handler.editReply({ content: " ", embeds: [embed] });
  }

  getTitle(client: Manager, tracks: MewslinkTrack): string {
    const title = truncateString(tracks.title, 25);
    const author = truncateString(tracks.author, 15);
    const supportUrl = client.config.bot.SERVER_SUPPORT_URL;

    if (new FormatDuration().parse(tracks.duration) === "Live Stream") {
      return `${author}`;
    }

    if (client.config.features.HIDE_LINK) {
      return `\`${title}\` by \`${author}\``;
    } else if (client.config.features.REPLACE_LINK) {
      return `[\`${title}\`](${supportUrl}) by \`${author}\``;
    } else {
      return `[\`${title}\`](${tracks.uri || supportUrl}) by \`${author}\``;
    }
  }
}
