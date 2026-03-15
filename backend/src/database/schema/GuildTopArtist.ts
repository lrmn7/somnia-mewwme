export interface GuildTopArtist {
  guildId: string;
  Artists: Array<{
    artistId: string; // normalized artist name as ID
    name: string;
    artistUrl: string;
    artworkUrl?: string | null;
    count: number;
  }>;
}
