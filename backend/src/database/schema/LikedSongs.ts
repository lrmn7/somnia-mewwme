export interface LikedSongs {
  userId: string;
  tracks: Array<{
    title: string;
    uri: string;
    author: string;
    thumbnail: string | null;
    length: number;
    likedAt: number;
  }>;
}
