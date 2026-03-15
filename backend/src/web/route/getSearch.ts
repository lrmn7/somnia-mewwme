import { User } from "discord.js";
import { Manager } from "../../manager.js";
import Fastify from "fastify";
import { MewslinkSearchResultType } from "../../mewslink/main.js";
import {
  buildDashboardUserPerm,
  hasFeatureAccess,
  getDefaultSourceDashboardConfig,
  DASHBOARD_SOURCES,
} from "./resolveDashboardAccess.js";

function detectUrlSource(query: string): string | null {
  try {
    if (!/^https?:\/\//i.test(query.trim())) return null;
    const url = new URL(query.trim());
    const host = url.hostname.toLowerCase();
    if (host.includes("spotify.com") || host.includes("spotify.link")) return "spotify";
    if (host.includes("music.apple.com")) return "apple";
    if (host.includes("soundcloud.com")) return "soundcloud";
    if (host.includes("deezer.com") || host.includes("deezer.page.link")) return "deezer";
    if (host.includes("tidal.com") || host.includes("listen.tidal.com")) return "tidal";
    if (host.includes("music.youtube.com")) return "youtube_music";
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    return null;
  } catch {
    return null;
  }
}

const FE_TO_CFG: Record<string, string> = {
  soundcloud: "soundcloud",
  apple: "apple_music",
  spotify: "spotify",
  youtube: "youtube",
  youtube_music: "youtube_music",
  deezer: "deezer",
  tidal: "tidal",
};

const SOURCE_DISPLAY_NAMES: Record<string, string> = {
  spotify: "Spotify",
  apple: "Apple Music",
  soundcloud: "SoundCloud",
  deezer: "Deezer",
  tidal: "Tidal",
  youtube: "YouTube",
  youtube_music: "YouTube Music",
};

export async function getSearch(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  const query = (req.query as Record<string, string>)["identifier"];
  const requester = (req.query as Record<string, string>)["requester"];
  const source = (req.query as Record<string, string>)["source"];
  const guildId = (req.query as Record<string, string>)["guildId"];

  if (!query) {
    res.code(400);
    res.send({ error: "Search param not found" });
    return;
  }

  let effectiveSource = source || "spotify";
  const isDirectLink = /^https?:\/\//i.test(query.trim());

  if (guildId) {
    const guildDefaultSource = await client.db.GuildDefaultSource.get(guildId);
    const defaultSrc = guildDefaultSource ?? "spotify";
    if (!isDirectLink) {
      const cfgKey = FE_TO_CFG[defaultSrc];
      const engineName = cfgKey ? DASHBOARD_SOURCES[cfgKey] : defaultSrc;
      if (engineName) {
        effectiveSource = engineName;
      }
    }

    if (isDirectLink) {
      const urlSource = detectUrlSource(query);
      if (urlSource) {
        const cfgKey = FE_TO_CFG[urlSource];
        if (cfgKey) {
          const sourceCfg = getDefaultSourceDashboardConfig(client);
          const accessLevels = sourceCfg[cfgKey];
          if (accessLevels) {
            const perm = await buildDashboardUserPerm(client, requester, guildId);
            if (!hasFeatureAccess(accessLevels, perm)) {
              const requirement = accessLevels[0] ?? "Premium";
              const name = SOURCE_DISPLAY_NAMES[urlSource] ?? urlSource;
              res.code(403);
              res.send({
                error: `${name} links are not allowed in this server. This source requires ${requirement} access.`,
              });
              return;
            }
          }
        }
      }
    }
  }

  const user = await client.users.fetch(requester).catch(() => undefined);

  const FALLBACK_CHAIN: Record<string, string[]> = {
    spotify: ["deezer", "youtube_music", "apple", "soundcloud"],
    deezer: ["spotify", "youtube_music", "apple", "soundcloud"],
    apple: ["spotify", "deezer", "youtube_music", "soundcloud"],
    soundcloud: ["spotify", "deezer", "youtube_music", "apple"],
    tidal: ["spotify", "deezer", "youtube_music", "apple", "soundcloud"],
    youtube: ["youtube_music", "spotify", "soundcloud", "deezer"],
    youtube_music: ["youtube", "spotify", "soundcloud", "deezer"],
  };

  const sourcesToTry = isDirectLink
    ? [effectiveSource]
    : [effectiveSource, ...(FALLBACK_CHAIN[effectiveSource] || [])];

  let result: { playlistName?: string; tracks: any[]; type: any } | null = null;

  for (const src of sourcesToTry) {
    const engineName = FE_TO_CFG[src] ? DASHBOARD_SOURCES[FE_TO_CFG[src]] || src : src;
    const res_ = await client.mewslink
      .search(query, { requester: user, engine: engineName })
      .catch(() => ({
        playlistName: "mewwme@error@noNode",
        tracks: [] as any[],
        type: MewslinkSearchResultType.SEARCH,
      }));

    if (res_.tracks.length > 0) {
      result = res_;
      break;
    }
    if (res_.playlistName === "mewwme@error@noNode") continue;
    result = res_;
    break;
  }

  if (!result || (result.tracks.length === 0 && result.playlistName === "mewwme@error@noNode")) {
    res.code(404);
    res.send({ error: "No node avaliable!" });
    return;
  }
  res.send({
    type: result.type,
    playlistName: result.playlistName ?? null,
    tracks: result.tracks.map((track) => {
      const requesterQueue = track.requester as User;
      return {
        title: track.title,
        uri: track.uri,
        length: track.duration,
        thumbnail: track.artworkUrl,
        author: track.author,
        requester: requesterQueue
          ? {
              id: requesterQueue.id,
              username: requesterQueue.username,
              globalName: requesterQueue.globalName,
              defaultAvatarURL: requesterQueue.defaultAvatarURL ?? null,
            }
          : null,
      };
    }),
  });
}
