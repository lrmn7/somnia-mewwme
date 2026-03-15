import {
  ButtonInteraction,
  CacheType,
  InteractionCollector,
  Message,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags,
} from "discord.js";
import { PlayerButton } from "../@types/Button.js";
import { Manager } from "../manager.js";
import { FormatDuration } from "../utilities/FormatDuration.js";
import { ProgressBar } from "../utilities/ProgressBar.js";
import { MewslinkPlayer, MewslinkTrack } from "../mewslink/main.js";
import { Config } from "../@types/Config.js";
import { ConfigDataService } from "../services/ConfigDataService.js";
import { PlayerControlService } from "../services/PlayerControlService.js";
import { DjRoleService } from "../services/DjRoleService.js";
const data: Config = new ConfigDataService().data;
export default class implements PlayerButton {
  name = "queue";
  accessableby = data.COMMANDS_ACCESS.MUSIC.Queue[0];
  async run(
    client: Manager,
    message: ButtonInteraction<CacheType>,
    language: string,
    player: MewslinkPlayer,
    nplaying: Message<boolean>,
    collector: InteractionCollector<ButtonInteraction<"cached">>
  ): Promise<any> {
    const hasPermission = await new PlayerControlService().check(
      client,
      message,
      language,
      this.accessableby
    );
    if (!hasPermission) return;

    // ========================DJ ROLE CHECK================================
    const isDjAuthorized = await new DjRoleService().check(client, message, language);
    if (!isDjAuthorized) return;

    if (!player) {
      collector.stop();
    }
    const song = player.queue.current;
    const position = player.position;
    const qduration = `${new FormatDuration().parse(song!.duration + player.queue.duration)}`;
    const CurrentDuration = new FormatDuration().parse(position);
    const TotalDuration = new FormatDuration().parse(song!.duration);
    const bar = ProgressBar(position, song!.duration, 20);
    const thumbnail =
      song?.artworkUrl ?? `https://img.youtube.com/vi/${song!.identifier}/hqdefault.jpg`;

    const source = player.queue.current?.source || "unknown";
    let src = client.config.PLAYER_SOURCENAME.UNKNOWN; // Default to UNKNOWN if source is unknown
    if (source === "youtube") {
      src = client.config.PLAYER_SOURCENAME.YOUTUBE;
    } else if (source === "spotify") {
      src = client.config.PLAYER_SOURCENAME.SPOTIFY;
    } else if (source === "tidal") {
      src = client.config.PLAYER_SOURCENAME.TIDAL;
    } else if (source === "soundcloud") {
      src = client.config.PLAYER_SOURCENAME.SOUNDCLOUD;
    } else if (source === "deezer") {
      src = client.config.PLAYER_SOURCENAME.DEEZER;
    } else if (source === "twitch") {
      src = client.config.PLAYER_SOURCENAME.TWITCH;
    } else if (source === "apple") {
      src = client.config.PLAYER_SOURCENAME.APPLE_MUSIC;
    } else if (source === "applemusic") {
      src = client.config.PLAYER_SOURCENAME.APPLE_MUSIC;
    } else if (source === "youtube_music") {
      src = client.config.PLAYER_SOURCENAME.YOUTUBE_MUSIC;
    } else if (source === "http") {
      src = client.config.PLAYER_SOURCENAME.HTTP;
    }

    let pagesNum = Math.ceil(player.queue.length / 10);
    if (pagesNum === 0) pagesNum = 1;

    const songStrings = [];
    for (let i = 0; i < player.queue.length; i++) {
      const song = player.queue[i];
      songStrings.push(
        `**${i + 1}.** ${this.getTitle(client, song)} \`[${new FormatDuration().parse(song.duration)}]\`
        `
      );
    }

    const pages = [];
    for (let i = 0; i < pagesNum; i++) {
      const str = songStrings.slice(i * 10, i * 10 + 10).join("");

      const embedQueue = new EmbedBuilder()
        .setTitle(`${client.i18n.get(language, "button.player.music", "queue_title")}`)
        .setThumbnail(thumbnail)
        .setColor(client.color_second)
        .setDescription(
          `${client.i18n.get(language, "button.player.music", "queue_description", {
            title: this.getTitle(client, song!),
            duration: new FormatDuration().parse(song?.duration),
            requester: `${song!.requester}`,
            list_song: str == "" ? "  `Nothing`" : "\n" + str,
            user: String(message.user?.displayName || message.user?.tag),
            botname: client.user!.username || client.user!.displayName,
          })}`
        )
        .setFooter({
          text: `${client.i18n.get(language, "button.player.music", "queue_footer", {
            page: `${i + 1}`,
            pages: `${pagesNum}`,
            queue_lang: `${player.queue.length}`,
            total_duration: qduration,
          })}`,
        });

      pages.push(embedQueue);
    }
    if (player.queue.length === 0) {
      const fieldDataGlobal = [
        {
          name: `${client.config.TRACKS_EMOJI.Author} ${song?.author} ♪`,
          value: `${client.config.TRACKS_EMOJI.Timers} **${new FormatDuration().parse(song!.duration)}**`,
          inline: true,
        },
        {
          name: `**${
            player!.data.get("autoplay")
              ? `${client.config.TRACKS_EMOJI.Autoplay} AutoPlay`
              : `${client.config.TRACKS_EMOJI.Volume} ${player.volume}%`
          }**`,
          value: `**${src}**`,
          inline: true,
        },
        {
          name: `**Current Duration**`,
          value: `\`${CurrentDuration} / ${new FormatDuration().parse(song!.duration)}\n${bar}\``,
          inline: false,
        },
      ];
      const embedNoQueue = new EmbedBuilder()
        .setDescription(`**${this.getTitle(client, song!)}**`)
        .setColor(client.color_second)
        .setThumbnail(
          source === "soundcloud"
            ? (client.user?.displayAvatarURL() as string)
            : (song?.artworkUrl ?? `https://img.youtube.com/vi/${song?.identifier}/hqdefault.jpg`)
        )
        .addFields(fieldDataGlobal);
      message.reply({ embeds: [embedNoQueue], flags: MessageFlags.Ephemeral });
    } else {
      message.reply({ embeds: [pages[0]], flags: MessageFlags.Ephemeral });
    }
  }

  getTitle(client: Manager, tracks: MewslinkTrack): string {
    const truncate = (str: string, maxLength: number): string =>
      str.length > maxLength ? str.substring(0, maxLength - 3) + "..." : str;
    const title = truncate(tracks.title, 25);
    const author = truncate(tracks.author, 15);
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
