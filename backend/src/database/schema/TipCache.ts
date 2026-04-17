export interface TipCache {
  guildId: string;
  senderAddress: string;
  senderDiscordId: string | null;
  amount: string;
  message: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
}
