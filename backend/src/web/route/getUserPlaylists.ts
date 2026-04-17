import { Manager } from "../../manager.js";
import Fastify from "fastify";

export async function getUserPlaylists(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  const { userId } = req.params as Record<string, string>;
  const all = (await (client.db.playlist as any).all()) as any[];

  const owned = all
    .filter((entry: any) => entry.value?.owner === userId)
    .map((entry: any) => ({
      id: entry.id,
      name: entry.value.name,
      owner: entry.value.owner,
      private: entry.value.private,
      created: entry.value.created,
      description: entry.value.description ?? null,
      trackCount: (entry.value.tracks ?? []).length,
      tracks: entry.value.tracks ?? [],
    }));

  res.send(owned);
}
