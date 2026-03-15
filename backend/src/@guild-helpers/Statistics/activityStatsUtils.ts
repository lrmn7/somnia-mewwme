import { Manager } from "../../manager.js";
import { Message } from "discord.js";

export class handleActivityStats {
  private client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.Init();
  }
  private Init() {
    this.client.on("messageCreate", async (message: Message) => {
      // Ignore messages outside of guilds or from bots
      if (!message.guild || message.author.bot) return;

      const guildId = message.guild.id;
      const userId = message.author.id;
      const today = new Date().setHours(0, 0, 0, 0); // Start of today's date (midnight)

      // Fetch the user's stats from the database
      let stats = await this.client.db.UserStatistics.get(`${userId}`);

      if (stats) {
        // Check if the user was already active today
        if (stats.lastActiveDay !== today) {
          stats.daysActive += 1; // Increment days active
          stats.lastActiveDay = today; // Update last active day to today
        }

        // Update other stats (e.g., message count) if needed
        stats.messageCount += 1;
        stats.lastUpdated = Date.now();

        // Save the updated stats
        await this.client.db.UserStatistics.set(`${userId}`, stats);
      } else {
        // Create a new entry if the user has no stats yet
        stats = {
          guildId,
          userId,
          messageCount: 1,
          voiceTime: 0,
          reactionCount: 0,
          topChannels: {},
          voiceJoinTime: null,
          lastUpdated: Date.now(),
          joinDate: message.guild.members.cache.get(userId)?.joinedTimestamp || Date.now(),
          daysActive: 1,
          firstMessageDate: Date.now(),
          lastActiveDay: today, // Initialize with today's date
        };
        await this.client.db.UserStatistics.set(`${userId}`, stats);
      }
    });
  }
}
