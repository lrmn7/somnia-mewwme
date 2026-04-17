import { Manager } from "../../manager.js";
import Fastify from "fastify";

export async function postAddPlaylistTrack(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  const { id } = req.params as Record<string, string>;
  const userId = req.headers["user-id"] as string;
  const { uri } = req.body as Record<string, string>;

  if (!uri || typeof uri !== "string" || !uri.trim()) {
    return res.code(400).send({ error: "uri is required." });
  }

  const trimmed = uri.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return res.code(400).send({ error: "Invalid URL — please provide a valid Spotify link." });
  }


  if (parsed.hostname !== "open.spotify.com") {
    return res.code(400).send({ error: "Only Spotify URLs (open.spotify.com) are supported." });
  }

  let playlist: any;
  try {
    playlist = await client.db.playlist.get(id);
  } catch (err) {
    console.error("[postAddPlaylistTrack] DB get error:", err);
    return res.code(500).send({ error: "Failed to load playlist." });
  }

  if (!playlist) {
    return res.code(404).send({ error: "Playlist not found." });
  }
  if (playlist.owner !== userId) {
    return res.code(403).send({ error: "You do not own this playlist." });
  }


  const tracks: any[] = playlist.tracks ?? [];
  const config = client.config as any;
  const limit: number = config.features?.LIMIT_TRACK ?? 50;
  if (tracks.length >= limit) {
    return res.code(400).send({ error: `Track limit reached (${limit}).` });
  }

  let result: any;
  try {
    result = await client.mewslink.search(trimmed);
  } catch (err) {
    console.error("[postAddPlaylistTrack] Search error:", err);
    return res.code(502).send({ error: "Failed to resolve track — search service unavailable." });
  }

  if (!result?.tracks?.length) {
    return res.code(400).send({ error: "No track found for that Spotify URL." });
  }

  const track = result.tracks[0];

  const isDuplicate = tracks.some((t: any) => t.uri === track.uri || t.uri === trimmed);
  if (isDuplicate) {
    return res.code(409).send({ error: "This track is already in the playlist." });
  }

  const entry = {
    title: track.title ?? "Unknown",
    uri: track.uri ?? trimmed,
    length: track.duration ?? 0,
    thumbnail: track.artworkUrl ?? null,
    author: track.author ?? "Unknown",
    requester: userId,
  };

  try {
    await (client.db.playlist as any).push(`${id}.tracks`, entry);
  } catch (err) {
    console.error("[postAddPlaylistTrack] DB push error:", err);
    return res.code(500).send({ error: "Failed to save track to playlist." });
  }

  return res.code(201).send(entry);
}
