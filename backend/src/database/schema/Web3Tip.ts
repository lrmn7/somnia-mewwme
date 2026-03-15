export interface Web3Tip {
  id: string;
  guildId: string;
  senderWallet: string;
  amount: string;
  txHash: string;
  timestamp: number;
  message?: string;
}
