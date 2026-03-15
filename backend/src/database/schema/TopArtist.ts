export interface TopArtist {
  userId: string;
  username: string;
  Artists: Array<{
    name: string;
    count: number;
    artworkUrl?: string | null;
    artistUrl?: string | null;
  }>;
}
