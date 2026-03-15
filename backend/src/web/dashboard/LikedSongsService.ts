import type { Manager } from "../../manager.js";

export interface LikedTrack {
  title: string;
  uri: string;
  author: string;
  thumbnail: string | null;
  length: number;
  likedAt: number;
}

/**
 * Creates a per-request-cycle (but long-lived) liked-songs service backed
 * directly by the bot's main database (`client.db.LikedSongs`).
 *
 * Each user's liked tracks are stored as a single row keyed by userId:
 *   { userId, tracks: LikedTrack[] }
 *
 * Previously this used a local JSON file (data/liked-songs.json).
 * Migration: on first read, the in-memory data is empty; previously liked
 * tracks in the old JSON file are NOT automatically migrated — users will
 * see a clean slate unless a one-off migration is run.
 */
export function createLikedSongsService(client: Manager) {
  return {
    /** Returns all liked tracks for a user (newest first). */
    async get(userId: string): Promise<LikedTrack[]> {
      const row = await client.db.LikedSongs.get(userId);
      return row?.tracks ?? [];
    },

    /**
     * Toggles a track's liked state for a user.
     * Returns { liked: true } when added, { liked: false } when removed.
     */
    async toggle(userId: string, track: Omit<LikedTrack, "likedAt">): Promise<{ liked: boolean }> {
      const row = await client.db.LikedSongs.get(userId);
      const tracks: LikedTrack[] = row?.tracks ?? [];
      const idx = tracks.findIndex((t) => t.uri === track.uri);

      if (idx >= 0) {
        tracks.splice(idx, 1);
        await client.db.LikedSongs.set(userId, { userId, tracks });
        return { liked: false };
      }

      tracks.unshift({ ...track, likedAt: Date.now() });
      await client.db.LikedSongs.set(userId, { userId, tracks });
      return { liked: true };
    },

    /** Returns true if the given URI is liked by the user. */
    async isLiked(userId: string, uri: string): Promise<boolean> {
      const row = await client.db.LikedSongs.get(userId);
      return (row?.tracks ?? []).some((t) => t.uri === uri);
    },
  };
}
