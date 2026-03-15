export interface TempVoiceChannelSetting {
  guildId: string;
  tempVoiceEnabled: boolean;
  createVoiceChannelId?: string;
  story?: { story: string[] };
}
