import { Manager } from "../../manager.js";
import cron from "node-cron";
import { Premium } from "../schema/Premium.js";
import { GuildPremium } from "../schema/GuildPremium.js";
import { EmbedBuilder } from "discord.js";

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
    // Check Web3 subscriptions first (handles quota stacking + expiry)
    await this.checkWeb3Subscriptions();

    const premium = Array.from(await this.client.db.premium.all());
    const users = premium.filter(
      (data) => data.value.isPremium == true && data.value.expiresAt !== "lifetime"
    );
    if (users && users.length !== 0) this.checkUser(users.map((data) => data.value));
    this.client.logger.info(PremiumScheduleSetup.name, `Checking ${users.length} users premium`);

    const premiumGuild = Array.from(await this.client.db.preGuild.all());
    const guilds = premiumGuild.filter(
      (data) => data.value.isPremium == true && data.value.expiresAt !== "lifetime"
    );
    if (guilds && guilds.length !== 0) this.checkGuild(guilds.map((data) => data.value));
    this.client.logger.info(PremiumScheduleSetup.name, `Checking ${guilds.length} guilds premium`);
  }

  async checkWeb3Subscriptions() {
    try {
      const allSubs = Array.from(await this.client.db.Web3Subscriptions.all());
      const activeSubs = allSubs.filter(
        (s) => s.value?.isActive !== false && s.value?.expiresAt && s.value.expiresAt > 0
      );

      // Group by user
      const userSubs = new Map<string, typeof activeSubs>();
      const expiredUsers = new Set<string>();

      for (const sub of activeSubs) {
        const userId = sub.value?.discordUserId;
        if (!userId) continue;

        if (sub.value.expiresAt && Date.now() >= sub.value.expiresAt) {
          // Mark expired
          await this.client.db.Web3Subscriptions.set(sub.id, { ...sub.value, isActive: false });
          expiredUsers.add(userId);
          this.client.logger.info(
            PremiumScheduleSetup.name,
            `Web3 subscription expired: ${sub.id} (${sub.value.tier ?? "legacy"}) for user ${userId}`
          );
          await this.sendLog(
            "Web3 Subscription Expired",
            `**User:** \`${userId}\`\n**Tier:** \`${sub.value.tier ?? "legacy"}\`\n**Quota:** \`${sub.value.quota ?? 1}\`\n*Subscription has expired.*`,
            ""
          );
        } else {
          // Still active — group by user
          if (!userSubs.has(userId)) userSubs.set(userId, []);
          userSubs.get(userId)!.push(sub);
        }
      }

      // For each user with expired subs, recalculate
      for (const userId of expiredUsers) {
        const remaining = userSubs.get(userId) ?? [];
        const newQuota = remaining.reduce((sum, s) => sum + (s.value?.quota ?? 0), 0);

        if (newQuota === 0) {
          // No active subs left — remove premium
          await this.client.db.premium.delete(userId);
          this.client.logger.info(PremiumScheduleSetup.name, `Removed all Web3 premium for user ${userId}`);
        } else {
          // Update aggregate premium
          const maxExpiry = Math.max(...remaining.map((s) => s.value?.expiresAt ?? 0));
          const existing = await this.client.db.premium.get(userId);
          if (existing) {
            await this.client.db.premium.set(userId, { ...existing, expiresAt: maxExpiry });
          }
        }

        // Check if user has too many guilds activated
        const allGuilds = Array.from(await this.client.db.preGuild.all());
        const userGuilds = allGuilds
          .filter((g) => g.value?.redeemedBy?.ownerId === userId && (g.value?.plan?.startsWith("web3") ?? false))
          .sort((a, b) => (b.value?.redeemedAt ?? 0) - (a.value?.redeemedAt ?? 0)); // LIFO

        if (userGuilds.length > newQuota) {
          const excess = userGuilds.length - newQuota;
          for (let i = 0; i < excess; i++) {
            const guild = userGuilds[i];
            await this.client.db.preGuild.delete(guild.id);
            this.client.logger.info(
              PremiumScheduleSetup.name,
              `Auto-deactivated guild ${guild.id} for user ${userId} (quota exceeded)`
            );
            await this.sendLog(
              "Guild Premium Auto-Deactivated",
              `**Guild:** \`${guild.value?.redeemedBy?.name ?? guild.id}\`\n**User:** \`${userId}\`\n*Deactivated due to expired subscription quota.*`,
              guild.value?.redeemedBy?.GuildiconURL ?? ""
            );
          }
        }
      }

      if (expiredUsers.size > 0) {
        this.client.logger.info(
          PremiumScheduleSetup.name,
          `Processed ${expiredUsers.size} users with expired Web3 subscriptions`
        );
      }
    } catch (error) {
      this.client.logger.error(PremiumScheduleSetup.name, `Failed to check Web3 subscriptions: ${error}`);
    }
  }

  async checkUser(users: Premium[]) {
    for (let data of users) {
      try {
        if (data.expiresAt !== "lifetime" && Date.now() >= data.expiresAt) {
          await this.client.db.premium.delete(data.id);
          this.client.logger.info(
            PremiumScheduleSetup.name,
            `Deleted user premium ${data.redeemedBy.username}`
          );

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

  async checkGuild(guilds: GuildPremium[]) {
    for (let data of guilds) {
      try {
        if (data.expiresAt !== "lifetime" && Date.now() >= data.expiresAt) {
          await this.client.db.preGuild.delete(data.id);
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
