import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import fastifyCors from "@fastify/cors";
import { Server as SocketIOServer } from "socket.io";
import axios from "axios";
import { randomBytes } from "crypto";
import type { Manager } from "../../manager.js";
import { createDiscordOAuth } from "./DiscordOAuth.js";
import { createUserProfileService } from "./UserProfileService.js";
import { createLikedSongsService, type LikedTrack } from "./LikedSongsService.js";
import { createBotWsService } from "./BotWsService.js";
import { SocketBridge } from "./SocketBridge.js";
import { createSpotifyTopChartService } from "../../services/SpotifyTopChartService.js";
import { createAiChatService } from "./AiChatService.js";
import { createAiChatHistoryDb } from "./AiChatHistoryDb.js";
import { buildDashboardUserPerm, hasFeatureAccess, getDashboardAccessConfig } from "../route/resolveDashboardAccess.js";
import {
  connectWallet,
  disconnectWallet,
  getWalletStatus,
  getGuildTipContract,
  registerGuildTipContract,
  getGuildTips,
  getCommunityServers,
  getCommunityServerDetail,
  getUserSubscriptions,
  verifyAndClaimSubscription,
  getWeb3PremiumStatus,
  activateGuildPremium,
  deactivateGuildPremium,
  getGuildWeb3Overview,
  getAdminPlatformStats,
  getCommunityServerInvite,
} from "../route/web3Routes.js";

declare module "@fastify/session" {
  interface FastifySessionObject {
    user?: {
      id: string;
      username: string;
      discriminator: string;
      avatar: string | null;
      email?: string;
      global_name?: string | null;
    };
    accessToken?: string;
    guilds?: Array<{
      id: string;
      name: string;
      icon: string | null;
      permissions?: string;
      permissions_new?: string;
      owner: boolean;
    }>;
    guildsFetchRetryAt?: number;
    oauthState?: string;
  }
}

async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!req.session.user) {
    reply.code(401).send({ error: "Unauthorized — please log in." });
  }
}

const dashboardPlugin: FastifyPluginAsync<{ client: Manager }> = async (fastify, opts) => {
  const { client } = opts;

  function proxyError(err: unknown, reply: FastifyReply, fallback: string): void {
    const e = err as any;
    if (e?.response) {
      if (e.response.status >= 500) {
        client.logger.warn(
          "proxyError",
          `${fallback} — upstream ${e.response.status}: ${JSON.stringify(e.response.data).slice(0, 200)}`
        );
      }
      reply.code(e.response.status).send(e.response.data);
    } else {
      const msg = e?.code ? `${e.code}: ${e.message}` : (e?.message ?? String(err));
      client.logger.error("proxyError", `${fallback} — network error: ${msg}`);
      reply.code(500).send({ error: fallback });
    }
  }
  const port = client.config.features.RestAPI.port;

  const LikedSongsService = createLikedSongsService(client);
  const UserProfileService = createUserProfileService(client);
  const SpotifyTopChart = createSpotifyTopChartService(client);
  const apiToken = client.config.features.RestAPI.auth;
  if (!apiToken) {
    client.logger.warn(
      "DashboardPlugin",
      "RestAPI.auth is not set in config — WebSocket bridge will not start"
    );
  }

  const SESSION_SECRET =
    client.config.features.RestAPI?.SessionSecret || "changeme-set-SESSION_SECRET-in-env";
  const FRONTEND_URL = client.config.features.RestAPI?.DashboardUrl || "http://localhost:3000";
  const CLIENT_ID = client.config.features.RestAPI?.DiscordClientId || "";
  const CLIENT_SECRET = client.config.features.RestAPI?.DiscordClientSecret || "";
  const REDIRECT_URI =
    client.config.features.RestAPI?.DiscordRedirectUri ||
    `http://localhost:${port}/auth/discord/callback`;

  const discordOAuth = createDiscordOAuth({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: REDIRECT_URI,
    botToken: client.config.bot.TOKEN,
  });

  const apiHostname = new URL(FRONTEND_URL).hostname;
  const botApi = axios.create({
    baseURL: `http://127.0.0.1:${port}/v1`,
    headers: { Authorization: apiToken, Host: apiHostname },
    timeout: 15_000,
  });

  // AI Chat artwork: try free APIs first (Deezer, iTunes), fallback to bot search (Spotify)
  const aiSearchFn = async (query: string): Promise<{ thumbnail: string | null } | null> => {
    // 1. Deezer (free, no key)
    try {
      const { data } = await axios.get("https://api.deezer.com/search", {
        params: { q: query, limit: 1 },
        timeout: 4_000,
      });
      const track = data?.data?.[0];
      const thumb = track?.album?.cover_big || track?.album?.cover_medium || track?.album?.cover;
      if (thumb) return { thumbnail: thumb };
    } catch { /* continue */ }

    // 2. iTunes / Apple Music (free, no key)
    try {
      const { data } = await axios.get("https://itunes.apple.com/search", {
        params: { term: query, media: "music", limit: 1 },
        timeout: 4_000,
      });
      const result = data?.results?.[0];
      // Replace 100x100 with 600x600 for better quality
      const thumb = result?.artworkUrl100?.replace("100x100", "600x600") || result?.artworkUrl60;
      if (thumb) return { thumbnail: thumb };
    } catch { /* continue */ }

    // 3. Bot search API (Spotify — may have rate limits)
    try {
      const { data } = await botApi.get("/search", {
        params: { identifier: query, source: "spotify" },
        timeout: 5_000,
      });
      const track = data?.tracks?.[0];
      if (track?.thumbnail) return { thumbnail: track.thumbnail };
    } catch { /* continue */ }

    return null;
  };
  const AiChatService = createAiChatService(client, aiSearchFn);
  let _aiChatHistoryDb: ReturnType<typeof createAiChatHistoryDb> | undefined;
  const getAiChatHistoryDb = () => {
    if (!_aiChatHistoryDb) _aiChatHistoryDb = createAiChatHistoryDb(client.db.AiChatHistory);
    return _aiChatHistoryDb;
  };

  const isProd = process.env["NODE_ENV"] === "production";
  const frontendHostname = (() => {
    try {
      return new URL(FRONTEND_URL).hostname;
    } catch {
      return "";
    }
  })();
  const isCrossSite =
    frontendHostname !== "localhost" && frontendHostname !== "127.0.0.1" && isProd;

  client.logger.info(
    "DashboardPlugin",
    `isProd=${isProd} | crossSite=${isCrossSite} | NODE_ENV=${process.env["NODE_ENV"] ?? "unset"} | FRONTEND_URL=${FRONTEND_URL} | REDIRECT_URI=${REDIRECT_URI}`
  );

  const allowedOrigins = new Set<string>([FRONTEND_URL]);
  if (!isProd) {
    allowedOrigins.add("http://localhost:3000");
    allowedOrigins.add("http://localhost:3001");
  }

  fastify.register(fastifyCors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.has(origin)) return cb(null, true);
      // client.logger.warn("DashboardPlugin", `CORS rejected origin: ${origin}`);
      cb(new Error("CORS: Not allowed"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  fastify.register(fastifyCookie);

  fastify.register(fastifySession, {
    secret: SESSION_SECRET,
    saveUninitialized: false,
    cookieName: "mewwme-dash.sid",
    cookie: {
      secure: isProd,
      httpOnly: true,
      sameSite: isCrossSite ? ("none" as const) : ("lax" as const),
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    },
  });

  fastify.addHook("onReady", async () => {
    const io = new SocketIOServer(fastify.server, {
      cors: { origin: FRONTEND_URL, credentials: true },
    });

    client.dashboardEmit = (guildId, event, data) => io.to(`guild:${guildId}`).emit(event, data);

    if (apiToken) {
      const botWs = createBotWsService(`ws://127.0.0.1:${port}`, apiToken);
      new SocketBridge(io, botWs, botApi);
      client.logger.info("DashboardPlugin", "Socket.io attached to HTTP server");
    } else {
      client.logger.warn("DashboardPlugin", "Skipping Socket.io bridge — RestAPI.auth is missing");
    }
  });

  fastify.get("/auth/discord", async (req, reply) => {
    const state = randomBytes(16).toString("hex");
    req.session.oauthState = state;
    await req.session.save();
    return reply.redirect(discordOAuth.getAuthUrl(state));
  });

  fastify.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    "/auth/discord/callback",
    async (req, reply) => {
      const { code, state, error } = req.query;

      if (error) {
        return reply.redirect(`${FRONTEND_URL}/?error=${encodeURIComponent(error)}`);
      }
      if (!state || state !== req.session.oauthState) {
        return reply.code(403).send({ error: "Invalid OAuth state." });
      }
      delete req.session.oauthState;

      if (!code) return reply.code(400).send({ error: "Missing authorization code." });

      try {
        const accessToken = await discordOAuth.exchangeCode(code);
        const [user, guilds] = await Promise.all([
          discordOAuth.fetchUser(accessToken),
          discordOAuth.fetchUserGuilds(accessToken),
        ]);

        req.session.user = user;
        req.session.accessToken = accessToken;
        req.session.guilds = guilds;
        await UserProfileService.recordLogin(user.id, user);
        await req.session.save();
        return reply.redirect(`${FRONTEND_URL}/servers`);
      } catch (err) {
        client.logger.error("DashboardPlugin", `OAuth callback error: ${err}`);
        return reply.redirect(`${FRONTEND_URL}/?error=oauth_failed`);
      }
    }
  );

  fastify.get("/auth/me", async (req, reply) => {
    if (!req.session.user) {
      return reply.code(401).send({ error: "Not authenticated." });
    }
    return req.session.user;
  });

  fastify.get("/auth/debug", async (req, reply) => {
    return {
      isProd,
      nodeEnv: process.env["NODE_ENV"] ?? "unset",
      frontendUrl: FRONTEND_URL,
      redirectUri: REDIRECT_URI,
      protocol: req.protocol,
      hostname: req.hostname,
      hasCookie: !!req.cookies["mewwme-dash.sid"],
      hasSession: !!req.session?.user,
      cookieSettings: {
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        httpOnly: true,
      },
      headers: {
        origin: req.headers.origin ?? "none",
        "x-forwarded-proto": req.headers["x-forwarded-proto"] ?? "none",
        "x-forwarded-for": req.headers["x-forwarded-for"] ?? "none",
      },
    };
  });

  // Privy-based login: frontend sends Discord user info from Privy user object
  // Accepts either { accessToken } (Discord OAuth token) or { discordId, username, avatar }
  // Returns immediately after user validation; guild list is resolved lazily on /api/guilds
  fastify.post<{ Body: { accessToken?: string; discordId?: string; username?: string; avatar?: string | null; globalName?: string | null } }>(
    "/auth/privy-session",
    async (req, reply) => {
      const { accessToken, discordId, username, avatar, globalName } = req.body ?? {};

      try {
        let user: import("./DiscordOAuth.js").DiscordUser | undefined;
        let guilds = [...(req.session.guilds ?? [])];

        // Path A: Trust Privy identity first to avoid repeated Discord API calls.
        if (discordId && username) {
          user = {
            id: discordId,
            username,
            discriminator: "0",
            avatar: avatar ?? null,
            global_name: globalName ?? null,
          };

          // Reuse previously persisted identity to keep avatar/display name stable
          // across backend restarts even when Discord APIs are rate-limited.
          const savedProfile = await UserProfileService.getProfile(discordId).catch(() => undefined);
          if (savedProfile) {
            user = {
              ...user,
              username: savedProfile.username || user.username,
              discriminator: savedProfile.discriminator || user.discriminator,
              avatar: savedProfile.avatar ?? user.avatar,
              global_name: savedProfile.global_name ?? user.global_name,
            };
          }

          // If OAuth access token is available, prefer /users/@me to hydrate latest identity.
          if (accessToken && typeof accessToken === "string") {
            try {
              const oauthUser = await discordOAuth.fetchUser(accessToken);
              user = {
                ...user,
                username: oauthUser.username || user.username,
                discriminator: oauthUser.discriminator || user.discriminator,
                avatar: oauthUser.avatar ?? user.avatar,
                global_name: oauthUser.global_name ?? user.global_name,
              };
            } catch {
              // keep fallback identity
            }
          }

          // Enrich avatar/display name from Discord when possible.
          // If this fails (network/rate limit), keep Privy identity fallback.
          try {
            const discordUser = await discordOAuth.fetchUserById(discordId);
            user = {
              ...user,
              username: discordUser.username || user.username,
              discriminator: discordUser.discriminator || user.discriminator,
              avatar: discordUser.avatar ?? user.avatar,
              global_name: discordUser.global_name ?? user.global_name,
            };
          } catch {
            // keep fallback user from Privy payload
          }
        }

        // Path B: Fallback to Discord /users/@me when identity is missing.
        if (!user && accessToken && typeof accessToken === "string") {
          try {
            user = await discordOAuth.fetchUser(accessToken);
          } catch {
            client.logger.warn("DashboardPlugin", "Privy Discord token rejected and no Privy identity payload.");
          }
        }

        // Try to hydrate guild list when token exists and cache is empty.
        // Never fail session creation if Discord API is rate-limited.
        if (accessToken && typeof accessToken === "string" && guilds.length === 0) {
          try {
            guilds = await discordOAuth.fetchUserGuilds(accessToken);
          } catch (err) {
            const e = err as any;
            const retryAfter = Number(e?.response?.data?.retry_after);
            if (Number.isFinite(retryAfter) && retryAfter > 0) {
              req.session.guildsFetchRetryAt = Date.now() + retryAfter;
            }
          }
        }

        if (!user) {
          return reply.code(400).send({ error: "Missing accessToken or discordId+username." });
        }

        req.session.user = user;
        req.session.accessToken = accessToken ?? "";
        req.session.guilds = guilds;
        if (guilds.length > 0) req.session.guildsFetchRetryAt = undefined;
        client.logger.info("DashboardPlugin", `Privy session created: userId=${user.id} username=${user.username} guilds=${guilds.length}`);
        await UserProfileService.recordLogin(user.id, user);
        await req.session.save();
        return { ok: true, user, hasGuilds: guilds.length > 0 };
      } catch (err) {
        client.logger.error("DashboardPlugin", `Privy session error: ${err}`);
        return reply.code(500).send({ error: "Failed to create session." });
      }
    }
  );

  fastify.post("/auth/logout", async (req, reply) => {
    req.session.destroy();
    return { ok: true };
  });

  fastify.get("/api/guilds", { preHandler: requireAuth }, async (req, reply) => {
    try {
      let userGuilds = req.session.guilds ?? [];
      const now = Date.now();
      const guildsRetryAt = req.session.guildsFetchRetryAt ?? 0;

      // Prefer Discord OAuth guild list when access token exists but guild cache is empty.
      // This enables Privy single-login flow to populate inviteable servers without re-login.
      if (userGuilds.length === 0 && req.session.accessToken && now >= guildsRetryAt) {
        try {
          userGuilds = await discordOAuth.fetchUserGuilds(req.session.accessToken);
          req.session.guilds = userGuilds;
          req.session.guildsFetchRetryAt = undefined;
          await req.session.save();
        } catch (err) {
          const e = err as any;
          const retryAfter = Number(e?.response?.data?.retry_after);
          req.session.guildsFetchRetryAt =
            Date.now() + (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60_000);
          await req.session.save();
          // Token may be missing guilds scope or currently rate-limited; fallback below.
        }
      }

      // Lazy-resolve guild membership for Privy sessions that skipped guild check
      if (userGuilds.length === 0 && req.session.user) {
        try {
          const userId = req.session.user.id;
          const memberGuilds: typeof userGuilds = [];
          const checks = Array.from(client.guilds.cache.values()).map(async (guild) => {
            try {
              const member = await guild.members.fetch(userId);
              if (member) {
                memberGuilds.push({
                  id: guild.id,
                  name: guild.name,
                  icon: guild.icon,
                  permissions: member.permissions.bitfield.toString(),
                  owner: guild.ownerId === userId,
                });
              }
            } catch {
              // User not in this guild, skip
            }
          });
          await Promise.allSettled(checks);
          userGuilds = memberGuilds;
          // Cache in session for subsequent requests
          req.session.guilds = userGuilds;
          await req.session.save();
        } catch {
          client.logger.warn("DashboardPlugin", "Lazy guild resolve failed");
        }
      }

      const botGuildIds = new Set(client.guilds.cache.keys());
      const MANAGE_GUILD = BigInt(0x20);

      return userGuilds
        .filter((g) => {
          if (botGuildIds.has(g.id)) return true;
          if (g.owner) return true;
          const permissionBits =
            (g as { permissions?: string; permissions_new?: string }).permissions ??
            (g as { permissions?: string; permissions_new?: string }).permissions_new;
          if (!permissionBits) return true;
          try {
            return (BigInt(permissionBits) & MANAGE_GUILD) !== BigInt(0);
          } catch {
            return true;
          }
        })
        .map((g) => ({
          ...g,
          hasBot: botGuildIds.has(g.id),
          iconUrl: discordOAuth.guildIconUrl(g.id, g.icon),
        }));
    } catch {
      reply.code(500).send({ error: "Failed to fetch guilds." });
    }
  });

  fastify.get("/api/player/active", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.session.user!.id;
      const userGuildIds = (req.session.guilds ?? []).map((g) => g.id);

      for (const gId of userGuildIds) {
        const player = client.mewslink.players.get(gId);
        if (!player || !player.voiceId || !player.queue.current) continue;
        const guild = await client.guilds.fetch(gId).catch(() => undefined);
        if (!guild) continue;
        const member = await guild.members.fetch(userId).catch(() => undefined);
        if (!member?.voice?.channelId || member.voice.channelId !== player.voiceId) continue;

        const song = player.queue.current;
        return reply.send({
          guildId: player.guildId,
          current: song
            ? {
                title: song.title,
                uri: song.uri,
                length: song.duration,
                thumbnail: song.artworkUrl,
                author: song.author,
              }
            : null,
          pause: player.paused,
          position: player.position,
          volume: player.volume,
          loop: player.loop,
          autoplay: player.data.get("autoplay") === true,
          queue: player.queue.map((t) => ({
            title: t.title,
            uri: t.uri,
            length: t.duration,
            thumbnail: t.artworkUrl,
            author: t.author,
          })),
        });
      }

      return reply.code(204).send();
    } catch {
      reply.code(500).send({ error: "Failed to find active player." });
    }
  });

  fastify.get<{ Params: { guildId: string } }>(
    "/api/guilds/:guildId/voice",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const { data } = await botApi.get(
          `/players/${req.params.guildId}/voice/${req.session.user!.id}`
        );
        return data;
      } catch (err) {
        proxyError(err, reply, "Failed to check voice status.");
      }
    }
  );

  fastify.get<{ Params: { guildId: string } }>(
    "/api/player/:guildId",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const { data } = await botApi.get(`/players/${req.params.guildId}`, {
          headers: { "user-id": req.session.user!.id },
        });
        return data;
      } catch (err) {
        proxyError(err, reply, "Failed to get player status.");
      }
    }
  );

  fastify.patch<{ Params: { guildId: string }; Body: Record<string, unknown> }>(
    "/api/player/:guildId",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const { data } = await botApi.patch(`/players/${req.params.guildId}`, req.body, {
          headers: { "user-id": req.session.user!.id },
        });
        return data;
      } catch (err) {
        proxyError(err, reply, "Failed to control player.");
      }
    }
  );

  fastify.post<{ Body: { guildId?: string } }>(
    "/api/player",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { guildId } = req.body;
      if (!guildId) return reply.code(400).send({ error: "guildId is required." });
      try {
        const { data } = await botApi.post("/players/", {
          guildId,
          userId: req.session.user!.id,
        });
        return data;
      } catch (err) {
        proxyError(err, reply, "Failed to create player.");
      }
    }
  );

  fastify.delete<{ Params: { guildId: string } }>(
    "/api/player/:guildId",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        await botApi.delete(`/players/${req.params.guildId}`);
        return reply.code(204).send();
      } catch (err) {
        proxyError(err, reply, "Failed to stop player.");
      }
    }
  );

  fastify.get<{ Params: { guildId: string } }>(
    "/api/player/:guildId/member",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const { data } = await botApi.get(
          `/players/${req.params.guildId}/member/${req.session.user!.id}`
        );
        return data;
      } catch (err) {
        proxyError(err, reply, "Failed to check voice channel.");
      }
    }
  );

  fastify.get<{ Querystring: { identifier?: string; source?: string; guildId?: string } }>(
    "/api/search",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { identifier, source = "ytsearch", guildId } = req.query;
      if (!identifier?.trim()) return reply.code(400).send({ error: "identifier is required." });
      try {
        // client.logger.info("SearchRoute", `Searching: "${identifier}" source=${source} guild=${guildId}`);
        const { data } = await botApi.get("/search", {
          params: {
            identifier: identifier.trim(),
            source,
            requester: req.session.user!.id,
            guildId: guildId ?? "",
          },
        });
        const count = Array.isArray(data?.tracks) ? data.tracks.length : 0;
        // client.logger.info("SearchRoute", `Results: ${count} tracks`);
        return data;
      } catch (err: any) {
        // client.logger.warn("SearchRoute", `Search error: ${err?.response?.status} ${JSON.stringify(err?.response?.data)}`);
        proxyError(err, reply, "Search failed.");
      }
    }
  );


  fastify.post<{ Body: { message?: string; guildId?: string } }>(
    "/api/ai-chat",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { message, guildId } = req.body ?? {};
      if (!message?.trim()) return reply.code(400).send({ error: "message is required." });
      if (!client.config.GeminiAiChat?.Enable) {
        return reply.code(503).send({ error: "Oops! I’m napping… AI Chat is unavailable for now 😴" });
      }

      const userId = req.session.user!.id;
      const dashCfg = getDashboardAccessConfig(client);
      const aiChatAccess = (dashCfg as any).AiChat ?? (client.config.DASHBOARD_ACCESS as any)?.AiChat ?? ["Member"];
      const perm = await buildDashboardUserPerm(client, userId, guildId);
      if (!hasFeatureAccess(aiChatAccess, perm)) {
        const requiredLevel = Array.isArray(aiChatAccess) ? aiChatAccess[0] : "Premium";
        let errorMsg = "You don't have access to AI Chat.";
        let actionUrl: string | null = null;
        let actionLabel: string | null = null;

        if (requiredLevel === "Admin" || requiredLevel === "Owner") {
          errorMsg = "AI Chat is currently under maintenance. Please check back later!";
        } else if (requiredLevel === "Voter") {
          errorMsg = "To use AI Chat, please vote for the bot first! It's quick and free";
          actionUrl = `https://top.gg/bot/${client.user?.id}/vote`;
          actionLabel = "Vote Now";
        } else if (requiredLevel === "Premium") {
          errorMsg = "AI Chat is a premium feature. Upgrade to premium to unlock it!";
          actionUrl = "/premium";
          actionLabel = "Get Premium";
        } else if (requiredLevel === "Manager") {
          errorMsg = "AI Chat requires the Manage Server permission in this server.";
        }

        return reply.code(403).send({ error: errorMsg, actionUrl, actionLabel });
      }

      try {
        await getAiChatHistoryDb().saveMessage(userId, guildId || null, "user", message.trim());
        const contextHistory = await getAiChatHistoryDb().getContext(userId, 12);
        const result = await AiChatService.chat(message.trim(), contextHistory);
        await getAiChatHistoryDb().saveMessage(
          userId,
          guildId || null,
          "assistant",
          result.text,
          result.songs.length > 0 ? result.songs : undefined
        );

        return result;
      } catch (err) {
        client.logger.error("AiChatRoute", `AI Chat error: ${err}`);
        return reply.code(500).send({ error: "AI Chat failed. Please try again." });
      }
    }
  );

  fastify.get(
    "/api/ai-chat/history",
    { preHandler: requireAuth },
    async (req, reply) => {
      const userId = req.session.user!.id;
      try {
        const messages = await getAiChatHistoryDb().getHistory(userId, 20);
        return { messages };
      } catch (err) {
        client.logger.error("AiChatHistory", `Failed to load history: ${err}`);
        return reply.code(500).send({ error: "Failed to load chat history." });
      }
    }
  );

  fastify.post(
    "/api/ai-chat/clear",
    { preHandler: requireAuth },
    async (req, reply) => {
      const userId = req.session.user!.id;
      try {
        await getAiChatHistoryDb().clearHistory(userId);
        return { success: true };
      } catch (err) {
        client.logger.error("AiChatClear", `Failed to clear history: ${err}`);
        return reply.code(500).send({ error: "Failed to clear chat history." });
      }
    }
  );

  fastify.get("/api/stats", { preHandler: requireAuth }, async (req, reply) => {
    const userId = req.session.user!.id;
    try {
      const [{ data: botStats }, profile] = await Promise.all([
        botApi.get(`/user/${userId}/stats`),
        UserProfileService.getProfile(userId),
      ]);
      return {
        ...botStats,
        firstLogin: profile?.firstLogin ?? null,
        loginCount: profile?.loginCount ?? 1,
      };
    } catch (err) {
      proxyError(err, reply, "Failed to fetch stats.");
    }
  });

  fastify.get<{ Params: { guildId: string } }>(
    "/api/guild/:guildId/stats",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const { data } = await botApi.get(`/guild/${req.params.guildId}/stats`);
        return data;
      } catch (err) {
        proxyError(err, reply, "Failed to fetch guild stats.");
      }
    }
  );

  fastify.get("/api/global-stats", async (_req, reply) => {
    try {
      const { data } = await botApi.get("/global-stats");
      return data;
    } catch (err) {
      proxyError(err, reply, "Failed to fetch global stats.");
    }
  });

  fastify.get("/api/commands", async (_req, reply) => {
    try {
      const { data } = await botApi.get("/commands");
      return data;
    } catch (err) {
      proxyError(err, reply, "Failed to fetch commands.");
    }
  });

  fastify.get("/api/top-servers", async (_req, reply) => {
    try {
      const { data } = await botApi.get("/top-servers");
      return data;
    } catch (err) {
      proxyError(err, reply, "Failed to fetch top servers.");
    }
  });

  fastify.get("/api/playlists/access", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.session.user!.id;
      const { data } = await botApi.get(`/user/${userId}/premium`);
      return {
        hasPlaylistAccess: data?.access?.playlist ?? true,
        playlistRequirement: data?.requirements?.playlist ?? "Member",
        voteUrl: data?.voteUrl ?? null,
      };
    } catch (err) {
      proxyError(err, reply, "Failed to check playlist access.");
    }
  });

  fastify.get("/api/playlists", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { data } = await botApi.get(`/playlists/${req.session.user!.id}`);
      return data;
    } catch (err) {
      proxyError(err, reply, "Failed to fetch playlists.");
    }
  });

  fastify.post<{ Body: { name?: string; description?: string; private?: boolean } }>(
    "/api/playlists",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { name, description, private: isPrivate } = req.body;
      if (!name?.trim()) return reply.code(400).send({ error: "name is required." });
      try {
        const { data } = await botApi.post("/playlists", {
          userId: req.session.user!.id,
          name: name.trim(),
          description,
          private: isPrivate ?? false,
        });
        return reply.code(201).send(data);
      } catch (err) {
        proxyError(err, reply, "Failed to create playlist.");
      }
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    "/api/playlists/:id",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        await botApi.delete(`/playlists/${req.params.id}`, {
          headers: { "user-id": req.session.user!.id },
        });
        return reply.code(204).send();
      } catch (err) {
        proxyError(err, reply, "Failed to delete playlist.");
      }
    }
  );

  fastify.post<{ Params: { id: string }; Body: { uri?: string } }>(
    "/api/playlists/:id/tracks",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { uri } = req.body;
      if (!uri?.trim()) return reply.code(400).send({ error: "uri is required." });

      let parsed: URL;
      try {
        parsed = new URL(uri.trim());
      } catch {
        return reply
          .code(400)
          .send({ error: "Invalid URL — please provide a valid Spotify link." });
      }
      if (parsed.hostname !== "open.spotify.com") {
        return reply
          .code(400)
          .send({ error: "Only Spotify URLs (open.spotify.com) are supported." });
      }

      try {
        await botApi.post(
          `/playlists/${req.params.id}/tracks`,
          { uri: uri.trim() },
          { headers: { "user-id": req.session.user!.id } }
        );
        const { data: playlists } = await botApi.get(`/playlists/${req.session.user!.id}`);
        const updated = Array.isArray(playlists)
          ? playlists.find((p: any) => p.id === req.params.id)
          : null;
        return updated ?? { id: req.params.id };
      } catch (err) {
        proxyError(err, reply, "Failed to add track.");
      }
    }
  );

  fastify.delete<{ Params: { id: string; index: string } }>(
    "/api/playlists/:id/tracks/:index",
    { preHandler: requireAuth },
    async (req, reply) => {
      const index = Number(req.params.index);
      if (!Number.isInteger(index) || index < 0) {
        return reply.code(400).send({ error: "index must be a non-negative integer." });
      }
      try {
        await botApi.delete(`/playlists/${req.params.id}/tracks/${index}`, {
          headers: { "user-id": req.session.user!.id },
        });
        return reply.code(204).send();
      } catch (err) {
        proxyError(err, reply, "Failed to remove track.");
      }
    }
  );

  fastify.post<{ Params: { id: string }; Body: { guildId?: string } }>(
    "/api/playlists/:id/play",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { guildId } = req.body;
      if (!guildId) return reply.code(400).send({ error: "guildId is required." });
      try {
        const { data } = await botApi.post(
          `/playlists/${req.params.id}/play`,
          { guildId },
          { headers: { "user-id": req.session.user!.id } }
        );
        return data;
      } catch (err) {
        proxyError(err, reply, "Failed to play playlist.");
      }
    }
  );

  fastify.post<{ Params: { id: string; index: string }; Body: { guildId?: string } }>(
    "/api/playlists/:id/play/:index",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { guildId } = req.body;
      if (!guildId) return reply.code(400).send({ error: "guildId is required." });
      try {
        const { data } = await botApi.post(
          `/playlists/${req.params.id}/play/${req.params.index}`,
          { guildId },
          { headers: { "user-id": req.session.user!.id } }
        );
        return data;
      } catch (err) {
        proxyError(err, reply, "Failed to play track.");
      }
    }
  );

  fastify.get<{ Params: { guildId: string } }>(
    "/api/guild/:guildId/settings",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const { data } = await botApi.get(`/guild/${req.params.guildId}/settings`, {
          headers: { "user-id": req.session.user!.id },
        });
        return data;
      } catch (err) {
        proxyError(err, reply, "Failed to fetch guild settings.");
      }
    }
  );

  fastify.patch<{ Params: { guildId: string }; Body: Record<string, unknown> }>(
    "/api/guild/:guildId/settings",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const { data } = await botApi.patch(`/guild/${req.params.guildId}/settings`, {
          ...req.body,
          _userId: req.session.user!.id,
        });
        return data;
      } catch (err) {
        proxyError(err, reply, "Failed to update guild settings.");
      }
    }
  );

  fastify.get<{ Params: { guildId: string } }>(
    "/api/guild/:guildId/settings/locales",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const { data } = await botApi.get(`/guild/${req.params.guildId}/settings/locales`);
        return data;
      } catch (err) {
        proxyError(err, reply, "Failed to fetch available locales.");
      }
    }
  );

  fastify.post<{ Params: { guildId: string }; Body: Record<string, unknown> }>(
    "/api/guild/:guildId/notify/twitch",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const { data } = await botApi.post(`/guild/${req.params.guildId}/notify/twitch`, req.body);
        return data;
      } catch (err) {
        proxyError(err, reply, "Failed to add Twitch notification.");
      }
    }
  );

  fastify.delete<{ Params: { guildId: string; username: string } }>(
    "/api/guild/:guildId/notify/twitch/:username",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const { data } = await botApi.delete(
          `/guild/${req.params.guildId}/notify/twitch/${req.params.username}`
        );
        return data;
      } catch (err) {
        proxyError(err, reply, "Failed to remove Twitch notification.");
      }
    }
  );

  fastify.post<{ Params: { guildId: string }; Body: Record<string, unknown> }>(
    "/api/guild/:guildId/notify/youtube",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const { data } = await botApi.post(`/guild/${req.params.guildId}/notify/youtube`, req.body);
        return data;
      } catch (err) {
        proxyError(err, reply, "Failed to add YouTube notification.");
      }
    }
  );

  fastify.delete<{ Params: { guildId: string; channelId: string } }>(
    "/api/guild/:guildId/notify/youtube/:channelId",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const { data } = await botApi.delete(
          `/guild/${req.params.guildId}/notify/youtube/${req.params.channelId}`
        );
        return data;
      } catch (err) {
        proxyError(err, reply, "Failed to remove YouTube notification.");
      }
    }
  );

  fastify.get<{ Params: { guildId: string } }>(
    "/api/guild/:guildId/channels",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const { data } = await botApi.get(`/guild/${req.params.guildId}/channels`);
        return data;
      } catch (err) {
        proxyError(err, reply, "Failed to fetch guild channels.");
      }
    }
  );

  fastify.get("/api/user/lastfm", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { data } = await botApi.get(`/user/${req.session.user!.id}/lastfm`);
      return data;
    } catch (err) {
      proxyError(err, reply, "Failed to fetch Last.fm status.");
    }
  });

  fastify.get("/api/user/lastfm/login-url", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { data } = await botApi.get(`/user/${req.session.user!.id}/lastfm/login-url`);
      return data;
    } catch (err) {
      proxyError(err, reply, "Failed to generate Last.fm login URL.");
    }
  });

  fastify.delete("/api/user/lastfm", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { data } = await botApi.delete(`/user/${req.session.user!.id}/lastfm`);
      return data;
    } catch (err) {
      proxyError(err, reply, "Failed to disconnect Last.fm.");
    }
  });

  fastify.get("/api/user/lastfm/profile", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { data: status } = await botApi.get(`/user/${req.session.user!.id}/lastfm`);
      if (!status?.connected || !status?.username) {
        return reply.code(404).send({ error: "Last.fm not connected." });
      }

      const lfmKey = client.config.features.WebServer.LAST_FM_SCROBBLED?.ApiKey;
      if (!lfmKey) {
        return reply.code(500).send({ error: "Last.fm API key not configured." });
      }

      const username = status.username;
      const lfmBase = "https://ws.audioscrobbler.com/2.0/";

      const lfm = (method: string, extra: Record<string, string> = {}) => {
        const params = new URLSearchParams({
          method,
          user: username,
          api_key: lfmKey,
          format: "json",
          ...extra,
        });
        return axios.get(`${lfmBase}?${params}`, { timeout: 10_000 }).then((r) => r.data);
      };

      const [userInfo, topArtists, topAlbums, topTracks, lovedTracks] = await Promise.all([
        lfm("user.getInfo"),
        lfm("user.getTopArtists", { period: "7day", limit: "10" }),
        lfm("user.getTopAlbums", { period: "7day", limit: "10" }),
        lfm("user.getTopTracks", { period: "7day", limit: "10" }),
        lfm("user.getLovedTracks", { limit: "1" }), // just need total count
      ]);

      const user = userInfo?.user;
      const registered = user?.registered?.unixtime
        ? new Date(Number(user.registered.unixtime) * 1000).toISOString()
        : null;

      // Pick first non-empty, non-placeholder image URL from Last.fm image array
      const LFM_PLACEHOLDER = "2a96cbd8b46e442fc41c2b86b821562f";
      const pickImage = (images: any[] | undefined): string | null => {
        if (!Array.isArray(images)) return null;
        for (const size of ["extralarge", "large", "medium", "small", ""]) {
          const found = size ? images.find((i: any) => i.size === size) : images[images.length - 1];
          const url = found?.["#text"];
          if (url && typeof url === "string" && url.trim() !== "" && !url.includes(LFM_PLACEHOLDER))
            return url;
        }
        return null;
      };

      // Deezer fallback for missing images (Last.fm deprecated artist images)
      const deezerArtistImage = async (name: string): Promise<string | null> => {
        try {
          const { data } = await axios.get(
            `https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=1`,
            { timeout: 4000 }
          );
          return data?.data?.[0]?.picture_medium || null;
        } catch {
          return null;
        }
      };
      const deezerTrackImage = async (track: string, artist: string): Promise<string | null> => {
        try {
          const { data } = await axios.get(
            `https://api.deezer.com/search/track?q=${encodeURIComponent(`${artist} ${track}`)}&limit=1`,
            { timeout: 4000 }
          );
          return data?.data?.[0]?.album?.cover_medium || null;
        } catch {
          return null;
        }
      };

      const rawArtists = (topArtists?.topartists?.artist ?? []).slice(0, 10);
      const rawAlbums = (topAlbums?.topalbums?.album ?? []).slice(0, 10);
      const rawTracks = (topTracks?.toptracks?.track ?? []).slice(0, 10);

      // Resolve artist & track images with Deezer fallback (parallel)
      const [artistImages, trackImages] = await Promise.all([
        Promise.all(
          rawArtists.map(async (a: any) => pickImage(a.image) ?? (await deezerArtistImage(a.name)))
        ),
        Promise.all(
          rawTracks.map(
            async (t: any) =>
              pickImage(t.image) ?? (await deezerTrackImage(t.name, t.artist?.name ?? ""))
          )
        ),
      ]);

      return {
        username: user?.name ?? username,
        realname: user?.realname || null,
        url: user?.url ?? `https://www.last.fm/user/${username}`,
        image: pickImage(user?.image),
        registeredAt: registered,
        playcount: Number(user?.playcount ?? 0),
        artistCount: Number(user?.artist_count ?? 0),
        trackCount: Number(user?.track_count ?? 0),
        albumCount: Number(user?.album_count ?? 0),
        lovedCount: Number(lovedTracks?.lovedtracks?.["@attr"]?.total ?? 0),
        topArtists: rawArtists.map((a: any, i: number) => ({
          name: a.name,
          playcount: Number(a.playcount ?? 0),
          url: a.url ?? null,
          image: artistImages[i],
        })),
        topAlbums: rawAlbums.map((a: any) => ({
          name: a.name,
          artist: a.artist?.name ?? "",
          playcount: Number(a.playcount ?? 0),
          url: a.url ?? null,
          image: pickImage(a.image),
        })),
        topTracks: rawTracks.map((t: any, i: number) => ({
          name: t.name,
          artist: t.artist?.name ?? "",
          playcount: Number(t.playcount ?? 0),
          url: t.url ?? null,
          image: trackImages[i],
        })),
      };
    } catch (err) {
      proxyError(err, reply, "Failed to fetch Last.fm profile.");
    }
  });

  fastify.get<{ Querystring: { guildId?: string } }>(
    "/api/user/premium",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const guildId = req.query.guildId;
        const url = guildId
          ? `/user/${req.session.user!.id}/premium?guildId=${encodeURIComponent(guildId)}`
          : `/user/${req.session.user!.id}/premium`;
        const { data } = await botApi.get(url);
        return data;
      } catch (err) {
        proxyError(err, reply, "Failed to fetch premium status.");
      }
    }
  );

  fastify.get("/api/liked", { preHandler: requireAuth }, async (req, reply) => {
    return LikedSongsService.get(req.session.user!.id);
  });

  fastify.post<{ Body: Omit<LikedTrack, "likedAt"> }>(
    "/api/liked",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { title, uri, author, thumbnail, length } = req.body;
      if (!uri?.trim()) return reply.code(400).send({ error: "uri is required." });
      const result = await LikedSongsService.toggle(req.session.user!.id, {
        title: title ?? "Unknown",
        uri,
        author: author ?? "Unknown",
        thumbnail: thumbnail ?? null,
        length: Number(length) || 0,
      });
      return result;
    }
  );

  fastify.get<{ Querystring: { uri?: string } }>(
    "/api/liked/check",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { uri } = req.query;
      if (!uri) return reply.code(400).send({ error: "uri is required." });
      return { liked: await LikedSongsService.isLiked(req.session.user!.id, uri) };
    }
  );

  fastify.get<{ Querystring: { country?: string } }>(
    "/api/top-chart",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const country = (req.query.country ?? "global").toLowerCase();
        const tracks = await SpotifyTopChart.getTopChart(country);
        return tracks;
      } catch (err) {
        client.logger.warn("TopChart", `Error in /api/top-chart: ${err}`);
        return [];
      }
    }
  );

  fastify.get("/api/recommended", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const acceptLang = req.headers["accept-language"];
      let country = "global";
      if (acceptLang) {
        const m = acceptLang.match(/[a-z]{2}-([A-Z]{2})/);
        if (m) country = m[1]!.toLowerCase();
      }
      const tracks = await SpotifyTopChart.getTopChart(country);
      const mapped = tracks.map((t) => ({
        uri: t.spotify_url,
        title: t.title,
        author: t.artist,
        thumbnail: t.cover,
        length: t.duration,
        rank: t.rank,
      }));
      return { tracks: mapped, source: "charts", country };
    } catch (err) {
      client.logger.warn("Recommended", `Error in /api/recommended: ${err}`);
      return { tracks: [], source: "charts" };
    }
  });

  // ── Genre / Tag Charts (Last.fm chart.getTopTags + tag.getTopTracks) ──────
  let topTagsCache: { data: unknown[]; expiresAt: number } | null = null;
  const tagTracksCache = new Map<string, { data: unknown[]; expiresAt: number }>();

  fastify.get("/api/top-tags", { preHandler: requireAuth }, async (_req, _reply) => {
    if (topTagsCache && Date.now() < topTagsCache.expiresAt) return topTagsCache.data;

    const lfmKey = client.config.features.WebServer.LAST_FM_SCROBBLED?.ApiKey;
    if (!lfmKey) return [];

    try {
      const params = new URLSearchParams({
        method: "chart.getTopTags",
        api_key: lfmKey,
        format: "json",
      });
      const { data } = await axios.get(`https://ws.audioscrobbler.com/2.0/?${params}`, {
        timeout: 8_000,
      });
      const tags = (data?.tags?.tag || []).slice(0, 30).map((t: any) => ({
        name: t.name,
        reach: Number(t.reach) || 0,
      }));
      topTagsCache = { data: tags, expiresAt: Date.now() + 60 * 60_000 }; // 1h cache
      return tags;
    } catch (err) {
      client.logger.warn("TopTags", `Error: ${err}`);
      return [];
    }
  });

  fastify.get<{ Querystring: { tag?: string } }>(
    "/api/tag-tracks",
    { preHandler: requireAuth },
    async (req, _reply) => {
      const tag = req.query.tag;
      if (!tag) return [];

      const cacheKey = tag.toLowerCase();
      const cached = tagTracksCache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) return cached.data;

      const lfmKey = client.config.features.WebServer.LAST_FM_SCROBBLED?.ApiKey;
      if (!lfmKey) return [];

      try {
        const params = new URLSearchParams({
          method: "tag.getTopTracks",
          tag,
          api_key: lfmKey,
          format: "json",
          limit: "30",
        });
        const { data } = await axios.get(`https://ws.audioscrobbler.com/2.0/?${params}`, {
          timeout: 8_000,
        });
        const rawTracks = data?.tracks?.track || [];

        const tracks = rawTracks
          .filter((t: any) => t?.name && t?.artist?.name)
          .map((t: any) => ({
            title: t.name,
            artist: t.artist.name,
            thumbnail: null as string | null,
            searchQuery: `${t.artist.name} - ${t.name}`,
          }));

        // Fetch album art: iTunes → Deezer fallback (both free, no key)
        if (tracks.length > 0) {
          const itunesSearch = async (term: string): Promise<string | null> => {
            const res = await axios.get("https://itunes.apple.com/search", {
              params: { term, media: "music", limit: 1 },
              timeout: 5_000,
            });
            const art = res.data?.results?.[0]?.artworkUrl100;
            return art ? art.replace("100x100", "600x600") : null;
          };
          const deezerSearch = async (term: string): Promise<string | null> => {
            const res = await axios.get("https://api.deezer.com/search", {
              params: { q: term, limit: 1 },
              timeout: 5_000,
            });
            return res.data?.data?.[0]?.album?.cover_big ?? null;
          };
          const results = await Promise.allSettled(
            tracks.slice(0, 25).map(async (r: any) => {
              const term = `${r.artist} ${r.title}`;
              try {
                const url = await itunesSearch(term);
                if (url) return url;
              } catch {}
              try {
                const url = await deezerSearch(term);
                if (url) return url;
              } catch {}
              try {
                const url = await itunesSearch(r.title);
                if (url) return url;
              } catch {}
              try {
                const url = await deezerSearch(r.title);
                if (url) return url;
              } catch {}
              return null;
            })
          );
          for (let i = 0; i < results.length; i++) {
            const result = results[i];
            if (result.status === "fulfilled" && result.value) {
              tracks[i].thumbnail = result.value;
            }
          }
        }

        const final = tracks.slice(0, 25);
        tagTracksCache.set(cacheKey, { data: final, expiresAt: Date.now() + 30 * 60_000 }); // 30min cache
        return final;
      } catch (err) {
        client.logger.warn("TagTracks", `Error for tag "${tag}": ${err}`);
        return [];
      }
    }
  );

  const recsCache = new Map<string, { data: unknown[]; expiresAt: number }>();

  fastify.get<{ Querystring: { track?: string; artist?: string } }>(
    "/api/recommendations",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { track, artist } = req.query;
      if (!track || !artist) return [];

      // Cache key based on track+artist (10 min TTL)
      const cacheKey = `${track.toLowerCase()}::${artist.toLowerCase()}`;
      const cached = recsCache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) return cached.data;

      const lfmKey = client.config.features.WebServer.LAST_FM_SCROBBLED?.ApiKey;
      if (!lfmKey) return [];

      const lfmBase = "https://ws.audioscrobbler.com/2.0/";
      const lfmCall = (method: string, extra: Record<string, string> = {}) => {
        const params = new URLSearchParams({
          method,
          api_key: lfmKey,
          format: "json",
          autocorrect: "1",
          ...extra,
        });
        return axios
          .get(`${lfmBase}?${params}`, { timeout: 8_000 })
          .then((r) => r.data)
          .catch(() => null);
      };

      try {
        const [similarTracks, similarArtists] = await Promise.all([
          lfmCall("track.getSimilar", { track, artist, limit: "15" }),
          lfmCall("artist.getSimilar", { artist, limit: "8" }),
        ]);
        const simArtists = similarArtists?.similarartists?.artist;

        const recs: Array<{
          title: string;
          artist: string;
          thumbnail: string | null;
          searchQuery: string;
        }> = [];
        const seen = new Set<string>();
        const simTracks = similarTracks?.similartracks?.track;
        if (Array.isArray(simTracks)) {
          for (const t of simTracks) {
            if (!t?.name || !t?.artist?.name) continue;
            const key = `${t.name.toLowerCase()}::${t.artist.name.toLowerCase()}`;
            if (seen.has(key)) continue;
            seen.add(key);
            recs.push({
              title: t.name,
              artist: t.artist.name,
              thumbnail: null,
              searchQuery: `${t.artist.name} - ${t.name}`,
            });
          }
        }

        if (Array.isArray(simArtists) && recs.length < 25) {
          const remaining = 25 - recs.length;
          const perArtist = Math.max(2, Math.ceil(remaining / simArtists.length));
          const topTrackResults = await Promise.all(
            simArtists
              .slice(0, 6)
              .map((a: any) =>
                lfmCall("artist.getTopTracks", { artist: a.name, limit: String(perArtist) })
              )
          );
          for (let i = 0; i < topTrackResults.length; i++) {
            const res = topTrackResults[i];
            const tracks = res?.toptracks?.track;
            if (!Array.isArray(tracks)) continue;
            for (const t of tracks) {
              if (!t?.name || !t?.artist?.name) continue;
              const key = `${t.name.toLowerCase()}::${t.artist.name.toLowerCase()}`;
              if (seen.has(key)) continue;
              seen.add(key);
              recs.push({
                title: t.name,
                artist: t.artist.name,
                thumbnail: null,
                searchQuery: `${t.artist.name} - ${t.name}`,
              });
            }
          }
        }

        const batch = recs.slice(0, 25);
        const itunesSearch = async (term: string): Promise<string | null> => {
          const res = await axios.get("https://itunes.apple.com/search", {
            params: { term, media: "music", limit: 1 },
            timeout: 5_000,
          });
          const art = res.data?.results?.[0]?.artworkUrl100;
          return art ? art.replace("100x100", "600x600") : null;
        };
        const deezerSearch = async (term: string): Promise<string | null> => {
          const res = await axios.get("https://api.deezer.com/search", {
            params: { q: term, limit: 1 },
            timeout: 5_000,
          });
          return res.data?.data?.[0]?.album?.cover_big ?? null;
        };
        const artResults = await Promise.allSettled(
          batch.map(async (r) => {
            const term = `${r.artist} ${r.title}`;
            try {
              const url = await itunesSearch(term);
              if (url) return url;
            } catch {}
            try {
              const url = await deezerSearch(term);
              if (url) return url;
            } catch {}
            try {
              const url = await itunesSearch(r.title);
              if (url) return url;
            } catch {}
            try {
              const url = await deezerSearch(r.title);
              if (url) return url;
            } catch {}
            return null;
          })
        );
        for (let i = 0; i < artResults.length; i++) {
          const result = artResults[i];
          if (result.status === "fulfilled" && result.value) {
            batch[i].thumbnail = result.value;
          }
        }

        const final = recs.slice(0, 25);
        recsCache.set(cacheKey, { data: final, expiresAt: Date.now() + 10 * 60_000 });
        return final;
      } catch (err) {
        client.logger.warn("Recommendations", `Error for "${track}" by "${artist}": ${err}`);
        return [];
      }
    }
  );

  const lyricsCache = new Map<string, { data: Record<string, unknown>; fetchedAt: number }>();

  fastify.get<{ Params: { guildId: string } }>(
    "/api/player/:guildId/lyrics",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { guildId } = req.params;
      const player = client.mewslink.players.get(guildId);
      if (!player) return reply.code(404).send({ error: "Player not found." });

      const song = player.queue.current;
      if (!song) return reply.code(404).send({ error: "No track currently playing." });

      const cacheKey = `${song.title}::${song.author}`;
      const cached = lyricsCache.get(cacheKey);
      if (cached && Date.now() - cached.fetchedAt < 3_600_000) {
        return reply.send(cached.data);
      }

      try {
        type LrclibRecord = {
          id: number;
          trackName: string;
          artistName: string;
          albumName: string;
          duration: number;
          instrumental: boolean;
          plainLyrics: string | null;
          syncedLyrics: string | null;
        };

        const durationSec = Math.round(song.duration / 1000);

        const { data: results } = await axios.get<LrclibRecord[]>("https://lrclib.net/api/search", {
          params: { track_name: song.title, artist_name: song.author },
          headers: { "User-Agent": "mewwme-dashboard/1.0 (https://meww.me)" },
          timeout: 8_000,
        });

        if (!Array.isArray(results) || results.length === 0) {
          return reply.code(404).send({ error: "No lyrics found for this track." });
        }

        const synced = results.filter((r) => r.syncedLyrics);
        const pool = synced.length > 0 ? synced : results;
        const best = pool.reduce((a, b) =>
          Math.abs(a.duration - durationSec) <= Math.abs(b.duration - durationSec) ? a : b
        );

        let syncedLyrics: { time: number; text: string }[] | null = null;
        if (best.syncedLyrics) {
          const LRC_RE = /^\[(\d{2}):(\d{2}\.\d{1,3})\]\s*(.*)/;
          syncedLyrics = best.syncedLyrics
            .split("\n")
            .reduce<{ time: number; text: string }[]>((acc, line) => {
              const m = line.match(LRC_RE);
              if (m) {
                acc.push({
                  time: Number(m[1]) * 60 + Number(m[2]),
                  text: (m[3] ?? "").trim(),
                });
              }
              return acc;
            }, []);
        }

        const payload: Record<string, unknown> = {
          trackName: best.trackName,
          artistName: best.artistName,
          albumName: best.albumName,
          duration: best.duration,
          syncedLyrics,
          plainLyrics: best.plainLyrics ?? null,
        };

        lyricsCache.set(cacheKey, { data: payload, fetchedAt: Date.now() });
        return reply.send(payload);
      } catch (err) {
        proxyError(err, reply, "Failed to fetch lyrics.");
      }
    }
  );

  const radioCountryCache: { data: unknown; fetchedAt: number } = { data: null, fetchedAt: 0 };
  const radioStationCache = new Map<string, { data: unknown; fetchedAt: number }>();
  const RADIO_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  fastify.get("/api/radio/countries", { preHandler: requireAuth }, async (_req, reply) => {
    try {
      if (
        radioCountryCache.data &&
        Date.now() - radioCountryCache.fetchedAt < RADIO_CACHE_TTL &&
        Array.isArray(radioCountryCache.data) &&
        radioCountryCache.data[0]?.code
      ) {
        return reply.send(radioCountryCache.data);
      }
      const { data } = await axios.get("https://de1.api.radio-browser.info/json/countries", {
        headers: { "User-Agent": "mewwme-dashboard/1.0" },
        timeout: 10_000,
      });
      const countries = (data as Array<{ name: string; iso_3166_1: string; stationcount: number }>)
        .filter((c) => c.stationcount > 0)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ name: c.name, code: c.iso_3166_1, stationcount: c.stationcount }));

      radioCountryCache.data = countries;
      radioCountryCache.fetchedAt = Date.now();
      return reply.send(countries);
    } catch (err) {
      proxyError(err, reply, "Failed to fetch radio countries.");
    }
  });

  fastify.get<{ Querystring: { country?: string } }>(
    "/api/radio/stations",
    { preHandler: requireAuth },
    async (req, reply) => {
      const country = req.query.country?.trim();
      if (!country) return reply.code(400).send({ error: "country query parameter is required." });
      try {
        const cacheKey = country.toLowerCase();
        const cached = radioStationCache.get(cacheKey);
        if (cached && Date.now() - cached.fetchedAt < RADIO_CACHE_TTL) {
          return reply.send(cached.data);
        }
        const { data } = await axios.get(
          "https://de1.api.radio-browser.info/json/stations/bycountryexact/" +
            encodeURIComponent(country),
          {
            params: { hidebroken: "true", order: "clickcount", reverse: "true", limit: 100 },
            headers: { "User-Agent": "mewwme-dashboard/1.0" },
            timeout: 10_000,
          }
        );
        const stations = (
          data as Array<{
            stationuuid: string;
            name: string;
            url: string;
            url_resolved: string;
            favicon: string;
            country: string;
            tags: string;
            codec: string;
            bitrate: number;
            language: string;
            votes: number;
            clickcount: number;
          }>
        )
          .filter((s) => s.url_resolved || s.url)
          .map((s) => ({
            id: s.stationuuid,
            name: s.name,
            url: s.url_resolved || s.url,
            favicon: s.favicon || null,
            country: s.country,
            tags: s.tags,
            codec: s.codec,
            bitrate: s.bitrate,
            language: s.language,
            votes: s.votes,
          }));

        radioStationCache.set(cacheKey, { data: stations, fetchedAt: Date.now() });
        return reply.send(stations);
      } catch (err) {
        proxyError(err, reply, "Failed to fetch radio stations.");
      }
    }
  );

  fastify.post<{ Body: { guildId?: string; stationUrl?: string; stationName?: string } }>(
    "/api/radio/play",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { guildId, stationUrl, stationName } = req.body;
      if (!guildId) return reply.code(400).send({ error: "guildId is required." });
      if (!stationUrl) return reply.code(400).send({ error: "stationUrl is required." });

      const userId = req.session.user!.id;

      try {
        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) return reply.code(404).send({ error: "Guild not found." });

        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return reply.code(404).send({ error: "User not found in guild." });

        if (!member.voice.channel) {
          return reply.code(400).send({ error: "You must be in a voice channel to play radio." });
        }

        let player = client.mewslink.players.get(guildId);

        if (player && player.voiceId !== member.voice.channel.id) {
          return reply
            .code(403)
            .send({ error: "You must be in the same voice channel as the bot." });
        }

        if (!player) {
          let textId = "";
          const systemId = guild.systemChannelId;
          if (systemId) {
            const ch = (await client.channels.fetch(systemId).catch(() => undefined)) as any;
            if (ch && ch.isTextBased()) textId = systemId;
          }
          if (!textId) {
            const channels = await guild.channels.fetch().catch(() => undefined);
            if (channels) {
              for (const [, ch] of channels) {
                if (ch && ch.type === 0) {
                  textId = ch.id;
                  break;
                }
              }
            }
          }

          player = await client.mewslink.create({
            guildId: guild.id,
            voiceId: member.voice.channel.id,
            textId,
            shardId: guild.shardId ?? 0,
            deaf: true,
            mute: false,
            volume: client.config.bot.DEFAULT_VOLUME ?? 50,
          });
        }

        if (player.playing && player.queue.current) {
          await player.setPause(true);
        }

        const result = await client.mewslink.search(stationUrl, {
          requester: await client.users.fetch(userId).catch(() => client.user!),
        });

        if (!result.tracks.length) {
          return reply
            .code(404)
            .send({ error: "Could not resolve the radio stream. The station may be offline." });
        }

        const track = result.tracks[0];

        player.data.set("radioPlaying", true);
        player.data.set("radioStationName", stationName || track.title || "Radio Station");
        player.data.set("radioStationUrl", stationUrl);
        player.data.set("dashboardPlayback", true);

        if (player.paused && player.queue.current) {
          await player.setPause(false);
        }
        player.queue.add(track);

        if (!player.playing) {
          await player.play();
        } else {
          const radioIndex = player.queue.length - 1;
          if (radioIndex >= 0) {
            const target = player.queue[radioIndex];
            if (target && (!target.encoded || !target.isPlayable)) {
              try {
                await target.resolver(client.mewslink, { nodeName: player.node.options.name });
              } catch {
                /* best effort */
              }
            }
            if (target && target.encoded) {
              player.queue.remove(radioIndex);
              if (player.queue.current) {
                player.queue.previous.push(player.queue.current);
              }
              player.queue.current = target;
              player.playing = true;
              player.paused = false;
              player.track = target.encoded;
              player.position = 0;
              player.node.rest.updatePlayer({
                guildId: player.guildId,
                noReplace: false,
                playerOptions: {
                  track: { encoded: target.encoded, length: target.duration },
                  volume: player.volume,
                },
              });
            }
          }
        }

        const { emitPlayerState } = await import("../../utilities/EmitPlayerState.js");
        emitPlayerState(client, player);

        return reply.send({
          success: true,
          stationName: stationName || track.title,
          radioPlaying: true,
        });
      } catch (err) {
        proxyError(err, reply, "Failed to play radio station.");
      }
    }
  );

  fastify.post<{ Body: { guildId?: string } }>(
    "/api/radio/stop",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { guildId } = req.body;
      if (!guildId) return reply.code(400).send({ error: "guildId is required." });

      try {
        const player = client.mewslink.players.get(guildId);
        if (!player) return reply.code(404).send({ error: "No active player." });

        player.data.set("radioPlaying", false);
        player.data.set("radioStationName", null);
        player.data.set("radioStationUrl", null);

        if (player.queue.length > 0) {
          await player.skip();
        } else {
          await player.stop(false);
        }

        const { emitPlayerState } = await import("../../utilities/EmitPlayerState.js");
        emitPlayerState(client, player);

        return reply.send({ success: true, radioPlaying: false });
      } catch (err) {
        proxyError(err, reply, "Failed to stop radio.");
      }
    }
  );

  // ─── Web3 Routes ───
  // Wallet management (session-authenticated)
  fastify.get("/api/wallet", { preHandler: requireAuth }, (req, reply) => getWalletStatus(client, req, reply));
  fastify.post("/api/wallet/connect", { preHandler: requireAuth }, (req, reply) => connectWallet(client, req, reply));
  fastify.post("/api/wallet/disconnect", { preHandler: requireAuth }, (req, reply) => disconnectWallet(client, req, reply));

  // Web3 subscriptions (session-authenticated)
  fastify.get("/api/web3/subscriptions", { preHandler: requireAuth }, (req, reply) => getUserSubscriptions(client, req, reply));

  // Guild tip contract management (session-authenticated)
  fastify.get("/api/web3/guild/:guildId/contract", (req, reply) => getGuildTipContract(client, req, reply));
  fastify.post("/api/web3/guild/contract", { preHandler: requireAuth }, (req, reply) => registerGuildTipContract(client, req, reply));
  fastify.get("/api/web3/guild/:guildId/tips", (req, reply) => getGuildTips(client, req, reply));

  // Community pages (public)
  fastify.get("/api/community/servers", (req, reply) => getCommunityServers(client, req, reply));
  fastify.get("/api/community/servers/:guildId/invite", (req, reply) => getCommunityServerInvite(client, req, reply));
  fastify.get("/api/community/servers/:guildId", (req, reply) => getCommunityServerDetail(client, req, reply));

  // Web3 verify & claim (session-authenticated)
  fastify.post("/api/web3/verify-subscription", { preHandler: requireAuth }, (req, reply) => verifyAndClaimSubscription(client, req, reply));

  // Web3 Premium Guild Activation
  fastify.get("/api/web3/premium-status", { preHandler: requireAuth }, (req, reply) => getWeb3PremiumStatus(client, req, reply));
  fastify.post("/api/web3/guild/activate", { preHandler: requireAuth }, (req, reply) => activateGuildPremium(client, req, reply));
  fastify.post("/api/web3/guild/deactivate", { preHandler: requireAuth }, (req, reply) => deactivateGuildPremium(client, req, reply));
  fastify.get("/api/web3/guild/:guildId/overview", { preHandler: requireAuth }, (req, reply) => getGuildWeb3Overview(client, req, reply));

  // Admin platform stats (session-authenticated, admin-only check inside handler)
  fastify.get("/api/admin/platform-stats", { preHandler: requireAuth }, (req, reply) => getAdminPlatformStats(client, req, reply));

  client.logger.info("DashboardPlugin", "Dashboard routes registered (port " + port + ")");
};

export default dashboardPlugin;
