import { Manager } from "../../manager.js";
import {
  ComponentType,
  TextChannel,
  EmbedBuilder,
  User,
  AttachmentBuilder,
  MessageFlags,
} from "discord.js";

import { UpdateMusicStatusChannel } from "../../utilities/UpdateStatusChannel.js";
import { ScrobbleToLastFM } from "../../utilities/ScrobbleToLastFM.js";
import { startStatsSession } from "../../utilities/TopStatsSession.js";
import { TrackTitle } from "../../utilities/TrackTitle.js";
import { mewcard } from "mewcard";
import { FormatDuration } from "../../utilities/FormatDuration.js";
import { filterSelect, playerRowOne, playerRowTwo } from "../../utilities/PlayerControlButton.js";
import { AutoReconnectBuilderService } from "../../services/AutoReconnectBuilderService.js";
import { ControlButtonEnum } from "../../database/schema/ControlButton.js";
import { MewslinkPlayer, MewslinkTrack } from "../../mewslink/main.js";
import { emitPlayerState } from "../../utilities/EmitPlayerState.js";
import chalk from "chalk";
export function scheduleScrobble(client: Manager, player: MewslinkPlayer) {
  setTimeout(() => {
    ScrobbleToLastFM(client, player);
  }, client.config.features.WebServer.LAST_FM_SCROBBLED.scheduleScrobble);
}
export default class {
  async execute(client: Manager, player: MewslinkPlayer, track: MewslinkTrack) {
    if (!client.isDatabaseConnected)
      return client.logger.warn(
        "DatabaseService",
        chalk.red(
          `The database is not yet connected so this event will temporarily not execute. Please try again later!`
        )
      );

    const guild = await client.guilds.fetch(player.guildId).catch(() => undefined);

    client.logger.info(
      "TrackStart",
      `${chalk.hex("#53ec53")("Player Started in @ ")}${chalk.hex("#53ec53")(
        guild?.name
      )} / ${chalk.hex("#53ec53")(player.guildId)}`
    );

    let ControlButton = await client.db.ControlButton.get(`${player.guildId}`);
    if (!ControlButton)
      ControlButton = await client.db.ControlButton.set(
        `${player.guildId}`,
        ControlButtonEnum.Enable
      );

    if (!player) return;

    /////////// Update Music Setup ///////////
    await client.UpdateQueueMsg(player);
    /////////// Update Music Setup ///////////

    /////////// Update Music Status Channel //////////
    await UpdateMusicStatusChannel(client, player);
    /////////// Update Music Status Channel //////////

    /////////// Update Schedule Scrobble //////////
    scheduleScrobble(client, player);
    /////////// Update Schedule Scrobble //////////

    const channel = (await client.channels
      .fetch(player.textId)
      .catch(() => undefined)) as TextChannel;
    if (!channel) return;

    client.emit("trackStart", player);

    emitPlayerState(client, player);

    if (client.config.features.AUTO_RESUME) {
      const autoreconnect = new AutoReconnectBuilderService(client, player);
      const getData = await autoreconnect.get(player.guildId);
      if (!getData) await autoreconnect.playerBuild(player.guildId);
      else {
        player.queue.current
          ? await client.db.autoreconnect.set(
              `${player.guildId}.current`,
              player.queue.current?.uri
            )
          : true;
        await client.db.autoreconnect.set(`${player.guildId}.config.loop`, player.loop);

        function queueUri() {
          const res = [];
          for (let data of player.queue) {
            res.push(data.uri);
          }
          return res.length !== 0 ? res : [];
        }

        function previousUri() {
          const res = [];
          for (let data of player.queue.previous) {
            res.push(data.uri);
          }
          return res.length !== 0 ? res : [];
        }

        await client.db.autoreconnect.set(`${player.guildId}.queue`, queueUri());
        await client.db.autoreconnect.set(`${player.guildId}.previous`, previousUri());
      }
    }

    // If playback was triggered from the web dashboard, skip sending the
    // Discord embed entirely.  The flag stays active so that subsequent
    // tracks in the same dashboard session are also silent.  It is cleared
    // when a Discord command (e.g. /play) initiates playback instead.
    const isDashboardPlayback = player.data.get("dashboardPlayback") === true;

    //////////// PlayedSongGlobal //////////
    let BotPlayData = await client.db.PlayedSongGlobal.get("global");
    if (!BotPlayData) {
      BotPlayData = {
        SongsPlayed: 0,
      };
    }
    BotPlayData.SongsPlayed += 1;
    await client.db.PlayedSongGlobal.set("global", BotPlayData);
    //////////// PlayedSongGlobal //////////

    //////////// PlayedSongGuild //////////
    let GuildPlayData = await client.db.PlayedSongGuild.get(`${player.guildId}`);
    if (!GuildPlayData) {
      GuildPlayData = {
        Count: 0,
        GuildName: guild!.name,
      };
    } else {
      GuildPlayData.GuildName = guild!.name;
    }
    GuildPlayData.Count += 1;
    await client.db.PlayedSongGuild.set(`${player.guildId}`, GuildPlayData);
    //////////// PlayedSongGuild //////////

    //////////// TopArtist & TopTrack (60s listen rule) //////////
    startStatsSession(client, player);
    //////////// TopArtist & TopTrack (60s listen rule) //////////

    if (isDashboardPlayback) {
      return;
    }

    let data = await client.db.setup.get(`${channel.guild.id}`);
    if (data && player.textId === data.channel) return;

    let guildModel = await client.db.language.get(`${channel.guild.id}`);
    if (!guildModel) {
      guildModel = await client.db.language.set(`${channel.guild.id}`, client.config.bot.LANGUAGE);
    }

    const language = guildModel;

    const song = player.queue.current;

    if (ControlButton == ControlButtonEnum.Disable) return;

    // Guard: requester may be undefined when playback is triggered from the
    // dashboard (no Discord interaction to attach a User to). Without this
    // guard, UserThemes.id throws TypeError and the entire async handler
    // rejects silently — no embed is ever sent.
    const UserThemes = (song?.requester ?? null) as User | null;
    let themeData = UserThemes?.id ? await client.db.Themes.get(UserThemes.id) : null;
    let theme = client.config.features.MusicCard.Themes; // Default theme

    if (themeData) {
      theme = themeData.theme;
    }

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

    const durationString = new FormatDuration().parse(song?.duration);
    const originalTitle =
      durationString === "Live Stream"
        ? song?.author
        : song?.title || `♪ Those who wish to sing always find a song.`;

    const title = originalTitle.length > 40 ? `${originalTitle.slice(0, 40)}...` : originalTitle;
    const Author =
      (song?.author || guild!.name).length > 15
        ? `${(song?.author || guild!.name).slice(0, 15)}...`
        : song?.author || guild!.name;

    const card = new mewcard()
      .setName(
        String(
          title.replace(
            /(?:https?|ftp):\/\/[\n\S]+/g,
            `♪ Those who wish to sing always find a song.`
          )
        )
      )
      .setAuthor(Author.toUpperCase())
      .setColor("auto")
      .setTheme(theme)
      .setBrightness(50)
      .setThumbnail(
        source === "soundcloud"
          ? (client.user?.displayAvatarURL() as string)
          : (track.artworkUrl ?? `https://img.youtube.com/vi/${track.identifier}/hqdefault.jpg`)
      )
      .setRequester(
        (song?.requester as User)?.displayName.toUpperCase() ||
          (song?.requester as User)?.username.toUpperCase()
      );

    const cardBuffer = await card.build();
    const attachment = new AttachmentBuilder(cardBuffer, { name: "mewwme.png" });

    const embeded1 = new EmbedBuilder()
      .setAuthor({
        name: client.i18n.get(language, "events.player", "track_author"),
        iconURL: client.i18n.get(language, "events.player", "track_author_icon"),
      })
      .setDescription(`**${TrackTitle(client, track)}**`)
      .setImage(`attachment://mewwme.png`)
      .setColor(client.color_second)
      .addFields(
        {
          name: `${client.config.TRACKS_EMOJI.Author} ${song?.author} ♪`,
          value: `**${client.config.TRACKS_EMOJI.Timers} ${new FormatDuration().parse(song?.duration)}**`,
          inline: true,
        },
        {
          name: `${client.config.TRACKS_EMOJI.Volume} **${player.volume}%**`,
          value: `**${
            player!.data.get("autoplay") ? `${client.config.TRACKS_EMOJI.Autoplay} AutoPlay` : src
          }**`,
          inline: true,
        }
      );

    const embeded2 = new EmbedBuilder()
      .setAuthor({
        name: client.i18n.get(language, "events.player", "track_author"),
        iconURL: client.i18n.get(language, "events.player", "track_author_icon"),
      })
      .setDescription(`**${TrackTitle(client, track)}**`)
      .setColor(client.color_second)
      .setFooter({
        text: `Autoplay ${player!.data.get("autoplay") ? "On" : "Off"} • Queue Length ${player.queue.length} Tracks`,
        iconURL:
          client.user?.displayAvatarURL() || (song?.requester as User)?.displayAvatarURL() || "",
      })
      .setThumbnail(
        source === "soundcloud"
          ? client.user?.displayAvatarURL({ size: 512 })
          : (track.artworkUrl ?? `https://img.youtube.com/vi/${track.identifier}/hqdefault.jpg`)
      )
      .addFields(
        {
          name: client.i18n.get(language, "events.player", "track_song_author"),
          value: `[${Author || "Undefined"}](https://google.com/search?q=${encodeURIComponent(
            song?.author || "Undefined"
          )})`,
          inline: true,
        },
        {
          name: client.i18n.get(language, "events.player", "track_requested_by"),
          value: `**${song?.requester || "Undefined"}**`,
          inline: true,
        },
        {
          name: client.i18n.get(language, "events.player", "track_duration"),
          value: `\`${new FormatDuration().parse(song?.duration)}\``,
          inline: true,
        }
      );

    const embedToSend = client.config.features.MusicCard.Enable === true ? embeded1 : embeded2;

    const playing_channel = (await client.channels
      .fetch(player.textId)
      .catch(() => undefined)) as TextChannel;

    const nplaying = playing_channel
      ? await playing_channel.send({
          flags: MessageFlags.SuppressNotifications,
          embeds: [embedToSend],
          components: [
            ...((client.config.features.FilterMenu ?? false) ? [filterSelect(client)] : []),
            playerRowOne(client),
            playerRowTwo(client),
          ],
          files: client.config.features.MusicCard.Enable === true ? [attachment] : [],
        })
      : undefined;

    if (!nplaying) return;

    const collector = nplaying.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (message) => {
        if (
          message.guild!.members.me!.voice.channel &&
          message.guild!.members.me!.voice.channelId === message.member!.voice.channelId
        )
          return true;
        else {
          message.reply({
            content: `${client.i18n.get(language, "events.player", "no_same_voice")}`,
            flags: MessageFlags.Ephemeral,
          });
          return false;
        }
      },
    });

    client.nplayingMsg.set(player.guildId, {
      coll: collector,
      msg: nplaying,
    });

    collector.on("collect", async (message): Promise<void> => {
      const id = message.customId;
      const button = client.plButton.get(id);

      const language = guildModel;

      if (button) {
        try {
          return button.run(client, message, String(language), player, nplaying, collector);
        } catch (err) {
          client.logger.warn("ButtonError", err as string);
        }
      }
    });

    collector.on("end", (): void => {
      // @ts-ignore
      collector.removeAllListeners();
    });
  }
}
/**
 *  __  __            Made by Tragic              _
 * |  \/  |   L RMN - https://hi-lrmn.is-a.dev   ( )
 * | \  / | _____      ____      ___ __ ___   ___|/ ___
 * | |\/| |/ _ \ \ /\ / /\ \ /\ / / '_ ` _ \ / _ \ / __|
 * | |  | |  __/\ V  V /  \ V  V /| | | | | |  __/ \__ \
 * |_|  |_|\___| \_/\_/    \_/\_/ |_| |_| |_|\___| |___/
 *
 *     Discord Support: https://meww.me/support
 *     Community Resources: https://meww.me/premium
 */
