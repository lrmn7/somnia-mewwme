export interface TopTrack {
  userId: string;
  username: string;
  Tracks: Array<{
    name: string;
    count: number;
    artworkUrl?: string | null;
    trackUrl?: string | null;
  }>;
}
