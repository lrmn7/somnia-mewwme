import { Manager } from "../../manager.js";
import Fastify from "fastify";
import Parser from "rss-parser";

const rssParser = new Parser();

function getGuild(client: Manager, guildId: string) {
  return client.guilds.cache.get(guildId) ?? null;
}

export async function getLastfmStatus(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  const userId = (req.params as Record<string, string>)["userId"];
  if (!userId) return res.code(400).send({ error: "userId is required." });

  const lastfmData = await client.db.LastFm.get(userId);

  if (!lastfmData || !lastfmData.sessionKey) {
    return res.send({
      connected: false,
      username: null,
      enabled: client.config.features.WebServer.LAST_FM_SCROBBLED.Enable ?? false,
    });
  }

  res.send({
    connected: true,
    username: lastfmData.lastfmUsername ?? null,
    enabled: client.config.features.WebServer.LAST_FM_SCROBBLED.Enable ?? false,
  });
}

export async function getLastfmLoginUrl(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  const userId = (req.params as Record<string, string>)["userId"];
  if (!userId) return res.code(400).send({ error: "userId is required." });

  if (!client.config.features.WebServer.LAST_FM_SCROBBLED.Enable) {
    return res.code(400).send({ error: "Last.fm scrobbling is disabled in the bot config." });
  }

  const authUrl = `https://www.last.fm/api/auth?api_key=${client.config.features.WebServer.LAST_FM_SCROBBLED.ApiKey}&cb=${encodeURIComponent(`${client.config.features.WebServer.LAST_FM_SCROBBLED.Callback}?user=${userId}&from=dashboard`)}`;
  await client.db.LastFm.set(userId, { userId } as any);

  res.send({ url: authUrl });
}

export async function lastfmLogout(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  const userId = (req.params as Record<string, string>)["userId"];
  if (!userId) return res.code(400).send({ error: "userId is required." });

  const lastfmData = await client.db.LastFm.get(userId);
  if (!lastfmData || !lastfmData.sessionKey) {
    return res.code(404).send({ error: "User is not connected to Last.fm." });
  }

  await client.db.LastFm.delete(userId);

  client.logger.info("ExternalServicesRoute", `Last.fm disconnected for user ${userId}`);

  res.send({ success: true });
}


export async function getGuildTextChannels(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  const guildId = (req.params as Record<string, string>)["guildId"];
  if (!guildId) return res.code(400).send({ error: "guildId is required." });

  const guild = getGuild(client, guildId);
  if (!guild) return res.code(404).send({ error: "Guild not found or bot is not in this guild." });

  const textChannels = guild.channels.cache
    .filter((ch) => ch.isTextBased() && !ch.isThread() && !ch.isVoiceBased())
    .map((ch) => ({ id: ch.id, name: ch.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  res.send({ channels: textChannels });
}
