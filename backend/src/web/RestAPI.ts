import { Manager } from "../manager.js";
import Fastify from "fastify";
import WebsocketPlugin from "@fastify/websocket";
import { WebsocketRoute } from "./websocket.js";
import { PlayerRoute } from "./player.js";
import { getSearch } from "./route/getSearch.js";
import { getCommands } from "./route/getCommands.js";
import { getTopServers } from "./route/getTopServers.js";
import { getUserStats } from "./route/getUserStats.js";
import { getGuildStats } from "./route/getGuildStats.js";
import { getGlobalStats } from "./route/getGlobalStats.js";
import { getUserPlaylists } from "./route/getUserPlaylists.js";
import { postCreatePlaylist } from "./route/postCreatePlaylist.js";
import { deletePlaylist } from "./route/deletePlaylist.js";
import { postAddPlaylistTrack } from "./route/postAddPlaylistTrack.js";
import { deletePlaylistTrack } from "./route/deletePlaylistTrack.js";
import { postPlayPlaylist } from "./route/postPlayPlaylist.js";
import { postPlayPlaylistTrack } from "./route/postPlayPlaylistTrack.js";
import {
  getGuildSettings,
  patchGuildSettings,
  getAvailableLocales,
} from "./route/guildSettings.js";
import {
  getLastfmStatus,
  getLastfmLoginUrl,
  lastfmLogout,
  getGuildTextChannels,
} from "./route/externalServices.js";
import { getUserPremium } from "./route/getUserPremium.js";
import { postPremiumUserLegacy, postPremiumGuildLegacy } from "./route/adminLegacyPremium.js";
import dashboardPlugin from "./dashboard/DashboardPlugin.js";

export class RestAPI {
  app: Fastify.FastifyInstance;
  constructor(private client: Manager) {
    const dashUrl = client.config.features.RestAPI?.DashboardUrl ?? "";
    const redirectUri = client.config.features.RestAPI?.DiscordRedirectUri ?? "";
    const isProduction = process.env["NODE_ENV"] === "production";
    const needsTrustProxy =
      isProduction || dashUrl.startsWith("https://") || redirectUri.startsWith("https://");

    this.app = Fastify({
      logger: false,
      trustProxy: needsTrustProxy,
    });
    client.logger.info(
      RestAPI.name,
      `trustProxy=${needsTrustProxy} (NODE_ENV=${process.env["NODE_ENV"] ?? "unset"}, dashUrl=${dashUrl || "unset"})`
    );
    this._init().catch((err) => client.logger.error(RestAPI.name, String(err)));
  }

  private async _init(): Promise<void> {
    const client = this.client;

    await this.app.register(dashboardPlugin, { client });

    this.app.register(
      async (fastify) => {
        await fastify.register(WebsocketPlugin);
        new WebsocketRoute(client).main(fastify);
      },
      { prefix: "v1" }
    );

    this.app.register(
      (fastify, _, done) => {
        fastify.addHook("preValidation", function hook(req, reply, done) {
          if (!req.headers["authorization"]) {
            reply.code(400);
            reply.send(JSON.stringify({ error: "Missing Authorization" }));
            return done();
          }
          if (req.headers["authorization"] !== client.config.features.RestAPI.auth) {
            reply.code(401);
            reply.send(JSON.stringify({ error: "Authorization failed" }));
            return done();
          }
          if (
            client.config.features.RestAPI.whitelist.length !== 0 &&
            !client.config.features.RestAPI.whitelist.includes(req.hostname)
          ) {
            reply.code(401);
            reply.send(JSON.stringify({ error: "You're not in whitelist" }));
            return done();
          }
          done();
        });
        fastify.register(
          (fastify, _, done) => {
            new PlayerRoute(client).main(fastify);
            done();
          },
          { prefix: "players" }
        );
        fastify.get("/search", (req, res) => getSearch(client, req, res));
        fastify.get("/commands", (req, res) => getCommands(client, req, res));
        fastify.get("/top-servers", (req, res) => getTopServers(client, req, res));
        fastify.get("/user/:userId/stats", (req, res) => getUserStats(client, req, res));
        fastify.get("/guild/:guildId/stats", (req, res) => getGuildStats(client, req, res));
        fastify.get("/global-stats", (req, res) => getGlobalStats(client, req, res));

        // System status (shard/cluster monitoring)
        fastify.get("/system-status", async (_req, res) => {
          const memUsage = process.memoryUsage();
          const uptime = process.uptime();

          if (client.clusterManager) {
            // Clustered mode: fetch aggregated metrics from primary process via IPC
            try {
              const ipcRes = await client.clusterManager.sendMaster("metrics_all");
              const r = ipcRes.response as any;
              return res.send({
                mode: "clustered",
                totalShards: r.totalShards ?? client.clusterManager.totalShards,
                totalClusters: r.totalClusters ?? client.clusterManager.resolvedClusters,
                totalGuilds: r.totalGuilds ?? 0,
                totalUsers: r.totalUsers ?? 0,
                totalStreams: r.perCluster?.reduce((s: number, c: any) => s + (c.streams ?? 0), 0) ?? 0,
                totalMemory: r.perCluster?.reduce((s: number, c: any) => s + (c.memoryUsage ?? 0), 0) ?? 0,
                uptime: Math.floor(uptime),
                clusters: (r.perCluster ?? []).map((c: any) => ({
                  id: c.clusterId,
                  guilds: c.guilds ?? 0,
                  users: c.users ?? 0,
                  channels: c.channels ?? 0,
                  memoryUsage: c.memoryUsage ?? 0,
                  streams: c.streams ?? 0,
                  status: c.status ?? "healthy",
                  shards: c.shards ?? [],
                  updatedAt: c.updatedAt ?? Date.now(),
                })),
              });
            } catch {
              // IPC failed, fall back to local data
              return res.status(503).send({ error: "Cluster metrics unavailable" });
            }
          } else {
            // Single process mode
            const shardData = [];
            for (const [shardId, shard] of client.ws.shards) {
              const guildCount = client.guilds.cache.filter(g => g.shardId === shardId).size;
              const userCount = client.guilds.cache.filter(g => g.shardId === shardId).reduce((acc, g) => acc + g.memberCount, 0);
              shardData.push({
                shardId,
                clusterId: 0,
                status: shard.status === 0 ? "ready" : "connected",
                guilds: guildCount,
                users: userCount,
                ping: shard.ping,
                updatedAt: Date.now(),
              });
            }

            return res.send({
              mode: "single",
              totalShards: client.ws.shards.size,
              totalClusters: 1,
              totalGuilds: client.guilds.cache.size,
              totalUsers: client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0),
              totalStreams: client.mewslink?.players?.size ?? 0,
              totalMemory: Math.round(memUsage.rss / 1024 / 1024),
              uptime: Math.floor(uptime),
              clusters: [{
                id: 0,
                guilds: client.guilds.cache.size,
                users: client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0),
                channels: client.channels.cache.size,
                memoryUsage: Math.round(memUsage.rss / 1024 / 1024),
                streams: client.mewslink?.players?.size ?? 0,
                status: "healthy",
                shards: shardData,
                updatedAt: Date.now(),
              }],
            });
          }
        });
        fastify.get("/playlists/:userId", (req, res) => getUserPlaylists(client, req, res));
        fastify.post("/playlists", (req, res) => postCreatePlaylist(client, req, res));
        fastify.delete("/playlists/:id", (req, res) => deletePlaylist(client, req, res));
        fastify.post("/playlists/:id/tracks", (req, res) => postAddPlaylistTrack(client, req, res));
        fastify.delete("/playlists/:id/tracks/:index", (req, res) =>
          deletePlaylistTrack(client, req, res)
        );
        fastify.post("/playlists/:id/play", (req, res) => postPlayPlaylist(client, req, res));
        fastify.post("/playlists/:id/play/:index", (req, res) =>
          postPlayPlaylistTrack(client, req, res)
        );
        // Guild settings routes
        fastify.get("/guild/:guildId/settings", (req, res) => getGuildSettings(client, req, res));
        fastify.patch("/guild/:guildId/settings", (req, res) =>
          patchGuildSettings(client, req, res)
        );
        fastify.get("/guild/:guildId/settings/locales", (req, res) =>
          getAvailableLocales(client, req, res)
        );
        fastify.get("/guild/:guildId/channels", (req, res) =>
          getGuildTextChannels(client, req, res)
        );
        // External services — Last.fm / Spotify (user-scoped)
        fastify.get("/user/:userId/lastfm", (req, res) => getLastfmStatus(client, req, res));
        fastify.get("/user/:userId/lastfm/login-url", (req, res) =>
          getLastfmLoginUrl(client, req, res)
        );
        fastify.delete("/user/:userId/lastfm", (req, res) => lastfmLogout(client, req, res));
        // User premium status
        fastify.get("/user/:userId/premium", (req, res) => getUserPremium(client, req, res));
        // Admin Legacy Premium
        fastify.post("/admin/premium/user", (req, res) => postPremiumUserLegacy(client, req, res));
        fastify.post("/admin/premium/guild", (req, res) => postPremiumGuildLegacy(client, req, res));
        done();
      },
      { prefix: "v1" }
    );

    this.app.get("/mewwme", (request, reply) => {
      const response = [
        "Mewwme's says maybe there's something more useful than this 😅",
        "Be careful, Mewwme's might be addictive 😜",
        "No, this isn't the place for Mewwme's cosplay 😅",
        "Smile a bit, Mewwme's doesn't like serious faces 😆",
        "Mewwme's thinks you should check something else? 🧐",
        "Let's focus on something more productive with Mewwme's help!",
        "This Mewwme's collection doesn't exist, but keep up the spirit! 💪",
        "No Mewwme's here, but you can still smile 😊",
        "Don't worry, Mewwme's aren't everything 😎",
      ];
      client.logger.info("HealthRouterService", `${request.method} ${request.routeOptions.url}`);
      reply.send({ mewwme: response[Math.floor(Math.random() * response.length)] });
    });

    const port = client.config.features.RestAPI.port;

    this.app
      .listen({ port, host: "0.0.0.0" })
      .then(() => client.logger.info(RestAPI.name, `Server running at port ${port}`))
      .catch((err) => {
        if (client.config.bot.TOKEN.length > 1) {
          client.config.features.RestAPI.port = client.config.features.RestAPI.port + 1;
          const newPort = client.config.features.RestAPI.port;
          return this.app
            .listen({ port: newPort, host: "0.0.0.0" })
            .then(() => client.logger.info(RestAPI.name, `Server running at port ${newPort}`))
            .catch((err) => client.logger.error(RestAPI.name, err));
        } else {
          client.logger.error(RestAPI.name, err);
        }
      });
  }
}
