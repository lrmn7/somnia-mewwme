import { Manager } from "../../manager.js";
import { MessageReaction, PartialMessageReaction, User, PartialUser } from "discord.js";
import { updateReactionStats } from "./StatisticsUtils.js";

export class handleReactionStats {
  private client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.Init();
  }
  private Init() {
    this.client.on(
      "messageReactionAdd",
      async (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
        // If the reaction or user is partial, fetch the full objects
        if (reaction.partial) {
          try {
            await reaction.fetch();
          } catch (error) {
            this.client.logger.error(handleReactionStats.name, "Failed to fetch reaction");
            return;
          }
        }

        if (user.partial) {
          try {
            await user.fetch();
          } catch (error) {
            this.client.logger.error(handleReactionStats.name, "Failed to fetch user");
            return;
          }
        }

        if (!reaction.message.guild || user.bot) return; // Ignore bot reactions

        await updateReactionStats(reaction as MessageReaction, user as User, this.client);
      }
    );
  }
}
