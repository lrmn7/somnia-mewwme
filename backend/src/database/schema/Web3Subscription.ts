export interface Web3Subscription {
  id: string;
  discordUserId: string;
  walletAddress: string;
  tier: "basic" | "plus" | "pro";
  quota: number;
  months: number;
  amount: string;
  txHash: string;
  timestamp: number;
  expiresAt: number;
  isActive: boolean;
}
