import { Manager } from "../../manager.js";
import type { FastifyRequest, FastifyReply } from "fastify";

export async function getVoiceStatus(client: Manager, req: FastifyRequest, res: FastifyReply) {
  const { guildId, userId } = req.params as Record<string, string>;

  const guild = await client.guilds.fetch(guildId).catch(() => undefined);
  if (!guild) {
    return res.code(404).send({ error: "Guild not found" });
  }

  const member = await guild.members.fetch(userId).catch(() => undefined);
  const inVoice = !!member?.voice?.channel;
  const channelId = member?.voice?.channel?.id ?? null;
  const channelName = member?.voice?.channel?.name ?? null;

  return res.send({ inVoice, channelId, channelName });
}
