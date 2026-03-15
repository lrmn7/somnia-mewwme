import { EmbedBuilder, User } from "discord.js";
import { Manager } from "../../manager.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { FormatDuration } from "../../utilities/FormatDuration.js";
import { PageQueue } from "../../structures/PageQueue.js";
import { MewslinkPlayer, MewslinkTrack } from "../../mewslink/main.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
import { emitPlayerState } from "../../utilities/EmitPlayerState.js";
import { truncateString } from "mstg-kit";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["shuffle"];
  public description = "Shuffle song in queue";
  public category = "Music";
  public accessableby = data.COMMANDS_ACCESS.MUSIC.Shuffle;
  public usage = "";
  public aliases = [];
  public lavalink = true;
  public playerCheck = true;
  public usingInteraction = true;
  public sameVoiceCheck = true;
  public permissions = [];
  public djRole = false;
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

    const newQueue = await player.queue.shuffle();

    const song = newQueue.current;

    const qduration = `${new FormatDuration().parse(song!.duration + player.queue.duration)}`;
    const thumbnail =
      song!.artworkUrl ?? `https://img.youtube.com/vi/${song!.identifier}/hqdefault.jpg`;

    let pagesNum = Math.ceil(newQueue.length / 10);
    if (pagesNum === 0) pagesNum = 1;

    const songStrings = [];
    for (let i = 0; i < newQueue.length; i++) {
      const song = newQueue[i];
      songStrings.push(
        `**${i + 1}.** ${this.getTitle(client, song)} \`[${new FormatDuration().parse(song.duration)}]\`
                    `
      );
    }

    const pages = [];
    for (let i = 0; i < pagesNum; i++) {
      const str = songStrings.slice(i * 10, i * 10 + 10).join("");

      const embed = new EmbedBuilder()
        .setThumbnail(thumbnail)
        .setColor(client.color_main)
        .setDescription(
          `${client.i18n.get(handler.language, "commands.music", "queue_description", {
            title: this.getTitle(client, song!),
            request: String(song!.requester),
            user: handler.user!.displayName || handler.user!.tag,
            duration: new FormatDuration().parse(song!.duration),
            rest: str == "" ? "  Not Available" : "\n" + str,
            botname: client.user!.username || client.user!.displayName,
          })}`
        )
        .setFooter({
          text: `${client.i18n.get(handler.language, "commands.music", "queue_footer", {
            page: String(i + 1),
            pages: String(pagesNum),
            queue_lang: String(newQueue.length),
            duration: qduration,
          })}`,
        });

      pages.push(embed);
    }

    // Sync the updated queue order to any open dashboard sessions.
    // emitPlayerState sends a full playerState snapshot (current + full queue),
    // which the frontend handles via its existing PLAYER_STATE_UPDATE reducer.
    // Previously the command sent a custom `playerQueueShuffle` op that the
    // frontend never listened for — so dashboard queue panels were never updated.
    emitPlayerState(client, player);

    if (pages.length == pagesNum && newQueue.length > 10) {
      if (handler.message) {
        await new PageQueue(client, pages, 60000, newQueue.length, handler.language).prefixPage(
          handler.message,
          qduration
        );
      } else if (handler.interaction) {
        await new PageQueue(client, pages, 60000, newQueue.length, handler.language).slashPage(
          handler.interaction,
          qduration
        );
      } else return;
    } else return handler.editReply({ embeds: [pages[0]] });
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
