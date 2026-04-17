export interface Web3Premium {
  walletAddress: string;
  txHash: string;
  plan: string;
  amount: string;
  isUserPremium: boolean;
  maxQuota: number;
  usedQuota: number;
  redeemedGuilds: string[];
  redeemedAt: number;
  activatedAt: number;
  expiresAt: number;
}
