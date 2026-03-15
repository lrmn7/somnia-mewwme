import { Manager } from "../../manager.js";
import cron from "node-cron";
import fs from "fs";
import path from "path";

export class TranscriptCleanUp {
  client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.execute();
  }

  async execute() {
    cron.schedule(
      "0 0 * * *",
      async () => {
        this.client.logger.info(
          TranscriptCleanUp.name,
          "Running scheduled task to clear transcript file"
        );
        await this.TranscriptCleanUp();
      },
      {
        timezone: "Asia/Jakarta",
      }
    );
  }

  async TranscriptCleanUp() {
    const transcriptDir = path.join("transcript");

    try {
      const files = fs.readdirSync(transcriptDir);
      const htmlFiles = files.filter((file) => file.endsWith(".html"));
      const today = new Date();
      const thresholdDate = new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000);

      for (const file of htmlFiles) {
        const regex = /^(\d+)-([a-zA-Z0-9]+)-(\d{2})-(\d{2})-(\d{4})\.html$/;
        const match = file.match(regex);

        if (match) {
          const [, ticketCount, username, day, month, year] = match;
          const fileDate = new Date(`${year}-${month}-${day}`);

          if (fileDate < thresholdDate) {
            const filePath = path.join(transcriptDir, file);
            fs.unlinkSync(filePath);
            this.client.logger.info(TranscriptCleanUp.name, `Deleted old transcript: ${file}`);
          }
        } else {
          this.client.logger.info(TranscriptCleanUp.name, `File did not match pattern: ${file}`);
        }
      }
    } catch (error) {
      this.client.logger.error(TranscriptCleanUp.name, "Failed to clean old transcripts");
    }
  }
}
