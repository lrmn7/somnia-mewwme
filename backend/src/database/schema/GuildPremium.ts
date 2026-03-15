export interface GuildPremium {
  id: string;
  isPremium: boolean;
  redeemedBy: {
    id: string;
    name: string;
    createdAt: number;
    GuildiconURL: string | null;
    ownerId: string;
    ownerName: string;
    ownerMention: string;
  };
  redeemedAt: number;
  expiresAt: number | "lifetime";
  plan: string;
}
