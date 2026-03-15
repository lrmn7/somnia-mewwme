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
        fastify.register(WebsocketPlugin);
        fastify.register((fastify, _, done) => {
          new WebsocketRoute(client).main(fastify);
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
