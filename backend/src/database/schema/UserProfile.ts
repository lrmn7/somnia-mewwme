export interface UserProfile {
  userId: string;
  firstLogin: number;
  lastLogin: number;
  loginCount: number;
  walletAddress?: string | null;
  walletProvider?: string | null;
  walletConnectedAt?: number | null;
}
