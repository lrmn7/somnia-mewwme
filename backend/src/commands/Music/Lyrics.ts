import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { Manager } from "../../manager.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
import { normalizeTrackMetadata, buildLyricsQueries } from "../../utilities/NormalizeTrackMetadata.js";
const data: Config = new ConfigDataService().data;

type LrclibRecord = {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
};

export default class implements Command {
  public name = ["lyrics"];
  public description = "Display lyrics of the song";
  public category = "Music";
  public accessableby = data.COMMANDS_ACCESS.MUSIC.Lyrics;
  public usage = "";
  public aliases = ["ly"];
  public lavalink = true;
  public playerCheck = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;
  public options = [
    {
      name: "search",
      description: "The song name",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.deferReply();

    const manualQuery = handler.args.join(" ");
    let queries: { track_name: string; artist_name: string }[] = [];
    let displayTitle = manualQuery;

    if (manualQuery) {
      queries = [{ track_name: manualQuery, artist_name: "" }];
    } else {
      const player = client.mewslink.players.get(String(handler.guild?.id));
      if (player && player.queue.current) {
        const track = player.queue.current;
        const normalized = normalizeTrackMetadata(
          track.title ?? "",
          track.author ?? "",
          track.source ?? ""
        );
        queries = buildLyricsQueries(
          normalized.artist,
          normalized.trackName,
          track.title ?? ""
        );
        displayTitle = normalized.trackName || track.title;
      } else {
        return handler.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                client.i18n.get(handler.language, "commands.music", "lyrics_noquery", {
                  user: handler.user.username,
                  botname: client.user!.username,
                })
              )
              .setColor(client.color_main),
          ],
        });
      }
    }

    try {
      let best: LrclibRecord | null = null;

      for (const q of queries) {
        try {
          const params = new URLSearchParams({ track_name: q.track_name });
          if (q.artist_name) params.set("artist_name", q.artist_name);

          const response = await fetch(
            `https://lrclib.net/api/search?${params.toString()}`,
            {
              headers: { "User-Agent": "mewwme-dashboard/1.0 (https://meww.me)" },
              signal: AbortSignal.timeout(15_000),
            }
          );
          if (!response.ok) continue;

          const results: LrclibRecord[] = await response.json() as LrclibRecord[];
          if (Array.isArray(results) && results.length > 0) {
            best = results.find((r) => r.plainLyrics) ?? results[0];
            break;
          }
        } catch {
        }
      }

      if (!best || !best.plainLyrics) {
        return handler.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                client.i18n.get(handler.language, "commands.music", "lyrics_notfound", {
                  user: handler.user.username,
                  botname: client.user!.username,
                })
              )
              .setColor(client.color_main),
          ],
        });
      }

      const lyrics = best.plainLyrics;
      const embed = new EmbedBuilder().setColor(client.color_second).setTitle(
        client.i18n.get(handler.language, "commands.music", "lyrics_title", {
          song: displayTitle,
        })
      );

      if (lyrics.length > 4096) {
        embed.setDescription(
          client.i18n.get(handler.language, "commands.music", "lyrics_toolong", {
            url: `https://lrclib.net/api/get/${best.id}`,
          })
        );
      } else {
        embed.setDescription(lyrics);
      }

      return handler.editReply({ embeds: [embed] });
    } catch (error: any) {
      client.logger.error("LyricsCommand Error:", error);
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              client.i18n.get(handler.language, "commands.music", "lyrics_error", {
                user: handler.user.username,
                botname: client.user!.username,
                error: error.message,
              })
            )
            .setColor(client.color_main),
        ],
      });
    }
  }
}

