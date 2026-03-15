import { Manager } from "../../manager.js";
import Fastify from "fastify";

/**
 * GET /v1/guild/:guildId/stats
 *
 * Returns guild-level music statistics:
 * - listenTimeMs
 * - tracksPlayed
 * - topTracks  (top 10 by play_count DESC)
 * - topArtists (top 10 by play_count DESC)
 */
export async function getGuildStats(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  const { guildId } = req.params as Record<string, string>;

  const [stats, topTrackEntry, topArtistEntry] = await Promise.all([
    client.db.GuildStats.get(guildId),
    client.db.GuildTopTrack.get(guildId),
    client.db.GuildTopArtist.get(guildId),
  ]);

  res.send({
    guildId,
    listenTimeMs: stats?.listenTimeMs ?? 0,
    tracksPlayed: stats?.tracksPlayed ?? 0,
    topTracks: (topTrackEntry?.Tracks ?? [])
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((t) => ({
        trackId: t.trackId,
        name: t.name,
        trackUrl: t.trackUrl ?? null,
        artworkUrl: t.artworkUrl ?? null,
        count: t.count,
      })),
    topArtists: (topArtistEntry?.Artists ?? [])
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((a) => ({
        artistId: a.artistId,
        name: a.name,
        artistUrl: a.artistUrl ?? null,
        artworkUrl: a.artworkUrl ?? null,
        count: a.count,
      })),
  });
}
