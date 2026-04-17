import { Manager } from "../../manager.js";
import cron from "node-cron";
import { PremiumUserLegacy } from "../schema/PremiumUserLegacy.js";
import { PremiumGuildLegacy } from "../schema/PremiumGuildLegacy.js";
import { EmbedBuilder } from "discord.js";
import { reconcileUserQuota } from "../../web/route/web3Premium.js";

export class PremiumScheduleSetup {
  client: Manager;
  constructor(client: Manager) {
    this.client = client;
    this.execute();
  }

  async execute() {
    this.setupChecker();
    cron.schedule("0 * * * *", () => {
      this.client.logger.info(
        PremiumScheduleSetup.name,
        "Running scheduled task for Premium user and guild"
      );
      this.setupChecker();
    });
  }

  async setupChecker() {
    const premium = Array.from(await this.client.db.PremiumUserLegacy.all());
    const users = premium.filter(
      (data) => data.value.isPremium == true && data.value.expiresAt !== "lifetime"
    );
    if (users && users.length !== 0) this.checkUser(users.map((data) => data.value));
    this.client.logger.info(PremiumScheduleSetup.name, `Checking ${users.length} users premium`);

    const premiumGuild = Array.from(await this.client.db.PremiumGuildLegacy.all());
    const guilds = premiumGuild.filter(
      (data) => data.value.isPremium == true && data.value.expiresAt !== "lifetime"
    );
    if (guilds && guilds.length !== 0) this.checkGuild(guilds.map((data) => data.value));
    this.client.logger.info(PremiumScheduleSetup.name, `Checking ${guilds.length} guilds premium`);
  }

  async checkUser(users: PremiumUserLegacy[]) {
    for (let data of users) {
      try {
        if (data.expiresAt !== "lifetime" && Date.now() >= data.expiresAt) {
          await this.client.db.PremiumUserLegacy.delete(data.id);
          this.client.logger.info(
            PremiumScheduleSetup.name,
            `Deleted user premium ${data.redeemedBy.username}`
          );

          // Reconcile guild quota so excess claimed guilds are released
          try {
            await reconcileUserQuota(this.client, data.id);
          } catch {
            // best-effort reconciliation
          }

          const thumbnailURL = data.redeemedBy.avatarURL;
          // Send logs to a channel
          await this.sendLog(
            `Premium User Expired`,
            `**User:** \`${data.redeemedBy.username || "Unknown"} / ${data.redeemedBy.id || "Unknown"}\` \n**Plan:** \`${data.plan || "Unknown"}\`\n*Premium User has expired and was removed.*`,
            thumbnailURL
          );
        }
      } catch (error) {
        this.client.logger.error(PremiumScheduleSetup.name, `Failed to delete user ${data.id}`);
      }
    }
  }

  async checkGuild(guilds: PremiumGuildLegacy[]) {
    for (let data of guilds) {
      try {
        if (data.expiresAt !== "lifetime" && Date.now() >= data.expiresAt) {
          await this.client.db.PremiumGuildLegacy.delete(data.id);
          this.client.logger.info(
            PremiumScheduleSetup.name,
            `Deleted guild premium ${data.redeemedBy.name}`
          );
          const thumbnailURL = data.redeemedBy.GuildiconURL;
          // Send logs to a channel
          await this.sendLog(
            `Premium Guild Expired`,
            `**Guild:** \`${data.redeemedBy.name || "Unknown"} / ${data.redeemedBy.id || "Unknown"}\`\n**Owner:** \`${data.redeemedBy.ownerName || "Unknown"} / ${data.redeemedBy.ownerId || "Unknown"}\`\n**Plan:** \`${data.plan || "Unknown"}\`\n*Premium guild has expired and was removed.*`,
            thumbnailURL
          );
        }
      } catch (error) {
        this.client.logger.error(PremiumScheduleSetup.name, `Failed to delete guild ${data.id}`);
      }
    }
  }

  async sendLog(title: string, description: string, thumbnailURL: string) {
    try {
      if (!this.client.config.logchannel.PremiumExpireChannelID) return;

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setThumbnail(thumbnailURL ?? this.client.user?.displayAvatarURL())
        .setTimestamp()
        .setColor(this.client.color_main);

      const channel = await this.client.channels
        .fetch(this.client.config.logchannel.PremiumExpireChannelID)
        .catch(() => undefined);

      if (!channel || (channel && !channel.isTextBased())) return;

      channel.send({ embeds: [embed] });
    } catch (error) {
      this.client.logger.error(
        PremiumScheduleSetup.name,
        "Failed to send log to channel: " + error
      );
    }
  }
}
