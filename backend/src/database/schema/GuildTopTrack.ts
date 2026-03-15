export interface GuildTopTrack {
  guildId: string;
  Tracks: Array<{
    trackId: string; // Spotify track identifier
    name: string;
    trackUrl: string;
    artworkUrl?: string | null;
    count: number;
  }>;
}
