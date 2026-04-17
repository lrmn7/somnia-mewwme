import cluster, { Worker } from "node:cluster";
import process from "node:process";
import os from "node:os";
import { bootBot } from "./bootloader.js";
import { Collection } from "../structures/Collection.js";
import readdirRecursive from "recursive-readdir";
import { resolve, join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { EmbedBuilder } from "discord.js";
import fetch from "node-fetch";
import { ClusterCommand, WorkerResponse, WorkerMessage } from "../@types/Cluster.js";
import { ConfigDataService } from "../services/ConfigDataService.js";
const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ClusterManagerOptions {
  shardsPerClusters: number | "auto";
  totalClusters: number | "auto";
}

export type ShardStatus = "connecting" | "connected" | "disconnected" | "reconnecting" | "ready";

export type ShardInfo = {
  shardId: number;
  clusterId: number;
  status: ShardStatus;
  guilds: number;
  users: number;
  ping: number;
  updatedAt: number;
};

export type ClusterMetrics = {
  clusterId: number;
  guilds: number;
  channels: number;
  users: number;
  memoryUsage: number;
  streams: number;
  shards: ShardInfo[];
  updatedAt: number;
  status?: "healthy" | "stale" | "restarting" | "inactive";
};

export class ClusterManager {
  public readonly workerPID: Collection<Worker> = new Collection<Worker>();
  public readonly commands: Collection<ClusterCommand> = new Collection<ClusterCommand>();
  public readonly clusterShardList: Record<string, number[]> = {};
  public totalShards: number = 0;
  public resolvedClusters: number = 1;
  public resolvedShardsPerCluster: number = 1;
  public workerMetrics: Map<number, ClusterMetrics> = new Map();
  public readonly options: ClusterManagerOptions;

  private lastHealthEmbed: EmbedBuilder | null = null;
  private startupTime: Map<number, number> = new Map();
  private restartTime: Map<number, number> = new Map();
  private healthReportInterval: NodeJS.Timeout | null = null;
  private watchdogInterval: NodeJS.Timeout | null = null;
  private readonly STARTUP_GRACE_PERIOD = 300_000; // 5 minutes
  private readonly STALE_THRESHOLD = 90_000; // 90 seconds
  private readonly METRICS_TIMEOUT = 300_000; // 5 minutes
  private readonly RESTART_COOLDOWN = 60_000; // 1 minute between restarts
  private readonly MAX_RESTART_ATTEMPTS = 3;
  private restartAttempts: Map<number, number> = new Map();
  private lastWatchdogLog: number = 0;
  private readonly WATCHDOG_LOG_INTERVAL = 60_000;

  constructor(options: ClusterManagerOptions) {
    this.options = options;
  }

  private async fetchRecommendedShards(): Promise<number> {
    const token = new ConfigDataService().data.bot.TOKEN;
    try {
      const res = await fetch("https://discord.com/api/v10/gateway/bot", {
        headers: { Authorization: `Bot ${token}` },
      });
      if (!res.ok) {
        this.log("WARN", `Failed to fetch recommended shards (HTTP ${res.status}), defaulting to 1`);
        return 1;
      }
      const data = (await res.json()) as { shards: number };
      this.log("INFO", `Discord recommends ${data.shards} shard(s)`);
      return data.shards;
    } catch (err) {
      this.log("ERROR", `Failed to fetch gateway/bot: ${err}`);
      return 1;
    }
  }

  private calculateClusters(totalShards: number): number {
    const cpuCores = os.cpus().length;
    const maxClusters = Math.min(cpuCores, totalShards);
    if (totalShards <= 3) return 1;
    return Math.max(2, Math.min(Math.ceil(cpuCores / 2), maxClusters));
  }

  public async start() {
    if (cluster.isPrimary) {
      const recommendedShards = await this.fetchRecommendedShards();

      let resolvedTotalClusters: number;
      let resolvedShardsPerCluster: number;

      if (this.options.totalClusters === "auto" && this.options.shardsPerClusters === "auto") {
        this.totalShards = recommendedShards;
        resolvedTotalClusters = this.calculateClusters(this.totalShards);
        resolvedShardsPerCluster = Math.ceil(this.totalShards / resolvedTotalClusters);
      } else if (this.options.totalClusters === "auto") {
        resolvedShardsPerCluster = this.options.shardsPerClusters as number;
        this.totalShards = recommendedShards;
        resolvedTotalClusters = Math.ceil(this.totalShards / resolvedShardsPerCluster);
      } else if (this.options.shardsPerClusters === "auto") {
        resolvedTotalClusters = this.options.totalClusters as number;
        this.totalShards = recommendedShards;
        resolvedShardsPerCluster = Math.ceil(this.totalShards / resolvedTotalClusters);
      } else {
        resolvedTotalClusters = this.options.totalClusters;
        resolvedShardsPerCluster = this.options.shardsPerClusters;
        this.totalShards = resolvedTotalClusters * resolvedShardsPerCluster;
      }

      this.resolvedClusters = resolvedTotalClusters;
      this.resolvedShardsPerCluster = resolvedShardsPerCluster;

      const shardArrayID = this.arrayRange(0, this.totalShards - 1, 1);
      this.arrayChunk<number>(shardArrayID, resolvedShardsPerCluster).forEach(
        (value, index) => {
          this.clusterShardList[String(index + 1)] = value;
        }
      );

      this.log("INFO", `CPU Cores: ${os.cpus().length}`);
      this.log("INFO", `Total Shards: ${this.totalShards} (Discord recommended: ${recommendedShards})`);
      this.log("INFO", `Total Clusters: ${resolvedTotalClusters}, Shards/Cluster: ${resolvedShardsPerCluster}`);
      for (const [cid, shards] of Object.entries(this.clusterShardList)) {
        this.log("INFO", `  Cluster ${cid} → Shards [${shards.join(", ")}]`);
      }

      this.log("INFO", `Primary process ${process.pid} is running`);
      await this.commandLoader();

      cluster.on("message", async (worker, message) => {
        try {
          const jsonMsg = JSON.parse(message as unknown as string);

          if (jsonMsg.cmd === "heartbeat") {
            const clusterId = worker.id;
            const metrics = this.workerMetrics.get(clusterId) ?? {
              clusterId,
              guilds: 0,
              channels: 0,
              users: 0,
              memoryUsage: 0,
              streams: 0,
              shards: [],
              updatedAt: Date.now(),
              status: "healthy",
            };
            metrics.updatedAt = jsonMsg.ts ?? Date.now();
            metrics.status = "healthy";
            this.workerMetrics.set(clusterId, metrics);
            return;
          }

          if (jsonMsg.cmd === "metrics_update") {
            const clusterId = worker.id;
            const args = jsonMsg.args ?? {};
            const metrics: ClusterMetrics = {
              clusterId,
              guilds: args.guilds ?? 0,
              channels: args.channels ?? 0,
              users: args.users ?? 0,
              memoryUsage: args.memoryUsage ?? 0,
              streams: args.streams ?? 0,
              shards: args.shards ?? [],
              updatedAt: Date.now(),
              status: "healthy",
            };
            this.workerMetrics.set(clusterId, metrics);
            return;
          }

          const command = this.commands.get(jsonMsg.cmd);
          if (!command) {
            return worker.send(
              JSON.stringify({ error: { code: 404, message: "Command not found!" } })
            );
          }
          const res = await command.execute(this, worker, jsonMsg as WorkerMessage);
          worker.send(JSON.stringify(res));
        } catch (err) {
          this.log("ERROR", `Failed to handle message: ${err}`);
        }
      });

      cluster.on("exit", (worker) => {
        const clusterId = worker.id;
        const shardIds = this.clusterShardList[String(clusterId)];
        const restarts = this.restartAttempts.get(clusterId) ?? 0;

        if (restarts >= this.MAX_RESTART_ATTEMPTS) {
          this.log(
            "WARN",
            `Worker ${worker.process.pid} / cluster ${clusterId} exceeded max restart attempts (${restarts}). Marking as INACTIVE.`
          );
          const metrics = this.workerMetrics.get(clusterId);
          if (metrics) {
            metrics.status = "inactive";
            metrics.updatedAt = Date.now();
          }
          return;
        }

        const lastRestart = this.restartTime.get(clusterId) ?? 0;
        const timeSinceLastRestart = Date.now() - lastRestart;
        if (timeSinceLastRestart < this.RESTART_COOLDOWN) {
          this.log(
            "WARN",
            `Worker ${worker.process.pid} / cluster ${clusterId} died, cooldown active. Waiting...`
          );
          const metrics = this.workerMetrics.get(clusterId);
          if (metrics) {
            metrics.status = "restarting";
            metrics.updatedAt = Date.now();
          }
          setTimeout(() => {
            this.respawnWorker(clusterId, shardIds);
          }, this.RESTART_COOLDOWN - timeSinceLastRestart);
          return;
        }

        this.respawnWorker(clusterId, shardIds);
      });

      cluster.on("fork", (worker) => {
        const clusterId = worker.id;
        this.startupTime.set(worker.id, Date.now());
        this.restartTime.set(clusterId, Date.now());
        this.restartAttempts.set(clusterId, (this.restartAttempts.get(clusterId) ?? 0) + 1);

        if (!this.workerMetrics.has(clusterId)) {
          this.workerMetrics.set(clusterId, {
            clusterId,
            guilds: 0,
            channels: 0,
            users: 0,
            memoryUsage: 0,
            streams: 0,
            shards: [],
            updatedAt: Date.now(),
            status: "restarting",
          });
        }

        this.log(
          "INFO",
          `Worker ${worker.id} forked, granting ${this.STARTUP_GRACE_PERIOD / 1000}s startup grace period`
        );
      });

      for (let i = 0; i < this.resolvedClusters; i++) {
        cluster.fork({
          CLUSTER_ID: String(i + 1),
          SHARD_IDS: JSON.stringify(this.clusterShardList[String(i + 1)]),
          TOTAL_SHARDS: String(this.totalShards),
        });
      }

      this.watchdogInterval = setInterval(() => {
        const now = Date.now();
        const shouldLog = now - this.lastWatchdogLog > this.WATCHDOG_LOG_INTERVAL;

        for (const [wid, m] of this.workerMetrics) {
          const firstSpawn = this.startupTime.get(wid) ?? now;
          const aliveFor = now - firstSpawn;

          if (aliveFor < this.STARTUP_GRACE_PERIOD) {
            m.status = "restarting";
            m.updatedAt = now;
            continue;
          }

          const w = this.workerPID.get(String(wid));
          if (w && w.isDead()) {
            m.status = "restarting";
            m.updatedAt = now;
            continue;
          }

          const timeSinceUpdate = now - m.updatedAt;
          if (timeSinceUpdate > this.METRICS_TIMEOUT) {
            this.log("WARN", `Cluster ${wid} unresponsive for >5m. Force restarting...`);
            if (w && !w.isDead()) {
              w.kill("SIGKILL");
            }
            m.status = "restarting";
            m.updatedAt = now;
          } else if (timeSinceUpdate > this.STALE_THRESHOLD) {
            m.status = "stale";
          } else {
            m.status = "healthy";
          }
        }

        if (shouldLog) {
          this.lastWatchdogLog = now;
          this.log(
            "DEBUG",
            `Watchdog check complete - monitoring ${this.workerMetrics.size} workers`
          );
        }
      }, 30_000);

      setTimeout(() => this.startHealthReporter(), 15_000);
    } else {
      const workerId = String(cluster.worker!.id);
      const shardIds: number[] = JSON.parse(process.env.SHARD_IDS ?? "[]");
      this.clusterShardList[workerId] = shardIds;
      this.totalShards = Number(process.env.TOTAL_SHARDS ?? shardIds.length);

      const client = bootBot(this);
      this.log("INFO", `Worker ${process.pid} / ${cluster.worker!.id} started`);
      setInterval(() => {
        if (process.send) {
          process.send(JSON.stringify({ cmd: "heartbeat", ts: Date.now() }));
        }
      }, 30_000);
      const sendMetrics = () => {
        if (!client || !client.isReady() || !process.send) return;
        try {
          const shardData: ShardInfo[] = [];
          for (const [shardId, shard] of client.ws.shards) {
            const guildCount = client.guilds.cache.filter(g => g.shardId === shardId).size;
            const userCount = client.guilds.cache.filter(g => g.shardId === shardId).reduce((acc, g) => acc + g.memberCount, 0);
            shardData.push({
              shardId,
              clusterId: cluster.worker!.id,
              status: shard.status === 0 ? "ready" : shard.status === 1 ? "connecting" : shard.status === 5 ? "reconnecting" : shard.status === 3 ? "disconnected" : "connected",
              guilds: guildCount,
              users: userCount,
              ping: shard.ping,
              updatedAt: Date.now(),
            });
          }

          const totalGuilds = client.guilds.cache.size;
          const totalUsers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
          const memUsage = process.memoryUsage();
          const streams = client.mewslink?.players?.size ?? 0;

          process.send(JSON.stringify({
            cmd: "metrics_update",
            args: {
              guilds: totalGuilds,
              channels: client.channels.cache.size,
              users: totalUsers,
              memoryUsage: Math.round(memUsage.rss / 1024 / 1024),
              streams,
              shards: shardData,
            },
          }));
        } catch { /* ignore errors during metrics collection */ }
      };

      client.once("ready", () => {
        sendMetrics();
        setInterval(sendMetrics, 30_000);
      });
    }
  }

  private respawnWorker(clusterId: number, shardIds: number[]) {
    this.log(
      "WARN",
      `Worker cluster ${clusterId} died, respawning... (attempt ${this.restartAttempts.get(clusterId) ?? 1})`
    );
    const newWorker = cluster.fork({
      CLUSTER_ID: String(clusterId),
      SHARD_IDS: JSON.stringify(shardIds),
      TOTAL_SHARDS: String(this.totalShards),
    });
    this.workerPID.set(String(newWorker.id), newWorker);
  }

  private startHealthReporter() {
    this.sendHealthReport();
    this.healthReportInterval = setInterval(() => this.sendHealthReport(), 3_600_000); // 1 hour
  }

  public getShard(clusterId: number) {
    return this.clusterShardList[String(clusterId)];
  }

  public getClusterId(worker: Worker): number {
    return worker.id;
  }

  public async sendMaster(
    cmd: string,
    args: Record<string, unknown> = {}
  ): Promise<WorkerResponse> {
    return new Promise((resolve, reject) => {
      if (!cluster.worker) return reject("Not a worker");
      const fullData = { cmd, args };
      const listener = (message: any) => {
        try {
          const jsonMsg = JSON.parse(message);
          if (jsonMsg.error) return reject(jsonMsg);
          resolve(jsonMsg);
          cluster.worker?.off("message", listener);
        } catch {
          reject(null);
        }
      };
      cluster.worker.on("message", listener);
      cluster.worker.send(JSON.stringify(fullData));
    });
  }

  public getClusterMetrics(): { totalGuilds: number; perCluster: ClusterMetrics[] } {
    const perCluster = Array.from(this.workerMetrics.values()).sort(
      (a, b) => a.clusterId - b.clusterId
    );
    const totalGuilds = perCluster.reduce((sum, c) => sum + c.guilds, 0);
    return { totalGuilds, perCluster };
  }

  public getLastHealthEmbed(): EmbedBuilder | null {
    return this.lastHealthEmbed;
  }

  public setLastHealthEmbed(embed: EmbedBuilder) {
    this.lastHealthEmbed = embed;
  }

  public async sendHealthReport() {
    const { totalGuilds, perCluster } = this.getClusterMetrics();
    const lines = perCluster.map((c) => {
      let status = "❌ Inactive";
      if (c.status === "inactive") {
        status = "❌ Inactive";
      } else if (c.status === "restarting") {
        status = "🔄 Restarting";
      } else if (c.status === "stale") {
        status = "⚠️ Stale";
      } else {
        status = "✅ Healthy";
      }

      return `• Cluster ${c.clusterId} → ${c.guilds.toLocaleString()} servers, ${c.channels.toLocaleString()} channels (last update: <t:${Math.floor(
        c.updatedAt / 1000
      )}:R>) ${status}`;
    });

    const embed = new EmbedBuilder()
      .setTitle("Cluster Health Report")
      .setDescription(lines.length > 0 ? lines.join("\n") : "No cluster metrics available yet.")
      .addFields(
        { name: "Total Servers", value: totalGuilds.toLocaleString(), inline: true },
        { name: "Total Clusters", value: String(this.resolvedClusters), inline: true },
        { name: "Total Shards", value: String(this.totalShards), inline: true }
      )
      .setColor(0x0099ff)
      .setTimestamp(new Date());

    this.setLastHealthEmbed(embed);

    const webhookUrl = new ConfigDataService().data.features.WebServer.TOPGG_VOTELOGS.WebhookURL;
    if (!webhookUrl) return;

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed.toJSON()] }),
      });

      if (!response.ok) {
        this.log("WARN", `Webhook returned status ${response.status}`);
      } else {
        this.log("INFO", "Health report sent to webhook");
      }
    } catch (err) {
      this.log("ERROR", `Failed to send webhook: ${err}`);
    }
  }

  public shutdown() {
    if (this.healthReportInterval) clearInterval(this.healthReportInterval);
    if (this.watchdogInterval) clearInterval(this.watchdogInterval);
  }

  protected async commandLoader() {
    const eventsPath = resolve(join(__dirname, "commands"));
    const eventsFile = await readdirRecursive(eventsPath);
    for await (const p of eventsFile) await this.registerCommand(p);
    this.log("INFO", `Cluster commands loaded successfully`);
  }

  protected async registerCommand(path: string) {
    const command = new (await import(pathToFileURL(path).toString())).default() as ClusterCommand;
    if (!command.execute) {
      return this.log(
        "WARN",
        `Cluster command [${(command as any).name}] missing execute, skipping...`
      );
    }
    this.commands.set((command as any).name, command);
  }

  protected arrayRange(start: number, stop: number, step: number) {
    return Array.from({ length: (stop - start) / step + 1 }, (_, index) => start + index * step);
  }

  protected arrayChunk<D = unknown>(array: D[], chunkSize: number): D[][] {
    return array.reduce((chunks, item, index) => {
      const chunkIndex = Math.floor(index / chunkSize);
      if (!chunks[chunkIndex]) chunks[chunkIndex] = []; // ✅ FIXED
      chunks[chunkIndex].push(item);
      return chunks;
    }, [] as D[][]);
  }

  public log(level: string, msg: string, pad: number = 9) {
    const date = new Date().toISOString();
    const prettyLevel = level.toUpperCase().padEnd(pad);
    const prettyClass = "ClusterManager".padEnd(28);

    const colors = {
      INFO: "\x1b[36m",
      WARN: "\x1b[33m",
      ERROR: "\x1b[31m",
      DEBUG: "\x1b[35m",
      reset: "\x1b[0m",
    };

    const color = (colors as any)[level] || colors.INFO;
    if (level === "DEBUG") return;

    console.log(`${color}${date} - ${prettyLevel} - ${prettyClass} - ${msg}${colors.reset}`);
  }
}
