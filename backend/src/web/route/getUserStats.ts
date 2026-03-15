import { Manager } from "../../manager.js";
import Fastify from "fastify";

/**
 * GET /v1/user/:userId/stats
 *
 * Returns the user's music statistics from the bot database:
 * - totalSongsPlayed
 * - topTracks (top 10)
 * - topArtists (top 10)
 */
export async function getUserStats(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  const { userId } = req.params as Record<string, string>;

  const [played, topTrack, topArtist] = await Promise.all([
    client.db.PlayedSongUser.get(userId),
    client.db.TopTrack.get(userId),
    client.db.TopArtist.get(userId),
  ]);

  res.send({
    userId,
    totalSongsPlayed: played?.totalSongsPlayed ?? 0,
    listenTimeMs: played?.listenTimeMs ?? 0,
    topTracks: (topTrack?.Tracks ?? [])
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10)
      .map((t: any) => ({
        name: t.name,
        count: t.count,
        artworkUrl: t.artworkUrl ?? null,
        trackUrl: t.trackUrl ?? null,
      })),
    topArtists: (topArtist?.Artists ?? [])
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10)
      .map((a: any) => ({
        name: a.name,
        count: a.count,
        artworkUrl: a.artworkUrl ?? null,
        artistUrl: a.artistUrl ?? null,
      })),
  });
}
