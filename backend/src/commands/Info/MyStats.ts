import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import { EmbedBuilder } from "discord.js";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";

const data: Config = new ConfigDataService().data;

GlobalFonts.registerFromPath("./scripts/Courage-Road.ttf", "Courage Road");

export default class implements Command {
  public name = ["mystats"];
  public description = "Displays your activity history and usage statistics";
  public category = "Info";
  public accessableby = data.COMMANDS_ACCESS.INFO.MyStats;
  public usage = "";
  public aliases = ["st"];
  public lavalink = false;
  public usingInteraction = true;
  public playerCheck = false;
  public sameVoiceCheck = false;
  public permissions = [];
  public options = [];
  public djRole = false;

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.deferReply();

    const userId = handler.user.id;

    try {
      const userData = await client.db.PlayedSongUser.get(userId);
      const commandUsageData = await client.db.CommandUserUsage.get(userId);
      const voteData = await client.db.votes.get(userId);
      const topTracksData = await client.db.TopTrack.get(userId);
      const topArtistsData = await client.db.TopArtist.get(userId);

      const totalCommands = commandUsageData?.total || 0;
      const totalPlayed = userData?.totalSongsPlayed || 0;
      const voteCount = voteData?.count || 0;
      const topTracksArray = Array.isArray(topTracksData?.Tracks) ? topTracksData?.Tracks : [];
      const topArtistsArray = Array.isArray(topArtistsData?.Artists) ? topArtistsData?.Artists : [];
      const topTracks =
        topTracksArray
          .sort((a, b) => (b.count || 0) - (a.count || 0))
          .slice(0, 3)
          .map((track, index) => `${index + 1}. ${track.name}`)
          .join("\n") || "No data available";

      const topArtists =
        topArtistsArray
          .sort((a, b) => (b.count || 0) - (a.count || 0))
          .slice(0, 3)
          .map((artist, index) => `${index + 1}. ${artist.name}`)
          .join("\n") || "No data available";
      const canvas = createCanvas(954, 647);
      const ctx = canvas.getContext("2d");
      const backgroundImg = await loadImage(client.config.bot.MYSTATS_CARD);
      ctx.drawImage(backgroundImg, 0, 0, 954, 647);
      const userPfp = await loadImage(
        handler.user.displayAvatarURL({ extension: "jpg", size: 1024 })
      );
      const x = 53 + 142 / 2;
      const y = 30 + 142 / 2;
      const radius = 142 / 2;
      const borderThickness = 5;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius + borderThickness, 0, Math.PI * 2);
      ctx.fillStyle = "#f4d8ad";
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(userPfp, 53, 30, 142, 142);
      ctx.restore();

      function UsernameTruncateText(text, maxLength) {
        if (text.length > maxLength) {
          return text.slice(0, maxLength - 3) + "...";
        }
        return text;
      }

      const maxLength = 18;
      const username = handler.user.username.toUpperCase();
      const truncatedUsername = UsernameTruncateText(username, maxLength);

      ctx.font = "40px Courage Road";
      ctx.fillStyle = "#a4815e";
      ctx.textAlign = "left";
      ctx.fillText(truncatedUsername, 208, 90);
      ctx.font = "30px Courage Road";
      ctx.fillStyle = "#f4d8ad";
      ctx.fillText(`${totalCommands}`.toUpperCase(), 295, 500);
      ctx.font = "30px Courage Road";
      ctx.fillStyle = "#f4d8ad";
      ctx.fillText(`${totalPlayed}`.toUpperCase(), 295, 580);
      ctx.font = "24px Courage Road";
      ctx.fillStyle = "#a4815e";
      ctx.fillText(`TOP.GG VOTES COUNT - ${voteCount}`.toUpperCase(), 208, 140);
      function topTrackstruncateText(text: string, maxLength: number): string {
        return text.length > maxLength ? text.slice(0, maxLength - 3) + "..." : text;
      }

      ctx.font = "20px Courage Road";
      ctx.fillStyle = "#f4d8ad";
      let topTracksY = 275;
      const topTracksLines = topTracks.toUpperCase().split("\n");
      topTracksLines.forEach((line) => {
        const truncatedLine = topTrackstruncateText(line, 40);
        ctx.fillText(truncatedLine, 75, topTracksY);
        topTracksY += 40;
      });

      function topArtiststruncateText(text: string, maxLength: number): string {
        return text.length > maxLength ? text.slice(0, maxLength - 3) + "..." : text;
      }
      ctx.fillStyle = "#f4d8ad";
      ctx.font = "20px Courage Road";
      let topArtistsY = 505;
      const topArtistsLines = topArtists.toUpperCase().split("\n");
      topArtistsLines.forEach((line) => {
        const truncatedLine = topArtiststruncateText(line, 21);
        ctx.fillText(truncatedLine, 520, topArtistsY);
        topArtistsY += 35;
      });

      const buffer = canvas.toBuffer("image/jpeg");
      await handler.editReply({
        files: [
          {
            attachment: buffer,
            name: "mystats-mewwme.jpg",
          },
        ],
      });
    } catch (error) {
      client.logger.warn("UserStats", "Error generating user statistics image");
      await handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.info", "mystats_error")}`
            )
            .setColor(client.color_main),
        ],
        content: " ",
      });
    }
  }
}
