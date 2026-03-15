export interface NotifyTwitch {
  GuildId: string;
  GuildName: string;
  TokenAccess: string | null;
  ExpiresIn: string | null;
  Notifications: Array<{
    TwitchUsername: string;
    ChannelID: string;
    Content: string;
    LastStatus: string;
  }>;
}
