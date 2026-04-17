import util from "node:util";
import { Manager } from "../../manager.js";
import Fastify from "fastify";

export async function getMemberStatus(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  // client.logger.info("StatusRouterService", `${req.method} ${req.routeOptions.url} params=${req.params ? util.inspect(req.params) : "{}"}`);
  let isMemeberInVoice = false;
  const { guildId, userId } = req.params as Record<string, string>;
  const player = client.mewslink.players.get(guildId);
  if (!player) {
    res.code(400);
    res.send({ error: "Current player not found!" });
    return;
  }
  const Guild = await client.guilds.fetch(guildId).catch(() => undefined);
  if (!Guild) {
    res.code(400);
    res.send({ error: "Guild not found" });
    return;
  }
  const Member = await Guild.members.fetch(userId).catch(() => undefined);
  if (Member && Member.voice.channelId && Member.voice.channelId === player.voiceId) {
    isMemeberInVoice = true;
  }
  res.send({ member: isMemeberInVoice });
}
