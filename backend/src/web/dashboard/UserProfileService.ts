import type { Manager } from "../../manager.js";

export function createUserProfileService(client: Manager) {
  type Identity = {
    username?: string;
    discriminator?: string;
    avatar?: string | null;
    global_name?: string | null;
  };

  return {
    async recordLogin(userId: string, identity?: Identity) {
      const existing = await client.db.UserProfile.get(userId);
      const now = Date.now();

      const profile = existing
        ? {
            ...existing,
            lastLogin: now,
            loginCount: existing.loginCount + 1,
            ...(identity?.username ? { username: identity.username } : {}),
            ...(identity?.discriminator ? { discriminator: identity.discriminator } : {}),
            ...(identity?.avatar !== undefined ? { avatar: identity.avatar } : {}),
            ...(identity?.global_name !== undefined ? { global_name: identity.global_name } : {}),
          }
        : {
            userId,
            firstLogin: now,
            lastLogin: now,
            loginCount: 1,
            username: identity?.username ?? null,
            discriminator: identity?.discriminator ?? null,
            avatar: identity?.avatar ?? null,
            global_name: identity?.global_name ?? null,
          };

      await client.db.UserProfile.set(userId, profile);
      return profile;
    },

    async getProfile(userId: string) {
      return client.db.UserProfile.get(userId);
    },
  };
}
