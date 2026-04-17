import axios from "axios";
import type { Manager } from "../manager.js";

export interface ChartTrack {
  rank: number;
  title: string;
  artist: string;
  spotify_url: string;
  cover: string | null;
  duration: number;
}

interface ChartGuruTrack {
  trackId: string;
  name: string;
  mainArtistName: string;
  rank: number;
  previousRank: number;
  rankDelta: number;
  dailyStreams: number;
  totalStreams: number;
  imageUrl: string;
  spotifyUrl: string;
  lastUpdated: string;
}

interface CacheEntry {
  tracks: ChartTrack[];
  expire: number;
}

export function createSpotifyTopChartService(client: Manager) {
  const CHARTGURU_BASE = "https://topchart-api.vercel.app/api/stats/tracks";
  const chartCache = new Map<string, CacheEntry>();
  const CACHE_TTL = 1 * 60 * 60 * 1000; // 1 hour

  async function fetchChartGuru(country: string): Promise<ChartTrack[]> {
    const { data } = await axios.get<{ tracks: ChartGuruTrack[] }>(
      `${CHARTGURU_BASE}?country=${encodeURIComponent(country)}`,
      { timeout: 15_000 }
    );

    return (data.tracks ?? []).slice(0, 50).map((t) => ({
      rank: t.rank,
      title: t.name,
      artist: t.mainArtistName,
      spotify_url: t.spotifyUrl,
      cover: t.imageUrl || null,
      duration: 0,
    }));
  }

  async function getTopChart(country: string): Promise<ChartTrack[]> {
    const key = country.toLowerCase();

    // Check cache
    const cached = chartCache.get(key);
    if (cached && Date.now() < cached.expire) {
      return cached.tracks;
    }

    try {
      const tracks = await fetchChartGuru(key);
      if (tracks.length > 0) {
        chartCache.set(key, { tracks, expire: Date.now() + CACHE_TTL });
        return tracks;
      }
    } catch (err) {}
    if (key !== "global") {
      return getTopChart("global");
    }

    return [];
  }

  return { getTopChart };
}

export type SpotifyTopChartService = ReturnType<typeof createSpotifyTopChartService>;
