import { Manager } from "../../manager.js";
import cron from "node-cron";
import { EmbedBuilder } from "discord.js";

export class GameHistoryCleanUp {
  client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.execute();
  }

  async execute() {
    // Schedule deletion of GameStatistics and GameHistory data every 25 days at 5 minutes past midnight
    cron.schedule(
      "5 0 25 * *",
      async () => {
        this.client.logger.info(
          GameHistoryCleanUp.name,
          "Running scheduled task to clear top tracks and top artists"
        );
        await this.GameHistoryCleanUp();
      },
      {
        timezone: "Asia/Jakarta", // Set timezone to Asia/Jakarta
      }
    );
  }

  async GameHistoryCleanUp() {
    try {
      await this.client.db.GameStatistics.deleteAll();
      this.client.logger.info(GameHistoryCleanUp.name, "Cleared all GameStatistics data.");
      await this.client.db.GameHistory.deleteAll();
      this.client.logger.info(GameHistoryCleanUp.name, "Cleared all GameHistory data.");
      await this.sendLogs();
    } catch (error) {
      this.client.logger.error(
        GameHistoryCleanUp.name,
        "Failed to clear GameStatistics and GameHistory data: " + error
      );
    }
  }

  async sendLogs() {
    if (!this.client.config.logchannel.CleanUpDatabase25DaysChannelID) return;

    const embed = new EmbedBuilder()
      .setTitle("GameStatistics and GameHistory Cleared")
      .setDescription(
        "All GameStatistics and GameHistory data has been cleared as part of the 25-day cleanup process."
      )
      .setTimestamp()
      .setColor(this.client.color_main);

    try {
      const channel = await this.client.channels
        .fetch(this.client.config.logchannel.CleanUpDatabase25DaysChannelID)
        .catch(() => undefined);

      if (!channel || (channel && !channel.isTextBased())) return;

      await channel.send({ embeds: [embed] });
      this.client.logger.info(
        GameHistoryCleanUp.name,
        "Log sent to GameStatisticsHistory channel."
      );
    } catch (error) {
      this.client.logger.error(GameHistoryCleanUp.name, "Failed to send log message: " + error);
    }
  }
}
