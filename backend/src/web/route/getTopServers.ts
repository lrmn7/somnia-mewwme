import { Manager } from "../../manager.js";
import Fastify from "fastify";

export function getTopServers(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  client.logger.info("TopServersRouterService", `${req.method} ${req.routeOptions.url} payload={}`);

  // Get top guilds from cache sorted by memberCount descending
  const sorted = client.guilds.cache
    .sort((a, b) => b.memberCount - a.memberCount)
    .first(12)
    .map((guild) => ({
      id: guild.id,
      name: guild.name,
      memberCount: guild.memberCount,
      icon: guild.iconURL({ size: 128, extension: "webp" }) ?? null,
    }));

  // Always return exactly 12 entries — cycle if fewer
  const result: typeof sorted = [];
  if (sorted.length > 0) {
    for (let i = 0; i < 12; i++) {
      result.push(sorted[i % sorted.length]);
    }
  }

  return res.send(result);
}
