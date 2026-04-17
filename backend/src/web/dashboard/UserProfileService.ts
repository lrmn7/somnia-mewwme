import type { Manager } from "../../manager.js";

export function createUserProfileService(client: Manager) {
  return {
    async recordLogin(userId: string) {
      const existing = await client.db.UserProfile.get(userId);
      const now = Date.now();

      const profile = existing
        ? { ...existing, lastLogin: now, loginCount: existing.loginCount + 1 }
        : { userId, firstLogin: now, lastLogin: now, loginCount: 1 };

      await client.db.UserProfile.set(userId, profile);
      return profile;
    },

    async getProfile(userId: string) {
      return client.db.UserProfile.get(userId);
    },
  };
}
