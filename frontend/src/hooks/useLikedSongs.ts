import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { LikedTrack } from "@/types/player";

export function useLikedSongs() {
  const [liked, setLiked] = useState<LikedTrack[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const { data } = await api.get<LikedTrack[]>("/api/liked");
      setLiked(data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const likedUris = new Set(liked.map((t) => t.uri));

  const toggle = useCallback(
    async (track: { title: string; uri: string; author: string; thumbnail: string | null; length: number }) => {
      const isLiked = likedUris.has(track.uri);
      // Optimistic update
      if (isLiked) {
        setLiked((prev) => prev.filter((t) => t.uri !== track.uri));
      } else {
        setLiked((prev) => [{ ...track, likedAt: new Date().toISOString() }, ...prev]);
      }
      try {
        await api.post("/api/liked", track);
      } catch {
        // Rollback
        fetch();
      }
    },
    [likedUris, fetch]
  );

  return { liked, likedUris, loading, toggle, refetch: fetch };
}
