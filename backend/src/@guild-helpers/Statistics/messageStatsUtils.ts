import { Manager } from "../../manager.js";
import { Message } from "discord.js";
import { updateMessageCount } from "./StatisticsUtils.js";

export class handleMessageStats {
  private client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.Init();
  }
  private Init() {
    this.client.on("messageCreate", async (message: Message) => {
      if (!message.guild || message.author.bot) return; // Ignore bot messages or messages outside guilds

      // Update the message count for the user, passing `client`
      await updateMessageCount(message.guild.id, message.author.id, this.client);
    });
  }
}
