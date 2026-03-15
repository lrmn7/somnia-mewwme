import cron from "node-cron";
import { Snowflake, EmbedBuilder } from "discord.js";
import { Manager } from "../manager.js";
import chalk from "chalk";

export enum TopggServiceEnum {
  ERROR,
  VOTED,
  UNVOTED,
}

export class TopggService {
  isTokenAvalible: boolean = false;
  botId?: string;
  url: string = "https://top.gg/api/v1";
  shardCount: number;
  private firstSuccessPushed: boolean = false;
  private lastTotalGuilds: number = 0;

  constructor(private client: Manager) {
    this.shardCount = client.clusterManager?.totalShards ?? 1;
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.client.config.features.WebServer.TOPGG_VOTELOGS.TopGgToken}`,
      "Content-Type": "application/json",
    };
  }

  public async settingUp(userId: Snowflake) {
    this.botId = userId;

    try {
      const res = await fetch(`${this.url}/projects/@me`, {
        headers: this.getHeaders(),
      });

      if (res.status === 200) {
        this.isTokenAvalible = true;
        this.client.logger.info(
          TopggService.name,
          chalk.italic(`Topgg service API v1 has been successfully set up!`)
        );
        return true;
      }

      this.client.logger.warn(
        TopggService.name,
        "There was a problem setting up the topgg service"
      );
      this.client.logger.warn(TopggService.name, await res.text());
      return false;
    } catch (err) {
      this.client.logger.error(TopggService.name, `Failed to setup Top.gg: ${err}`);
      return false;
    }
  }

  public async checkVote(userId: string): Promise<TopggServiceEnum> {
    if (!this.isTokenAvalible) {
      this.client.logger.error(
        TopggService.name,
        "TopGG service not setting up! check vote will always return false"
      );
      return TopggServiceEnum.ERROR;
    }

    try {
      const urlToFetch = `${this.url}/projects/@me/votes/${userId}?source=discord`;
      const res = await fetch(urlToFetch, { headers: this.getHeaders() });

      if (res.status === 200) {
        const data = await res.json().catch(() => null);

        if (data && data.expires_at) {
          const expiresAt = new Date(data.expires_at).getTime();
          const now = Date.now();

          if (now < expiresAt) {
            return TopggServiceEnum.VOTED;
          } else {
            return TopggServiceEnum.UNVOTED;
          }
        }

        return TopggServiceEnum.VOTED;
      } else if (res.status === 404) {
        return TopggServiceEnum.UNVOTED;
      }

      this.client.logger.error(
        TopggService.name,
        `There was a problem when fetching data from top.gg. Status: ${res.status}`
      );
      return TopggServiceEnum.ERROR;
    } catch (err) {
      this.client.logger.error(TopggService.name, `Check vote error: ${err}`);
      return TopggServiceEnum.ERROR;
    }
  }

  private async fetch(path: string) {
    return await fetch(this.url + path, {
      headers: this.getHeaders(),
    });
  }

  public async startInterval() {
    if (!this.botId || !this.isTokenAvalible) throw new Error("Topgg Statistic not setting up!");

    const clusterId = process.env.CLUSTER_ID ?? "1";

    if (clusterId !== "1") {
      this.client.logger.info(
        TopggService.name,
        `Skipping Top.gg stats on cluster ${clusterId} (handled by Cluster 1)`
      );
      return;
    }

    const webhookUrl = this.client.config.features.WebServer.TOPGG_VOTELOGS.WebhookURL;
    if (!webhookUrl) {
      this.client.logger.warn(
        TopggService.name,
        "TOPGG_WEBHOOK environment variable not set. Webhooks will not be sent."
      );
    }

    this.client.logger.info(
      TopggService.name,
      chalk.blue("⏳ Scheduling first push in 30 seconds...")
    );

    setTimeout(async () => {
      this.client.logger.info(
        TopggService.name,
        chalk.blue("🚀 Sending startup webhook and initial stats...")
      );
      await this.sendStartupWebhook();
      await this.pushStats();
    }, 30_000);

    cron.schedule("0 0 * * * *", async () => {
      await this.pushStats();
    });

    this.client.logger.info(
      TopggService.name,
      chalk.italic(
        `Topgg Statistic has been successfully set up on Cluster 1 (first push in 10 minutes)!`
      )
    );
  }

  private async sendStartupWebhook() {
    try {
      const webhookUrl = this.client.config.features.WebServer.TOPGG_VOTELOGS.WebhookURL;
      if (!webhookUrl) return;

      const { totalGuilds, perCluster } = await this.getMetricsFromClusterManager();

      if (perCluster.length === 0 || totalGuilds === 0) {
        this.client.logger.warn(
          TopggService.name,
          "No cluster metrics available yet, retrying in 30 seconds..."
        );
        setTimeout(() => this.sendStartupWebhook(), 30_000);
        return;
      }

      const startupEmbed = new EmbedBuilder()
        .setTitle("🚀 Mewwme Startup Status")
        .setColor(0xf1c40f)
        .setDescription(
          `Bot has started and initial metrics have been collected.\n\n**Total Servers:** ${totalGuilds.toLocaleString()}\n**Shards:** ${this.shardCount}\n**Clusters:** ${perCluster.length}`
        )
        .setTimestamp(new Date());

      const warningClusters = perCluster.filter((c) => c.guilds === 0);
      let warningEmbed: EmbedBuilder | null = null;
      if (warningClusters.length > 0) {
        warningEmbed = new EmbedBuilder()
          .setTitle("⚠️ Startup Cluster Warnings")
          .setColor(0xe67e22)
          .setDescription(
            warningClusters
              .map(
                (c) => `Cluster ${c.clusterId} has not reported any guilds yet (startup warmup).`
              )
              .join("\n")
          )
          .setTimestamp(new Date());
      }

      const embeds = [startupEmbed.toJSON()];
      if (warningEmbed) embeds.push(warningEmbed.toJSON());

      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds }),
      });

      this.client.logger.info(
        TopggService.name,
        chalk.blue("📡 Sent startup status to Discord webhook")
      );
    } catch (err) {
      this.client.logger.error(TopggService.name, `Failed to send startup webhook: ${err}`);
    }
  }

  private async pushStats() {
    try {
      const { totalGuilds, perCluster } = await this.getMetricsFromClusterManager();

      if (perCluster.every((c) => c.guilds === 0)) {
        this.client.logger.warn(
          TopggService.name,
          "⚠️ No metrics available from ANY cluster, retrying in 1 minute..."
        );
        setTimeout(() => this.pushStats(), 60_000);
        return;
      }
      const isSuccess = await this.updateStatisticCount(totalGuilds, this.shardCount);
      if (!isSuccess) {
        return;
      }

      const growth = this.lastTotalGuilds ? totalGuilds - this.lastTotalGuilds : 0;
      this.lastTotalGuilds = totalGuilds;

      this.client.logger.info(
        TopggService.name,
        chalk.green(
          `Pushed Top.gg stats: ${totalGuilds.toLocaleString()} servers across ${this.shardCount} shards (Δ ${growth >= 0 ? "+" : ""}${growth})`
        )
      );

      const webhookUrl = this.client.config.features.WebServer.TOPGG_VOTELOGS.WebhookURL;
      if (webhookUrl) {
        const mainEmbed = new EmbedBuilder()
          .setTitle("📊 Top.gg Stats Update")
          .setColor(0x5865f2)
          .addFields(
            {
              name: "🌍 Total Servers",
              value: totalGuilds.toLocaleString(),
              inline: true,
            },
            { name: "🔗 Shards", value: this.shardCount.toString(), inline: true },
            { name: "🗂️ Clusters", value: perCluster.length.toString(), inline: true },
            {
              name: "📈 Growth",
              value:
                growth === 0
                  ? "No change"
                  : `${growth > 0 ? "🟢 +" : "🔻 "}${growth.toLocaleString()} servers since last push`,
              inline: false,
            }
          )
          .setFooter({ text: `Last updated at ${new Date().toLocaleTimeString()}` })
          .setTimestamp(new Date());

        const clusterEmbed = new EmbedBuilder()
          .setTitle("🗂️ Cluster Breakdown")
          .setColor(0x3498db)
          .setDescription("Current per-cluster stats:")
          .addFields(
            perCluster.map((c) => ({
              name: `Cluster ${c.clusterId}`,
              value:
                c.guilds === 0
                  ? "⚠️ No data reported"
                  : `**Servers:** ${c.guilds.toLocaleString()}\n**Channels:** ${c.channels.toLocaleString()}\n**Uptime:** ${c.status}`,
              inline: true,
            }))
          )
          .setTimestamp(new Date());

        const warningClusters = perCluster.filter((c) => c.guilds === 0);
        let warningEmbed: EmbedBuilder | null = null;
        if (warningClusters.length > 0) {
          warningEmbed = new EmbedBuilder()
            .setTitle("⚠️ Cluster Warnings")
            .setColor(0xe67e22)
            .setDescription(
              warningClusters
                .map((c) => `Cluster ${c.clusterId} has not reported any guilds yet.`)
                .join("\n")
            )
            .setTimestamp(new Date());
        }

        const embeds = [mainEmbed.toJSON(), clusterEmbed.toJSON()];
        if (warningEmbed) embeds.push(warningEmbed.toJSON());

        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ embeds }),
        });
      }
    } catch (err) {
      this.client.logger.error(TopggService.name, `Failed to push stats to Top.gg: ${err}`);
    }
  }

  private async getMetricsFromClusterManager(): Promise<{
    totalGuilds: number;
    perCluster: any[];
  }> {
    if (!this.client.clusterManager) {
      const totalGuilds = this.client.guilds.cache.size;
      return {
        totalGuilds,
        perCluster: [
          {
            clusterId: 1,
            guilds: totalGuilds,
            channels: this.client.channels.cache.size,
            status: "healthy",
          },
        ],
      };
    }

    try {
      const res: any = await this.client.clusterManager.sendMaster("metrics_all", {});
      if (res?.response?.totalGuilds != null) {
        return {
          totalGuilds: res.response.totalGuilds,
          perCluster: res.response.perCluster ?? [],
        };
      }
    } catch (err) {
      this.client.logger.error(
        TopggService.name,
        `Failed to fetch cluster metrics via sendMaster: ${err}`
      );
    }

    const metrics = this.client.clusterManager.getClusterMetrics();
    return metrics;
  }

  public async updateStatisticCount(serverCount: number, shardCount: number): Promise<boolean> {
    if (!this.botId || !this.isTokenAvalible) return false;

    try {
      const res = await fetch(`https://top.gg/api/bots/stats`, {
        method: "POST",
        body: JSON.stringify({
          server_count: serverCount,
          shard_count: shardCount,
        }),
        headers: this.getHeaders(),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown Error");
        this.client.logger.warn(
          TopggService.name,
          `Failed to post stats. Status: ${res.status}, Message: ${errText}`
        );
        return false;
      }

      return true;
    } catch (err) {
      this.client.logger.error(TopggService.name, `Failed to post bot stats: ${err}`);
      return false;
    }
  }
}
