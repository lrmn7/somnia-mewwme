import { Manager } from "../../manager.js";
import Fastify from "fastify";

export async function deletePlaylistTrack(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  const { id, index } = req.params as Record<string, string>;
  const userId = req.headers["user-id"] as string;
  const idx = parseInt(index, 10);

  const playlist = await client.db.playlist.get(id);
  if (!playlist) {
    res.code(404).send({ error: "Playlist not found." });
    return;
  }
  if (playlist.owner !== userId) {
    res.code(403).send({ error: "You do not own this playlist." });
    return;
  }
  if (isNaN(idx) || idx < 0 || !playlist.tracks || idx >= playlist.tracks.length) {
    res.code(400).send({ error: "Invalid track index." });
    return;
  }

  const tracks = [...(playlist.tracks ?? [])];
  tracks.splice(idx, 1);
  await (client.db.playlist as any).set(`${id}.tracks`, tracks);
  res.code(204).send();
}
