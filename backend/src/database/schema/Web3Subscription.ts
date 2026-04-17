export interface Web3Subscription {
  userId: string;
  txHash: string;
  walletAddress: string;
  tier: string;
  quotaValue: number;
  amount: string;
  startTime: number;
  expiredAt: number;
  status: "active" | "expired";
}
