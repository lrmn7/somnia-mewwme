import { Manager } from "../../manager.js";
import { EmbedBuilder, User } from "discord.js";
import { FormatDuration } from "../../utilities/FormatDuration.js";
import { ProgressBar } from "../../utilities/ProgressBar.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { MewslinkPlayer, MewslinkTrack } from "../../mewslink/main.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
import { truncateString } from "mstg-kit";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["nowplaying"];
  public description = "Display the song currently playing.";
  public category = "Music";
  public accessableby = data.COMMANDS_ACCESS.MUSIC.NowPlaying;
  public usage = "";
  public aliases = ["np"];
  public lavalink = true;
  public playerCheck = true;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;

  public options = [];

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.SilentDeferReply();

    const player = client.mewslink.players.get(handler.guild!.id) as MewslinkPlayer;
    const currentTrack = player.queue.current;

    if (!currentTrack) {
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "no_songs_playing", {
                user: handler.user!.displayName || handler.user!.tag,
              })}`
            )
            .setColor(client.color_main),
        ],
      });
    }

    const song = player.queue.current;
    const position = player.position;
    const CurrentDuration = new FormatDuration().parse(position);
    const TotalDuration = new FormatDuration().parse(song!.duration);
    const bar = ProgressBar(position, song!.duration, 20);
    const Part = Math.floor((position / song!.duration!) * 30);
    const requester = song?.requester as User;
    const requesterName =
      requester?.displayName || requester?.username || client.user?.username || "N/A";

    let requesterAvatarURL;
    if (requester && requester.displayAvatarURL) {
      requesterAvatarURL = requester.displayAvatarURL();
    } else {
      requesterAvatarURL = client.user?.displayAvatarURL();
    }

    const source = player.queue.current?.source || "unknown";
    let src = client.config.PLAYER_SOURCENAME.UNKNOWN;
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

    const embeded = new EmbedBuilder();
    embeded.setAuthor({
      name: client.i18n.get(handler.language, "commands.music", "nowplaying_track_author"),
      iconURL: client.i18n.get(handler.language, "commands.music", "nowplaying_track_author_icon"),
    });
    embeded.setColor(client.color_second);
    if (new FormatDuration().parse(song!.duration) !== "Live Stream") {
      embeded.setDescription(`**${this.getTitle(client, song!)}**`);
    }
    embeded.setThumbnail(
      source === "soundcloud"
        ? (client.user?.displayAvatarURL() as string)
        : (song?.artworkUrl ?? `https://img.youtube.com/vi/${song?.identifier}/hqdefault.jpg`)
    );
    embeded.addFields(fieldDataGlobal);
    embeded.setFooter({
      text: `request from ${requesterName.toUpperCase()}`,
      iconURL: requesterAvatarURL,
    });

    await handler.editReply({
      content: " ",
      embeds: [embeded],
      files: [],
    });
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
