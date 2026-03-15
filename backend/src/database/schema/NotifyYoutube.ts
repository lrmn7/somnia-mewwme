export interface NotifyYoutube {
  GuildId: string;
  GuildName: string;
  Notifications: Array<{
    YouTubeChannelId: string;
    ChannelID: string;
    Content: string;
    LastVideoId: string;
    LastPublishDate: string;
    LastStatusLive: boolean;
  }>;
}
