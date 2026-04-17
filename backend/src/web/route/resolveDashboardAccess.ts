import { Manager } from "../../manager.js";
import { computeWeb3Quota } from "./web3Premium.js";

export interface DashboardUserPerm {
  /** Is the bot owner */
  isOwner: boolean;
  /** Is a bot admin */
  isAdmin: boolean;
  /** Has an active premium subscription (any source) */
  isPremium: boolean;
  /** Has the Discord ManageGuild permission for the guild */
  hasManageGuild: boolean;
  /** Has voted on Top.gg */
  isVoter: boolean;
  /** Premium via role */
  isPremiumRole: boolean;
  /** Legacy user premium */
  isPremiumLegacyUser: boolean;
  /** Legacy guild premium */
  isPremiumLegacyGuild: boolean;
  /** Web3 on-chain user premium */
  isPremiumWeb3: boolean;
  /** Web3 on-chain guild premium (claimed via quota) */
  isPremiumWeb3Guild: boolean;
}

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
    isPremiumRole: false,
    isPremiumLegacyUser: false,
    isPremiumLegacyGuild: false,
    isPremiumWeb3: false,
    isPremiumWeb3Guild: false,
  };

  try {
    if (guildId) {
      const legacyGuild = await client.db.PremiumGuildLegacy.get(guildId);
      if (legacyGuild?.isPremium) perm.isPremiumLegacyGuild = true;

      // Check Web3 guild premium (claimed via quota)
      try {
        const allWeb3 = await client.db.Web3Premium.all();
        const sponsorWeb3 = allWeb3.find((entry: any) => {
          const data = entry.value || entry.data || entry;
          return (
            data.redeemedGuilds &&
            Array.isArray(data.redeemedGuilds) &&
            data.redeemedGuilds.includes(guildId) &&
            data.expiresAt > Date.now()
          );
        });
        if (sponsorWeb3) perm.isPremiumWeb3Guild = true;
      } catch {
        // Ignore Web3 guild check failures
      }
    }

    if (userId) {
      const legacyUser = await client.db.PremiumUserLegacy.get(userId);
      if (legacyUser?.isPremium) perm.isPremiumLegacyUser = true;

      // Check Web3 premium
      try {
        const web3Quota = await computeWeb3Quota(client, userId);
        if (web3Quota > 0) {
          perm.isPremiumWeb3 = true;
        }
      } catch {
        // Ignore Web3 premium check failures
      }

      try {
        if (client.config.PremiumRole?.Enable !== false) {
          const premiumGuildId = client.config.PremiumRole?.GuildID;
          const premiumRoleId = client.config.PremiumRole?.RoleID;
          if (premiumGuildId && premiumRoleId) {
            const supportGuild = await client.guilds.fetch(premiumGuildId).catch(() => null);
            if (supportGuild) {
              const supportMember = await supportGuild.members.fetch(userId).catch(() => null);
              if (supportMember?.roles.cache.has(premiumRoleId)) {
                perm.isPremiumRole = true;
              }
            }
          }
        }
      } catch {
        // Ignore role check failures
      }

      perm.isOwner = userId === client.owner;
      perm.isAdmin = !perm.isOwner && (client.config.bot.ADMIN?.includes(userId) ?? false);

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

  perm.isPremium =
    perm.isPremiumRole ||
    perm.isPremiumLegacyUser ||
    perm.isPremiumLegacyGuild ||
    perm.isPremiumWeb3Guild;

  return perm;
}

/**
 *
 * @param accessLevels - The access level(s) from config, e.g. ["Premium"] or ["Member"]
 * @param perm - The resolved user permission object
 * @returns true if the user has access
 */
export function hasFeatureAccess(
  accessLevels: string[] | undefined,
  perm: DashboardUserPerm
): boolean {
  if (!accessLevels || accessLevels.length === 0)
    return perm.isOwner || perm.isAdmin || perm.isPremium;

  if (perm.isOwner || perm.isAdmin) return true;

  for (const level of accessLevels) {
    switch (level) {
      case "Member":
        return true;
      case "Voter":
        if (perm.isVoter || perm.isPremium) return true;
        break;
      case "Premium":
        if (perm.isPremium) return true;
        break;
      case "Web3Premium":
        if (perm.isPremiumWeb3 || perm.isPremiumWeb3Guild) return true;
        break;
      case "Web3Guild":
        if (perm.isPremiumWeb3Guild) return true;
        break;
      case "PremiumRole":
        if (perm.isPremiumRole) return true;
        break;
      case "Web3Premium":
        if (perm.isPremiumWeb3 || perm.isPremiumWeb3Guild) return true;
        break;
      case "Web3Guild":
        if (perm.isPremiumWeb3Guild) return true;
        break;
      case "Manager":
        if (perm.hasManageGuild) return true;
        break;
      case "Admin":
        break;
      case "Owner":
        break;
      default:
        if (perm.isPremium) return true;
        break;
    }
  }

  return false;
}

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
    AiChat: ["Premium"] as string[],
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
    AiChat: cfg.AiChat ?? defaults.AiChat,
  };

  if (!_dashAccessLoggedOnce) {
    _dashAccessLoggedOnce = true;
  }

  return resolved;
}

export const DASHBOARD_SOURCES: Record<string, string> = {
  soundcloud: "soundcloud",
  apple_music: "apple",
  spotify: "spotify",
  youtube: "youtube",
  youtube_music: "youtube_music",
  deezer: "deezer",
  tidal: "tidal",
};

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

export function buildSourceAccessMap(
  client: Manager,
  perm: DashboardUserPerm
): Record<string, { hasAccess: boolean; requirement: string }> {
  const sourceCfg = getDefaultSourceDashboardConfig(client);
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
