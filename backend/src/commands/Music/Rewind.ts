import { EmbedBuilder } from "discord.js";
import { FormatDuration } from "../../utilities/FormatDuration.js";
import { Manager } from "../../manager.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { MewslinkPlayer, MewslinkTrack } from "../../mewslink/main.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
import { truncateString } from "mstg-kit";
const data: Config = new ConfigDataService().data;
const rewindNum = 10;

export default class implements Command {
  public name = ["rewind"];
  public description = "Rewind timestamp in the song! (10s)";
  public category = "Music";
  public accessableby = data.COMMANDS_ACCESS.MUSIC.Rewind;
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

    const song_position = player.position;
    const CurrentDuration = new FormatDuration().parse(song_position - rewindNum * 1000);

    if (song_position - rewindNum * 1000 > 0) {
      await player.send({
        guildId: handler.guild!.id,
        playerOptions: {
          position: song_position - rewindNum * 1000,
        },
      });

      const rewind2 = new EmbedBuilder()
        .setDescription(
          `${client.i18n.get(handler.language, "commands.music", "rewind_msg", {
            duration: CurrentDuration,
            user: handler.user!.displayName || handler.user!.tag,
            title: this.getTitle(client, currentTrack),
            botname: client.user!.username || client.user!.displayName,
          })}`
        )
        .setColor(client.color_main);

      handler.editReply({ content: " ", embeds: [rewind2] });
    } else {
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "rewind_beyond", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });
    }
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
