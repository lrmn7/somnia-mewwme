import { Manager } from "../../manager.js";
import { TopggService } from "../../services/TopggService.js";
import { PresenceStatusData } from "discord.js";
import chalk from "chalk";
import { printBrandBanner } from "mstg-kit";

export default class {
  async execute(client: Manager) {
    client.logger.info("ClientReady", chalk.white(`Logged in @ ${client.user!.tag}`));

    printBrandBanner(
      (tag, msg) => client.logger.info(tag, msg),
      (tag, msg) => client.logger.warn(tag, msg)
    );

    // Cache for total metrics across all clusters
    let totalGuilds = client.guilds.cache.size;
    let totalMembers = client.guilds.cache.reduce((a, b) => a + b.memberCount, 0);
    let totalChannels = client.channels.cache.size;

    // Fetch total metrics from primary process (updates every 15s)
    const updateTotalMetrics = async () => {
      if (client.clusterManager) {
        try {
          const res = await client.clusterManager.sendMaster("metrics_all");
          const r = res.response as any;
          if (r && r.totalGuilds != null) {
            totalGuilds = r.totalGuilds;
            totalMembers = r.totalUsers ?? totalMembers;
            totalChannels = r.perCluster?.reduce((s: number, c: any) => s + (c.channels ?? 0), 0) ?? totalChannels;
          }
        } catch { /* fall back to local cache */ }
      } else {
        totalGuilds = client.guilds.cache.size;
        totalMembers = client.guilds.cache.reduce((a, b) => a + b.memberCount, 0);
        totalChannels = client.channels.cache.size;
      }
    };

    await updateTotalMetrics();
    setInterval(updateTotalMetrics, 15_000);

    setInterval(() => {
      const activities = [
        client.config.bot.BOT_ACTIVITY1 || `with ${totalGuilds.toLocaleString()} servers!`,
        client.config.bot.BOT_ACTIVITY2 || `with ${totalMembers.toLocaleString()} users!`,
        client.config.bot.BOT_ACTIVITY3 || `with ${totalChannels.toLocaleString()} channels!`,
      ];

      const randomActivity = activities[Math.floor(Math.random() * activities.length)];
      const activityObj: {
        name: string;
        type: number;
        url?: string;
        state?: string;
      } = {
        name: `${randomActivity}`,
        type: client.config.bot.BOT_ACTIVITY_TYPE,
        url: `${client.config.bot.STREAM_URL}`,
      };

      if (client.config.bot.BOT_ACTIVITY_TYPE === 4) {
        activityObj.state = `${client.config.bot.CUSTOM_STATUS}`;
      }

      client.user!.setPresence({
        activities: [activityObj],
        status: client.config.bot.BOT_STATUS as PresenceStatusData,
      });
    }, 10000);

    if (
      client.config.features.WebServer.TOPGG_VOTELOGS.Enable &&
      client.config.features.WebServer.TOPGG_VOTELOGS.TopGgToken &&
      client.config.features.WebServer.TOPGG_VOTELOGS.TopGgToken.length !== 0
    ) {
      const topgg = new TopggService(client);
      const res = await topgg.settingUp(String(client.user?.id));
      if (res) {
        client.topgg = topgg;
        client.topgg.startInterval();
      }
    }
  }
}
