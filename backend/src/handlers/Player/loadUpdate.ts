import { Manager } from "../../manager.js";
import { EmbedBuilder, TextChannel, AttachmentBuilder, User, MessageFlags } from "discord.js";
import { FormatDuration } from "../../utilities/FormatDuration.js";
import { MewslinkPlayer, MewslinkTrack } from "../../mewslink/main.js";
import { TrackTitle } from "../../utilities/TrackTitle.js";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { mewcard } from "mewcard";
export class PlayerUpdateLoader {
  client: Manager;
  constructor(client: Manager) {
    this.client = client;
    this.loader(this.client);
  }

  async loader(client: Manager) {
    client.UpdateQueueMsg = async function (player: MewslinkPlayer) {
      let data = await client.db.setup.get(`${player.guildId}`);
      if (!data) return;
      if (data.enable === false) return;

      let channel = (await client.channels
        .fetch(data.channel)
        .catch(() => undefined)) as TextChannel;
      if (!channel) return;

      let playMsg = await channel.messages.fetch(data.playmsg).catch(() => undefined);
      if (!playMsg) return;

      let guildModel = await client.db.language.get(`${player.guildId}`);
      if (!guildModel) {
        guildModel = await client.db.language.set(`${player.guildId}`, client.config.bot.LANGUAGE);
      }

      const language = guildModel;

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

      function drawRoundedImage(ctx, img, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
        ctx.clip(); // Set clipping region to the rounded rectangle
        ctx.drawImage(img, x, y, width, height); // Draw image within the clipping region
        ctx.restore(); // Restore the original context after clipping
      }

      const TotalDuration = player.queue.duration;

      let cSong = player.queue.current;
      let qDuration = `${new FormatDuration().parse(TotalDuration + Number(player.queue.current?.duration))}`;

      // Check if there are songs in the queue before creating the canvas
      let attachment;
      if (player.queue.length > 0) {
        // After defining the canvasWidth
        const canvasWidth = 800;
        const songHeight = 60; // Tinggi untuk setiap lagu
        const canvasHeight = Math.min(player.queue.length, 10) * songHeight + 70; // Set the canvas height based on the number of songs (added offset)

        // Create a canvas
        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext("2d");

        // Set the background colour
        ctx.fillStyle = "#2C2F33";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Load font if necessary
        GlobalFonts.registerFromPath("./scripts/Courage-Road.ttf", "Courage Road");
        ctx.font = "16px Courage Road"; // Font size and style

        // Header text
        ctx.fillStyle = "#FFFFFF";
        const headerText = "Songs in Your Queue";
        const textWidth = ctx.measureText(headerText).width; // Calculate text width
        const xPosition = (canvasWidth - textWidth) / 2; // Calculate x position for center alignment
        ctx.fillText(headerText, xPosition, 30); // Draw the header text

        // Offset for song spacing
        let yOffset = 70;

        // Iterate through the songs in the queue
        for (let i = 0; i < Math.min(player.queue.length, 10); i++) {
          // Only display the top 5 songs
          const song = player.queue[i];

          // Load thumbnail from song URL
          const thumbnailUrl = song.artworkUrl || client.user?.displayAvatarURL(); // Use default if no thumbnail
          const thumbnailImage = await loadImage(thumbnailUrl);

          // Draw thumbnail with rounded corners
          const thumbnailSize = 50; // Thumbnail size
          const cornerRadius = 10; // Corner radius
          ctx.save(); // Save canvas state
          drawRoundedImage(
            ctx,
            thumbnailImage,
            50,
            yOffset - 20,
            thumbnailSize,
            thumbnailSize,
            cornerRadius
          );

          // Song index
          ctx.fillStyle = "#b4b4b4";
          ctx.fillText(`${i + 1}.`, 20, yOffset + 10); // Add index before thumbnail

          // Song title
          ctx.fillStyle = "#F4E0C7";
          ctx.font = "16px Courage Road"; // Normal size for song title

          // Trim title if more than 25 characters
          const maxTitleLength = 25;
          let displayTitle =
            song.title.length > maxTitleLength
              ? song.title.slice(0, maxTitleLength) + "..."
              : song.title;

          ctx.fillText(displayTitle, 120, yOffset); // Draw trimmed title

          // Song author
          ctx.fillStyle = "#b4b4b4"; // Color for author
          ctx.font = "12px Courage Road"; // Smaller size for author
          ctx.fillText(song.author, 120, yOffset + 18); // Position slightly lower than title

          // Song duration
          ctx.fillStyle = "#b4b4b4"; // Color for duration
          ctx.font = "10px Courage Road"; // Smaller size for duration
          ctx.fillText(new FormatDuration().parse(song.duration), 700, yOffset + 18); // Align with author

          // Update yOffset for the next song
          yOffset += 60;
        }

        // Generate image buffer
        const buffer = canvas.toBuffer("image/png");
        attachment = new AttachmentBuilder(buffer, { name: "queue.png" });
      } else {
        // If no songs are in the queue, draw "NO QUEUE"
        const canvasWidth = 800;
        const canvasHeight = 100; // Height for the "NO QUEUE" text canvas

        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext("2d");

        // Set the background colour
        ctx.fillStyle = "#2C2F33";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Load font if necessary
        GlobalFonts.registerFromPath("./scripts/Courage-Road.ttf", "Courage Road");
        ctx.font = "20px Courage Road"; // Font size and style for "NO QUEUE"

        // Draw the "NO QUEUE" text
        ctx.fillStyle = "#F4E0C7";
        const noQueueText = "There are no songs in the queue!";
        const textWidth = ctx.measureText(noQueueText).width; // Calculate text width
        const xPosition = (canvasWidth - textWidth) / 2; // Calculate x position for center alignment
        ctx.fillText(noQueueText, xPosition, canvasHeight / 2); // Draw the "NO QUEUE" text at the center

        // Generate image buffer
        const buffer = canvas.toBuffer("image/png");
        attachment = new AttachmentBuilder(buffer, { name: "queue.png" });
      }

      let embed = new EmbedBuilder()
        .setAuthor({
          name: client.i18n.get(language, "button.setup.music", "player_setup_author"),
          iconURL: client.i18n.get(language, "button.setup.music", "player_setup_icon_author"),
        })
        .setDescription(`**${TrackTitle(client, cSong!)}**`)
        .setThumbnail(
          source === "soundcloud"
            ? (client.user?.displayAvatarURL() as string)
            : (cSong.artworkUrl ?? `https://img.youtube.com/vi/${cSong.identifier}/hqdefault.jpg`)
        )
        .setColor(client.color_second)
        .setImage("attachment://queue.png")
        .setFooter({
          text: `${client.i18n.get(language, "button.setup.music", "setup_footer", {
            duration: qDuration,
            totalsong: player.queue.length.toString(),
            autoplay: player!.data.get("autoplay") ? "On" : "Off",
            queue: `${player.queue.length}`,
            volume: `${player.volume}%`,
            requester:
              (cSong?.requester as User)?.displayName || (cSong?.requester as User)?.username,
          })}`,
        })
        .setTimestamp()
        .addFields(
          {
            name: `${client.config.TRACKS_EMOJI.Author} ${cSong?.author} ♪`,
            value: `**${client.config.TRACKS_EMOJI.Timers} ${new FormatDuration().parse(cSong?.duration)}**`,
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

      return await playMsg
        .edit({
          flags: MessageFlags.SuppressNotifications,
          embeds: [embed],
          components: [client.enSwitchMod],
          files: attachment ? [attachment] : [], // Add the attachment if it exists
        })
        .catch((error) => {
          client.logger.info(
            "loadUpdate",
            `Error editing message in @ ${playMsg.guild!.name} / ${playMsg.guildId}`
          );
        });
    };

    /**
     *
     * @param {Player} player
     */
    client.UpdateMusic = async function (player: MewslinkPlayer) {
      let data = await client.db.setup.get(`${player.guildId}`);
      if (!data) return;
      if (data.enable === false) return;

      let channel = (await client.channels
        .fetch(data.channel)
        .catch(() => undefined)) as TextChannel;
      if (!channel) return;

      let playMsg = await channel.messages.fetch(data.playmsg).catch(() => undefined);
      if (!playMsg) return;

      let guildModel = await client.db.language.get(`${player.guildId}`);
      if (!guildModel) {
        guildModel = await client.db.language.set(`${player.guildId}`, client.config.bot.LANGUAGE);
      }

      const language = guildModel;

      const queueMsg = `${client.i18n.get(language, "button.setup.music", "setup_queuemsg")}`;

      const playEmbed = new EmbedBuilder()
        .setColor(client.color_second)
        .setAuthor({
          name: `${client.i18n.get(language, "button.setup.music", "setup_playembed_author")}`,
        })
        .setImage(client.config.bot.IMAGES_URL_REQUEST_MUSIC);

      return await playMsg
        .edit({
          content: `${queueMsg}`,
          embeds: [playEmbed],
          components: [client.diSwitch],
          files: [], // Add the attachment here
        })
        .catch((error) => {
          client.logger.info(
            "LoadUpdate",
            `Failed editing message in @ ${playMsg.guild!.name} / ${playMsg.guildId}`
          );
        });
    };
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
