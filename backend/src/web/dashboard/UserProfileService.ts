import type { Manager } from "../../manager.js";

/**
 * Creates a user-profile service backed by the bot's main database
 * (`client.db.UserProfile`).
 *
 * Previously this stored profiles in data/user-profiles.json.
 * The DB uses userId as the key.
 */
export function createUserProfileService(client: Manager) {
  type Identity = {
    username?: string;
    discriminator?: string;
    avatar?: string | null;
    global_name?: string | null;
  };

  return {
    /**
     * Records (or updates) a login event for the given user.
     * Creates a new profile on the first login.
     * Returns the updated profile.
     */
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

    /** Returns the stored profile for a user, or undefined if not found. */
    async getProfile(userId: string) {
      return client.db.UserProfile.get(userId);
    },
  };
}
