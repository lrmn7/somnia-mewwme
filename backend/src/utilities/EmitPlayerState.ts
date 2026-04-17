import { User } from "discord.js";
import { Manager } from "../manager.js";
import { MewslinkPlayer, MewslinkTrack } from "../mewslink/main.js";

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
  if (!wslConn) return;

  wslConn.send({
    op: "playerState",
    guild: player.guildId,
    seq: nextSeq(player.guildId),
    loop: player.loop,
    pause: player.paused,
    volume: player.volume,
    position: player.position,
    autoplay: player.data.get("autoplay") === true,
    filter: player.data.get("activeFilter") ?? null,
    current: buildTrackPayload(player.queue.current),
    queue: player.queue.map((t) => buildTrackPayload(t)!),
    updatedAt: Date.now(),
  });

  wslConn.send({
    op: "queueUpdate",
    guild: player.guildId,
    queue: player.queue.map((t) => buildTrackPayload(t)!),
    updatedAt: Date.now(),
  });
}
