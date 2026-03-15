import { Manager } from "../manager.js";
import { MewslinkPlayer } from "../mewslink/main.js";
import { User } from "discord.js";
import { TopTrack } from "./TopTrack.js";
import { TopArtist } from "./TopArtist.js";
import { MilestoneTrack } from "./MilestoneTrack.js";
import { GuildStatsHelper } from "./GuildStatsHelper.js";

/**
 * Minimum accumulated playing time (ms) before Tracks Played,
 * TopTrack and TopArtist stats are saved. Only applies to Spotify tracks.
 */
const MIN_LISTEN_MS = 60_000;

interface StatsSession {
  client: Manager;
  userId: string;
  guildId: string;
  trackIdentifier: string;
  source: string;

  /* ── track metadata for guild stats ──────────────────────────── */
  trackName: string;
  trackUrl: string;
  artistName: string;
  artistUrl: string;
  artworkUrl: string | null;

  /* ── pause / resume tracking ─────────────────────────────────── */
  paused: boolean;
  lastResumeAt: number; // timestamp when playback (re)started
  accumulatedMs: number; // total accumulated playing time (excl. current segment)

  /* ── 60-second timer (Spotify only) ──────────────────────────── */
  timer: ReturnType<typeof setTimeout> | null;
  remainingMs: number; // ms left before the 60 s threshold fires
  counted: boolean; // true once TopTrack/TopArtist/PlayedSongUser saved
}

/**
 * In-memory map of active stats sessions keyed by guildId.
 * One session per guild (only one track plays per guild at a time).
 */
const sessions = new Map<string, StatsSession>();

/* ── helpers ───────────────────────────────────────────────────────────────── */

/** Return total accumulated playing time including the current unpaused segment. */
function getAccumulatedMs(s: StatsSession): number {
  if (s.paused) return s.accumulatedMs;
  return s.accumulatedMs + (Date.now() - s.lastResumeAt);
}

/** Persist accumulated listen time to the PlayedSongUser record. */
async function saveListenTime(client: Manager, userId: string, addMs: number): Promise<void> {
  if (addMs <= 0) return;
  try {
    let userData = await client.db.PlayedSongUser.get(userId);
    if (!userData) {
      userData = {
        userId,
        username: "",
        displayname: "",
        totalSongsPlayed: 0,
        avatarURL: "",
        listenTimeMs: 0,
      };
    }
    if (!userData.listenTimeMs) userData.listenTimeMs = 0;
    userData.listenTimeMs += addMs;
    await client.db.PlayedSongUser.set(userId, userData);
  } catch (err) {
    client.logger.warn(
      "TopStatsSession",
      `Failed to save listen time for ${userId}: ${String(err)}`
    );
  }
}

/* ── timer callback (fires after 60 s of real playing) ─────────────────── */

function onTimerFire(guildId: string): void {
  const session = sessions.get(guildId);
  if (!session || session.counted) return;

  const client = session.client;
  const activePlayer = client.mewslink.players.get(guildId);
  if (!activePlayer) return;

  const nowPlaying = activePlayer.queue?.current;
  if (!nowPlaying || nowPlaying.identifier !== session.trackIdentifier) return;

  const nowRequester = nowPlaying.requester as User | undefined;
  if (nowRequester?.id !== session.userId) return;

  if (!activePlayer.playing) return;

  session.counted = true;
  session.timer = null;

  // Save TopTrack / TopArtist / PlayedSongUser + milestone embed + guild 60s stats
  (async () => {
    try {
      await TopArtist(client, activePlayer);
      await TopTrack(client, activePlayer);
      await MilestoneTrack(client, activePlayer);
      // Guild: increment tracks_played + top track/artist
      await GuildStatsHelper.onSixtySeconds(client, session);
    } catch (err) {
      client.logger.warn(
        "TopStatsSession",
        `Failed to save 60 s stats for guild ${guildId}: ${String(err)}`
      );
    }
  })();
}

/* ── public API ────────────────────────────────────────────────────────────── */

/**
 * Start a stats session for a track.
 *
 * - ALL non-stream tracks get a session (so listen time accumulates for every source).
 * - A 60-second timer is only set for Spotify tracks (TopTrack / TopArtist / Tracks Played).
 */
export function startStatsSession(client: Manager, player: MewslinkPlayer): void {
  // Flush any leftover session for this guild (safety net)
  const existing = sessions.get(player.guildId);
  if (existing) {
    if (existing.timer) clearTimeout(existing.timer);
    const leftover = getAccumulatedMs(existing);
    if (leftover > 0) {
      saveListenTime(existing.client, existing.userId, leftover).catch(() => {});
      if (existing.source === "spotify") {
        GuildStatsHelper.addListenTime(existing.client, existing.guildId, leftover).catch(() => {});
      }
    }
    sessions.delete(player.guildId);
  }

  const current = player.queue?.current;
  if (!current || current.isStream) return;

  const requester = current.requester as User | undefined;
  if (!requester?.id) return;

  const isSpotify = current.source === "spotify";
  const canCount = isSpotify && current.duration > 0 && current.duration >= MIN_LISTEN_MS;

  // Capture metadata for guild stats
  const trackName = current.title?.trim() ?? "";
  const trackUrl = current.uri ?? "";
  const artistName = current.author?.trim() ?? "";
  const artistUrl = artistName
    ? `https://open.spotify.com/search/${encodeURIComponent(artistName)}`
    : "";
  const artworkUrl = current.artworkUrl ?? null;

  const session: StatsSession = {
    client,
    userId: requester.id,
    guildId: player.guildId,
    trackIdentifier: current.identifier,
    source: current.source ?? "",
    trackName,
    trackUrl,
    artistName,
    artistUrl,
    artworkUrl,
    paused: false,
    lastResumeAt: Date.now(),
    accumulatedMs: 0,
    timer: null,
    remainingMs: canCount ? MIN_LISTEN_MS : 0,
    counted: false,
  };

  if (canCount) {
    session.timer = setTimeout(() => onTimerFire(player.guildId), MIN_LISTEN_MS);
  }

  sessions.set(player.guildId, session);
}

/**
 * Pause the stats session — accumulates the time played so far and
 * suspends the 60-second timer for the remaining duration.
 */
export function pauseStatsSession(guildId: string): void {
  const session = sessions.get(guildId);
  if (!session || session.paused) return;

  const elapsed = Date.now() - session.lastResumeAt;
  session.accumulatedMs += elapsed;
  session.paused = true;

  // Suspend the 60 s timer and remember how much time is left
  if (session.timer && !session.counted) {
    clearTimeout(session.timer);
    session.timer = null;
    session.remainingMs = Math.max(0, session.remainingMs - elapsed);
  }
}

/**
 * Resume the stats session — restarts time tracking and re-schedules
 * the 60-second timer for whatever time remained.
 */
export function resumeStatsSession(guildId: string): void {
  const session = sessions.get(guildId);
  if (!session || !session.paused) return;

  session.lastResumeAt = Date.now();
  session.paused = false;

  // Re-schedule the remaining 60 s timer
  if (!session.counted && session.remainingMs > 0) {
    session.timer = setTimeout(() => onTimerFire(guildId), session.remainingMs);
  }
}

/**
 * Flush accumulated listen time to the database and remove the session.
 * Call this on track end, skip, player stop, or player destroy.
 */
export async function flushAndClearSession(guildId: string): Promise<void> {
  const session = sessions.get(guildId);
  if (!session) return;

  if (session.timer) {
    clearTimeout(session.timer);
    session.timer = null;
  }

  sessions.delete(guildId);

  const totalMs = getAccumulatedMs(session);
  await saveListenTime(session.client, session.userId, totalMs);

  // Guild: always save accumulated listen time for Spotify sources
  if (session.source === "spotify" && totalMs > 0) {
    await GuildStatsHelper.addListenTime(session.client, session.guildId, totalMs);
  }
}

/**
 * Backward-compatible sync wrapper — fires the async flush without awaiting.
 * Prefer `flushAndClearSession` in event handlers where you can `await`.
 */
export function clearStatsSession(guildId: string): void {
  flushAndClearSession(guildId).catch(() => {});
}
