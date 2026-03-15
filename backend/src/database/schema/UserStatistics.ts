export interface UserStatistics {
  guildId: string;
  userId: string;
  messageCount: number;
  voiceTime: number;
  reactionCount: number;
  topChannels: { [channelId: string]: number };
  voiceJoinTime: number | null;
  lastUpdated: number;
  achievements?: string[];
  joinDate: number;
  daysActive: number;
  lastActiveDay: number;
  firstMessageDate: number | null;
}
