import { Manager } from "../../manager.js";
import Fastify from "fastify";

/**
 * DELETE /v1/playlists/:id
 * Header: user-id (owner check)
 */
export async function deletePlaylist(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  const { id } = req.params as Record<string, string>;
  const userId = req.headers["user-id"] as string;

  const playlist = await client.db.playlist.get(id);
  if (!playlist) {
    res.code(404).send({ error: "Playlist not found." });
    return;
  }
  if (playlist.owner !== userId) {
    res.code(403).send({ error: "You do not own this playlist." });
    return;
  }

  await client.db.playlist.delete(id);
  res.code(204).send();
}
