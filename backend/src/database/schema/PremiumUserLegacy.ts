export interface PremiumUserLegacy {
  id: string;
  isPremium: boolean;
  redeemedBy: {
    id: string;
    username: string;
    displayName: string;
    avatarURL: string | null;
    createdAt: number;
    mention: string;
  };
  redeemedAt: number;
  expiresAt: number | "lifetime";
  plan: string;
  tier?: string;
  quotaValue?: number;
}
