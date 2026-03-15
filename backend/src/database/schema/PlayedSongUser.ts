export interface PlayedSongUser {
  userId: string;
  username: string;
  displayname: string;
  totalSongsPlayed: number;
  avatarURL: string;
  listenTimeMs?: number;
}
