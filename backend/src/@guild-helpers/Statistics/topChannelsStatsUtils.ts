import { Manager } from "../../manager.js";
import { Message } from "discord.js";
import { updateTopChannelsStats } from "./StatisticsUtils.js";

export class handleTopChannelsStats {
  private client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.Init();
  }
  private Init() {
    this.client.on("messageCreate", async (message: Message) => {
      if (!message.guild || message.author.bot) return; // Ignore bot messages or messages outside guilds

      const guildId = message.guild.id;
      const userId = message.author.id;
      const channelId = message.channel.id;

      // Update the top channels stats for the user
      await updateTopChannelsStats(guildId, userId, channelId, this.client);
    });
  }
}
