import { Manager } from "../../manager.js";
import Fastify from "fastify";
import { ChannelType, PermissionsBitField } from "discord.js";

/* ── In-memory caches ─────────────────────────────────────────────────────── */

/** Full response cache – 60 s TTL */
let cachedResponse: object | null = null;
let cacheExpiry = 0;

/** Invite link cache – 10 min TTL per guild */
const inviteCache = new Map<string, { url: string | null; expiresAt: number }>();
const INVITE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/* ── Helpers ───────────────────────────────────────────────────────────────── */

async function resolveInvite(client: Manager, guildId: string): Promise<string | null> {
  const now = Date.now();
  const cached = inviteCache.get(guildId);
  if (cached && cached.expiresAt > now) return cached.url;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    inviteCache.set(guildId, { url: null, expiresAt: now + INVITE_TTL_MS });
    return null;
  }

  const me = guild.members.me;
  if (!me || !me.permissions.has(PermissionsBitField.Flags.CreateInstantInvite)) {
    inviteCache.set(guildId, { url: null, expiresAt: now + INVITE_TTL_MS });
    return null;
  }

  // Find a text channel where we can create an invite
  const channel = guild.channels.cache.find(
    (c) =>
      c.type === ChannelType.GuildText &&
      c.permissionsFor(me).has(PermissionsBitField.Flags.CreateInstantInvite)
  );

  if (!channel) {
    inviteCache.set(guildId, { url: null, expiresAt: now + INVITE_TTL_MS });
    return null;
  }

  try {
    const invite = await (channel as any).createInvite({ maxAge: 0, maxUses: 0, unique: false });
    const url = `https://discord.gg/${invite.code}`;
    inviteCache.set(guildId, { url, expiresAt: now + INVITE_TTL_MS });
    return url;
  } catch {
    inviteCache.set(guildId, { url: null, expiresAt: now + INVITE_TTL_MS });
    return null;
  }
}

/* ── Route handler ─────────────────────────────────────────────────────────── */

/**
 * GET /v1/global-stats
 *
 * Returns aggregated global music statistics:
 * - globalListenTimeMs, globalTracksPlayed
 * - topGuilds  (top 10 by tracksPlayed)
 * - topTracks  (top 10 across all guilds)
 * - topArtists (top 10 across all guilds)
 */
export async function getGlobalStats(
  client: Manager,
  _req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  const now = Date.now();

  // Return cached response if still fresh
  if (cachedResponse && cacheExpiry > now) {
    return res.send(cachedResponse);
  }

  // ── Fetch all guild data in parallel ─────────────────────────────────────
  const [allStats, allTopTracks, allTopArtists] = await Promise.all([
    (client.db.GuildStats as any).all() as Promise<{ id: string; value: any }[]>,
    (client.db.GuildTopTrack as any).all() as Promise<{ id: string; value: any }[]>,
    (client.db.GuildTopArtist as any).all() as Promise<{ id: string; value: any }[]>,
  ]);

  // ── Global totals ────────────────────────────────────────────────────────
  let globalListenTimeMs = 0;
  let globalTracksPlayed = 0;

  for (const entry of allStats) {
    globalListenTimeMs += entry.value?.listenTimeMs ?? 0;
    globalTracksPlayed += entry.value?.tracksPlayed ?? 0;
  }

  // ── Top 10 guilds by tracksPlayed ────────────────────────────────────────
  const guildEntries = allStats
    .filter((e) => e.value && e.value.tracksPlayed > 0)
    .sort((a, b) => (b.value.tracksPlayed ?? 0) - (a.value.tracksPlayed ?? 0))
    .slice(0, 10);

  const topGuilds = await Promise.all(
    guildEntries.map(async (entry) => {
      const guildId = entry.id;
      const guild = client.guilds.cache.get(guildId);
      const inviteUrl = await resolveInvite(client, guildId);
      return {
        guildId,
        name: guild?.name ?? "Unknown Server",
        iconUrl: guild?.iconURL({ size: 128 }) ?? null,
        memberCount: guild?.memberCount ?? 0,
        tracksPlayed: entry.value.tracksPlayed ?? 0,
        listenTimeMs: entry.value.listenTimeMs ?? 0,
        inviteUrl,
      };
    })
  );

  // ── Aggregate top tracks across all guilds ───────────────────────────────
  const trackMap = new Map<
    string,
    {
      trackId: string;
      name: string;
      trackUrl: string | null;
      artworkUrl: string | null;
      count: number;
    }
  >();
  for (const entry of allTopTracks) {
    const tracks = entry.value?.Tracks;
    if (!Array.isArray(tracks)) continue;
    for (const t of tracks) {
      const existing = trackMap.get(t.trackId);
      if (existing) {
        existing.count += t.count ?? 0;
        // Prefer non-null metadata
        if (!existing.artworkUrl && t.artworkUrl) existing.artworkUrl = t.artworkUrl;
        if (!existing.trackUrl && t.trackUrl) existing.trackUrl = t.trackUrl;
      } else {
        trackMap.set(t.trackId, {
          trackId: t.trackId,
          name: t.name,
          trackUrl: t.trackUrl ?? null,
          artworkUrl: t.artworkUrl ?? null,
          count: t.count ?? 0,
        });
      }
    }
  }
  const topTracks = [...trackMap.values()].sort((a, b) => b.count - a.count).slice(0, 10);

  // ── Aggregate top artists across all guilds ──────────────────────────────
  const artistMap = new Map<
    string,
    {
      artistId: string;
      name: string;
      artistUrl: string | null;
      artworkUrl: string | null;
      count: number;
    }
  >();
  for (const entry of allTopArtists) {
    const artists = entry.value?.Artists;
    if (!Array.isArray(artists)) continue;
    for (const a of artists) {
      const existing = artistMap.get(a.artistId);
      if (existing) {
        existing.count += a.count ?? 0;
        if (!existing.artworkUrl && a.artworkUrl) existing.artworkUrl = a.artworkUrl;
        if (!existing.artistUrl && a.artistUrl) existing.artistUrl = a.artistUrl;
      } else {
        artistMap.set(a.artistId, {
          artistId: a.artistId,
          name: a.name,
          artistUrl: a.artistUrl ?? null,
          artworkUrl: a.artworkUrl ?? null,
          count: a.count ?? 0,
        });
      }
    }
  }
  const topArtists = [...artistMap.values()].sort((a, b) => b.count - a.count).slice(0, 10);

  // ── Build & cache response ───────────────────────────────────────────────
  const response = {
    globalListenTimeMs,
    globalTracksPlayed,
    totalGuilds: client.guilds.cache.size,
    topGuilds,
    topTracks,
    topArtists,
  };

  cachedResponse = response;
  cacheExpiry = now + 60_000; // 60 s

  res.send(response);
}
