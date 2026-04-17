import type { Manager } from "../../manager.js";

export interface LikedTrack {
  title: string;
  uri: string;
  author: string;
  thumbnail: string | null;
  length: number;
  likedAt: number;
}

export function createLikedSongsService(client: Manager) {
  return {
    async get(userId: string): Promise<LikedTrack[]> {
      const row = await client.db.LikedSongs.get(userId);
      return row?.tracks ?? [];
    },

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

    async isLiked(userId: string, uri: string): Promise<boolean> {
      const row = await client.db.LikedSongs.get(userId);
      return (row?.tracks ?? []).some((t) => t.uri === uri);
    },
  };
}
