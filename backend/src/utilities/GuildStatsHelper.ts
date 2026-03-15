import { Manager } from "../manager.js";

/**
 * Session-like shape expected by guild stats helper methods.
 * Matches the fields captured in TopStatsSession's StatsSession.
 */
interface GuildSessionData {
  guildId: string;
  trackIdentifier: string;
  trackName: string;
  trackUrl: string;
  artistName: string;
  artistUrl: string;
  artworkUrl: string | null;
}

/**
 * Helper methods for persisting guild-level music statistics.
 * Keeps the logic separate from the per-user stats code.
 */
export const GuildStatsHelper = {
  /**
   * Add accumulated listen time (ms) to the guild stats record.
   * Called on every session flush (even < 60 s).
   */
  async addListenTime(client: Manager, guildId: string, addMs: number): Promise<void> {
    if (addMs <= 0) return;
    try {
      let data = await client.db.GuildStats.get(guildId);
      if (!data) {
        data = { guildId, listenTimeMs: 0, tracksPlayed: 0, updatedAt: Date.now() };
      }
      data.listenTimeMs += addMs;
      data.updatedAt = Date.now();
      await client.db.GuildStats.set(guildId, data);
    } catch (err) {
      client.logger.warn(
        "GuildStatsHelper",
        `Failed to add listen time for guild ${guildId}: ${String(err)}`
      );
    }
  },

  /**
   * Called when a Spotify track has been playing for >= 60 s.
   * Increments guild tracks_played and updates top tracks / top artists.
   */
  async onSixtySeconds(client: Manager, session: GuildSessionData): Promise<void> {
    const { guildId, trackIdentifier, trackName, trackUrl, artistName, artistUrl, artworkUrl } =
      session;

    // ── guild_stats.tracks_played ──────────────────────────────────
    try {
      let stats = await client.db.GuildStats.get(guildId);
      if (!stats) {
        stats = { guildId, listenTimeMs: 0, tracksPlayed: 0, updatedAt: Date.now() };
      }
      stats.tracksPlayed += 1;
      stats.updatedAt = Date.now();
      await client.db.GuildStats.set(guildId, stats);
    } catch (err) {
      client.logger.warn(
        "GuildStatsHelper",
        `Failed to increment tracksPlayed for guild ${guildId}: ${String(err)}`
      );
    }

    // ── guild_top_tracks ───────────────────────────────────────────
    try {
      let topTrackEntry = await client.db.GuildTopTrack.get(guildId);
      if (!topTrackEntry) {
        topTrackEntry = { guildId, Tracks: [] };
      }
      const existing = topTrackEntry.Tracks.find((t) => t.trackId === trackIdentifier);
      if (existing) {
        existing.count += 1;
        if (!existing.trackUrl && trackUrl) existing.trackUrl = trackUrl;
      } else {
        topTrackEntry.Tracks.push({
          trackId: trackIdentifier,
          name: trackName,
          trackUrl,
          artworkUrl,
          count: 1,
        });
      }
      await client.db.GuildTopTrack.set(guildId, topTrackEntry);
    } catch (err) {
      client.logger.warn(
        "GuildStatsHelper",
        `Failed to update top tracks for guild ${guildId}: ${String(err)}`
      );
    }

    // ── guild_top_artists ──────────────────────────────────────────
    try {
      let topArtistEntry = await client.db.GuildTopArtist.get(guildId);
      if (!topArtistEntry) {
        topArtistEntry = { guildId, Artists: [] };
      }
      // Use normalized artist name as the ID
      const artistId = artistName.toLowerCase();
      const existing = topArtistEntry.Artists.find((a) => a.artistId === artistId);
      if (existing) {
        existing.count += 1;
        if (!existing.artistUrl && artistUrl) existing.artistUrl = artistUrl;
      } else {
        topArtistEntry.Artists.push({
          artistId,
          name: artistName,
          artistUrl,
          artworkUrl,
          count: 1,
        });
      }
      await client.db.GuildTopArtist.set(guildId, topArtistEntry);
    } catch (err) {
      client.logger.warn(
        "GuildStatsHelper",
        `Failed to update top artists for guild ${guildId}: ${String(err)}`
      );
    }
  },
};
