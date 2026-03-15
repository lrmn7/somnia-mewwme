export interface GuildStats {
  guildId: string;
  listenTimeMs: number;
  tracksPlayed: number;
  updatedAt: number; // Date.now() timestamp
}
