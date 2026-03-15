import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import { EmbedBuilder } from "discord.js";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";

const data: Config = new ConfigDataService().data;

// Register the font for use in the canvas
GlobalFonts.registerFromPath("./scripts/Courage-Road.ttf", "Courage Road");

export default class implements Command {
  public name = ["topstats"];
  public description = "Displays top guilds, top users, and top votes";
  public category = "Info";
  public accessableby = data.COMMANDS_ACCESS.INFO.TopStats;
  public usage = "";
  public aliases = ["ts"];
  public lavalink = false;
  public usingInteraction = true;
  public playerCheck = false;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;
  public options = [];

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.deferReply();

    try {
      const guildsData = await client.db.PlayedSongGuild.all();
      const usersData = await client.db.PlayedSongUser.all();
      const votesData = await client.db.votes.all();

      const topGuilds =
        (guildsData || [])
          .sort((a, b) => (b.value.Count || 0) - (a.value.Count || 0))
          .slice(0, 5)
          .map((guild, index) => `${index + 1}. ${guild.value.GuildName}`)
          .join("\n") || "No data available";

      const topUsers =
        (usersData || [])
          .sort((a, b) => (b.value.totalSongsPlayed || 0) - (a.value.totalSongsPlayed || 0))
          .slice(0, 10)
          .map((user, index) => `${index + 1}. ${user.value.username}`)
          .join("\n") || "No data available";

      const topVotes =
        (votesData || [])
          .sort((a, b) => (b.value.count || 0) - (a.value.count || 0))
          .slice(0, 5)
          .map((vote, index) => `${index + 1}. ${vote.value.username}`)
          .join("\n") || "No data available";

      const canvas = createCanvas(954, 647);
      const ctx = canvas.getContext("2d");

      const backgroundImg = await loadImage(client.config.bot.TOPSTATS_CARD);
      ctx.drawImage(backgroundImg, 0, 0, 954, 647);

      function truncateText(text: string, maxLength: number): string {
        return text.length > maxLength ? text.slice(0, maxLength - 3) + "..." : text;
      }

      function drawTopGuilds(guilds: string, x: number, y: number): void {
        ctx.fillStyle = "#f4d8ad";
        ctx.font = "20px Courage Road";
        const lines = guilds.toUpperCase().split("\n");
        lines.forEach((line) => {
          const truncatedLine = truncateText(line, 21);
          ctx.fillText(truncatedLine, x, y);
          y += 40;
        });
      }

      function drawTopUsers(users: string, x: number, y: number): void {
        ctx.fillStyle = "#f4d8ad";
        ctx.font = "18px Courage Road";
        const lines = users.split("\n");
        lines.forEach((line) => {
          const truncatedLine = truncateText(line, 21);
          ctx.fillText(truncatedLine, x, y);
          y += 33;
        });
      }

      function drawTopVotes(votes: string, x: number, y: number): void {
        ctx.fillStyle = "#f4d8ad";
        ctx.font = "20px Courage Road";
        const lines = votes.split("\n");
        lines.forEach((line) => {
          const truncatedLine = truncateText(line, 21);
          ctx.fillText(truncatedLine, x, y);
          y += 40;
        });
      }
      drawTopGuilds(topGuilds, 470, 140);
      drawTopUsers(topUsers, 50, 285);
      drawTopVotes(topVotes, 470, 425);
      const buffer = canvas.toBuffer("image/jpeg");

      await handler.editReply({
        files: [
          {
            attachment: buffer,
            name: "topstats-mewwme.jpg",
          },
        ],
      });
    } catch (error) {
      client.logger.warn("TopStats", "Error generating top stats image");
      await handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.info", "topstats_error")}`
            )
            .setColor(client.color_main),
        ],
        content: " ",
      });
    }
  }
}
