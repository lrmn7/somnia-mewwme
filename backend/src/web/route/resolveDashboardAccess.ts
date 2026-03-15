/**
 * Shared helper for resolving dashboard feature access based on
 * DASHBOARD_ACCESS config — mirrors the bot's COMMANDS_ACCESS / accessableby
 * logic so the owner can control which features require premium from config.yml.
 *
 * Supported access levels (same as Accessableby enum):
 *   "Member"            → everyone has access (no premium required)
 *   "Voter"             → user has voted on Top.gg
 *   "Premium"           → Web3 premium (user or guild)
 *   "Admin"             → bot admin only
 *   "Owner"             → bot owner only
 *   "Manager"           → Discord Manage Server permission
 */

import { Manager } from "../../manager.js";

export interface DashboardUserPerm {
  /** Is the bot owner */
  isOwner: boolean;
  /** Is a bot admin */
  isAdmin: boolean;
  /** Has an active premium subscription (Web3) */
  isPremium: boolean;
  /** Has the Discord ManageGuild permission for the guild */
  hasManageGuild: boolean;
  /** Has voted on Top.gg */
  isVoter: boolean;
}

/**
 * Build the full permission object for a dashboard user in the context of a guild.
 * This queries all the same databases as the bot's interactionCreate handler.
 */
export async function buildDashboardUserPerm(
  client: Manager,
  userId: string | undefined,
  guildId: string | undefined
): Promise<DashboardUserPerm> {
  const perm: DashboardUserPerm = {
    isOwner: false,
    isAdmin: false,
    isPremium: false,
    hasManageGuild: false,
    isVoter: false,
  };

  try {
    if (userId) {
      // Owner / Admin bypass
      perm.isOwner = userId === String(client.owner);
      perm.isAdmin = !perm.isOwner && (client.config.bot.ADMIN?.map(String).includes(userId) ?? false);

      // Voter check via Top.gg
      try {
        if (client.topgg) {
          const { TopggServiceEnum } = await import("../../services/TopggService.js");
          const voteResult = await client.topgg.checkVote(userId);
          if (voteResult === TopggServiceEnum.VOTED) {
            perm.isVoter = true;
          }
        }
      } catch {
        // Ignore vote check failures
      }

      // Manage Guild permission check
      if (guildId) {
        try {
          const guild = await client.guilds.fetch(guildId).catch(() => null);
          if (guild) {
            const member = await guild.members.fetch(userId).catch(() => null);
            if (member) {
              const { PermissionsBitField } = await import("discord.js");
              perm.hasManageGuild = member.permissions.has(PermissionsBitField.Flags.ManageGuild);
            }
          }
        } catch {
          // Ignore
        }
      }
    }
  } catch {
    // On failure, default to no access
  }

  // ── Web3 premium check ──
  let isPremiumUser = false;
  let isPremiumGuild = false;

  if (userId) {
    const userPremium = await client.db.premium.get(userId);
    if (userPremium?.isPremium) {
      if (userPremium.expiresAt === "lifetime" || (typeof userPremium.expiresAt === "number" && userPremium.expiresAt > Date.now())) {
        isPremiumUser = true;
      }
    }
  }

  if (guildId) {
    const guildPremium = await client.db.preGuild.get(guildId);
    if (guildPremium?.isPremium) {
      if (guildPremium.expiresAt === "lifetime" || (typeof guildPremium.expiresAt === "number" && guildPremium.expiresAt > Date.now())) {
        isPremiumGuild = true;
      }
    }
  }

  // Compute combined isPremium
  perm.isPremium = isPremiumUser || isPremiumGuild;

  return perm;
}

/**
 * Check if a user has access to a specific dashboard feature based on
 * the DASHBOARD_ACCESS config. This mirrors the bot's accessableby logic.
 *
 * @param accessLevels - The access level(s) from config, e.g. ["Premium"] or ["Member"]
 * @param perm - The resolved user permission object
 * @returns true if the user has access
 */
export function hasFeatureAccess(
  accessLevels: string[] | undefined,
  perm: DashboardUserPerm
): boolean {
  // If no config defined, default to premium-required (safe default)
  if (!accessLevels || accessLevels.length === 0)
    return perm.isOwner || perm.isAdmin || perm.isPremium;

  // Owner and Admin ALWAYS have access regardless of config
  if (perm.isOwner || perm.isAdmin) return true;

  // Check each access level — if ANY matches, access is granted
  for (const level of accessLevels) {
    switch (level) {
      case "Member":
        // Everyone has access
        return true;

      case "Voter":
        // Must have voted on Top.gg (or have premium — premium always includes voter perks)
        if (perm.isVoter || perm.isPremium) return true;
        break;

      case "Premium":
        // Web3 premium
        if (perm.isPremium) return true;
        break;

      case "Manager":
        if (perm.hasManageGuild) return true;
        break;

      case "Admin":
        // Already handled above (isAdmin always returns true)
        break;

      case "Owner":
        // Already handled above (isOwner always returns true)
        break;

      default:
        // Unknown level — treat as premium
        if (perm.isPremium) return true;
        break;
    }
  }

  return false;
}

/**
 * Quick helper to get the DASHBOARD_ACCESS config with safe defaults.
 *
 * IMPORTANT: ALL defaults are ["Premium"] (not "Member") so that if the
 * config section is missing or a key is absent, features are locked behind
 * premium — NOT open to everyone.  This prevents accidental public access
 * when the VPS config.yml does not include DASHBOARD_ACCESS.
 */
let _dashAccessLoggedOnce = false;
export function getDashboardAccessConfig(client: Manager) {
  // Safe default: everything requires Premium
  const defaults = {
    Filters: ["Premium"] as string[],
    TwentyFourSeven: ["Premium"] as string[],
    Autoplay: ["Premium"] as string[],
    LastFm: ["Premium"] as string[],
    Spotify: ["Premium"] as string[],
    SongRequest: ["Premium"] as string[],
    Language: ["Premium"] as string[],
    StatusVoiceChannel: ["Premium"] as string[],
    Prefix: ["Premium"] as string[],
    DjRole: ["Premium"] as string[],
    ControlButton: ["Premium"] as string[],
    Playlist: ["Premium"] as string[],
  };

  const cfg = client.config.DASHBOARD_ACCESS;
  if (!cfg) {
    client.logger.warn(
      "DashboardAccess",
      "DASHBOARD_ACCESS section is MISSING from config.yml! All features will require Premium by default."
    );
    return defaults;
  }

  const resolved = {
    Filters: cfg.Filters ?? defaults.Filters,
    TwentyFourSeven: cfg.TwentyFourSeven ?? defaults.TwentyFourSeven,
    Autoplay: cfg.Autoplay ?? defaults.Autoplay,
    LastFm: cfg.LastFm ?? defaults.LastFm,
    SongRequest: cfg.SongRequest ?? defaults.SongRequest,
    Language: cfg.Language ?? defaults.Language,
    StatusVoiceChannel: cfg.StatusVoiceChannel ?? defaults.StatusVoiceChannel,
    Prefix: cfg.Prefix ?? defaults.Prefix,
    DjRole: cfg.DjRole ?? defaults.DjRole,
    ControlButton: cfg.ControlButton ?? defaults.ControlButton,
    Playlist: (cfg as any).Playlist ?? defaults.Playlist,
  };

  // Log the resolved config once for debugging production issues
  if (!_dashAccessLoggedOnce) {
    _dashAccessLoggedOnce = true;
  }

  return resolved;
}

// ── Supported dashboard music sources ──────────────────────────────────────────
// Maps source id to its search engine name used by Mewslink
export const DASHBOARD_SOURCES: Record<string, string> = {
  soundcloud: "soundcloud",
  apple_music: "apple",
  spotify: "spotify",
  youtube: "youtube",
  youtube_music: "youtube_music",
  deezer: "deezer",
  tidal: "tidal",
};

/**
 * Get the DefaultSourceDashboard config with safe defaults.
 * Each source maps to the access level(s) required for a guild to select it.
 */
export function getDefaultSourceDashboardConfig(client: Manager): Record<string, string[]> {
  const defaults: Record<string, string[]> = {
    soundcloud: ["Member"],
    apple_music: ["Member"],
    spotify: ["Member"],
    youtube: ["Premium"],
    youtube_music: ["Premium"],
    deezer: ["Member"],
    tidal: ["Member"],
  };

  const cfg = client.config.DefaultSourceDashboard;
  if (!cfg) return defaults;

  const resolved: Record<string, string[]> = {};
  for (const key of Object.keys(defaults)) {
    resolved[key] = (cfg as Record<string, string[]>)[key] ?? defaults[key];
  }
  return resolved;
}

/**
 * Build the source access map for a guild user, checking each source against
 * DefaultSourceDashboard config.
 *
 * Returns per-source { hasAccess, requirement } using the front-end source ids
 * (spotify, apple, soundcloud, deezer, tidal, youtube, youtube_music).
 */
export function buildSourceAccessMap(
  client: Manager,
  perm: DashboardUserPerm
): Record<string, { hasAccess: boolean; requirement: string }> {
  const sourceCfg = getDefaultSourceDashboardConfig(client);
  // Map config keys (e.g. "apple_music") to frontend ids (e.g. "apple")
  const FE_ID: Record<string, string> = {
    soundcloud: "soundcloud",
    apple_music: "apple",
    spotify: "spotify",
    youtube: "youtube",
    youtube_music: "youtube_music",
    deezer: "deezer",
    tidal: "tidal",
  };

  const result: Record<string, { hasAccess: boolean; requirement: string }> = {};
  for (const [cfgKey, levels] of Object.entries(sourceCfg)) {
    const feId = FE_ID[cfgKey] ?? cfgKey;
    result[feId] = {
      hasAccess: hasFeatureAccess(levels, perm),
      requirement: levels[0] ?? "Premium",
    };
  }
  return result;
}
