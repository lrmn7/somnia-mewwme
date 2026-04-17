export interface GuildContract {
  contractAddress: string;
  factoryAddress: string;
  creatorDiscordId: string;
  creatorWallet: string;
  createdAt: number;
  guildName?: string;
  guildIcon?: string | null;
}
