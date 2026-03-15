/**
 * EmitPlayerState – push a full player-state snapshot over the dashboard
 * WebSocket so the frontend refreshes without needing a mutation or a poll.
 *
 * Call this whenever the track or queue changes naturally (trackStart,
 * trackEnd, loop replay, auto-next) so the dashboard stays in sync even
 * when the change was NOT triggered by a user action on the dashboard.
 */
import { User } from "discord.js";
import { Manager } from "../manager.js";
import { MewslinkPlayer, MewslinkTrack } from "../mewslink/main.js";

/**
 * Per-guild monotonic sequence counter.
 * Guarantees strict ordering of playerState events on the client side,
 * preventing stale snapshots (e.g. from a slow trackEnd handler) from
 * overwriting fresher state (e.g. from a fast trackStart handler).
 * FIX: resolves intermittent dashboard desynchronization.
 */
const guildSeqCounters = new Map<string, number>();

function nextSeq(guildId: string): number {
  const current = guildSeqCounters.get(guildId) ?? 0;
  const next = current + 1;
  guildSeqCounters.set(guildId, next);
  return next;
}

function buildTrackPayload(
  track: MewslinkTrack | null | undefined
): Record<string, unknown> | null {
  if (!track) return null;
  const req = track.requester as User | null;
  return {
    title: track.title ?? "Unknown Title",
    uri: track.uri ?? "",
    length: track.duration,
    thumbnail: track.artworkUrl ?? null,
    author: track.author ?? "Unknown Author",
    requester: req
      ? {
          id: req.id,
          username: req.username,
          globalName: req.globalName ?? null,
          defaultAvatarURL: req.defaultAvatarURL ?? null,
        }
      : null,
  };
}

export function emitPlayerState(client: Manager, player: MewslinkPlayer): void {
  const wslConn = client.wsl.get(player.guildId);
  if (!wslConn) return; // No dashboard connected for this guild – nothing to do.

  wslConn.send({
    op: "playerState",
    guild: player.guildId,
    // seq: monotonic counter – client must reject events with seq <= lastSeq
    // to avoid stale overwrites during rapid track transitions.
    seq: nextSeq(player.guildId),
    loop: player.loop,
    pause: player.paused,
    volume: player.volume,
    autoplay: player.data.get("autoplay") === true,
    filter: player.data.get("activeFilter") ?? null,
    current: buildTrackPayload(player.queue.current),
    queue: player.queue.map((t) => buildTrackPayload(t)!),
    updatedAt: Date.now(),
  });
}
