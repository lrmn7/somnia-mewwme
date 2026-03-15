import util from "node:util";
import { User } from "discord.js";
import { Manager } from "../../manager.js";
import Fastify from "fastify";
import {
  buildDashboardUserPerm,
  hasFeatureAccess,
  getDashboardAccessConfig,
  buildSourceAccessMap,
} from "./resolveDashboardAccess.js";

export async function getStatus(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  // client.logger.info("StatusRouterService",`${req.method} ${req.routeOptions.url} params=${req.params ? util.inspect(req.params) : "{}"}`);
  let isMemeberInVoice: boolean | null = null;
  const guildId = (req.params as Record<string, string>)["guildId"];
  const player = client.mewslink.players.get(guildId);
  if (!player) {
    res.code(400);
    res.send({ error: "Current player not found!" });
    return;
  }

  // ── Premium & access flags (config-driven via DASHBOARD_ACCESS) ────────
  const headerUserId = req.headers["user-id"] as string | undefined;
  const perm = await buildDashboardUserPerm(client, headerUserId, guildId);
  const dashAccess = getDashboardAccessConfig(client);

  const hasFilterAccess = hasFeatureAccess(dashAccess.Filters, perm);
  const baseAutoplayAccess = hasFeatureAccess(dashAccess.Autoplay, perm);
  const filterRequirement = dashAccess.Filters?.[0] ?? "Premium";
  const autoplayRequirement = dashAccess.Autoplay?.[0] ?? "Member";
  const voteUrl = `https://top.gg/bot/${client.user?.id}/vote`;

  // Guild-level autoplay toggle — if disabled, nobody can use autoplay button
  const guildAutoplaySetting = await client.db.AutoplaySetting.get(guildId);
  const autoplayEnabled = guildAutoplaySetting === true; // default off
  const hasAutoplayAccess = autoplayEnabled && baseAutoplayAccess;

  // Guild default source
  const guildDefaultSource = await client.db.GuildDefaultSource.get(guildId);
  const defaultSource = guildDefaultSource ?? "spotify";
  const sourceAccess = buildSourceAccessMap(client, perm);

  if (req.headers["user-id"]) {
    const userId = req.headers["user-id"] as string;
    const Guild = await client.guilds.fetch(guildId).catch(() => undefined);
    const Member = Guild ? await Guild.members.fetch(userId).catch(() => undefined) : undefined;
    if (!Member || !Member.voice.channelId) {
      isMemeberInVoice = false;
    } else {
      // true only when the user is in the exact same channel as the bot
      isMemeberInVoice = Member.voice.channelId === player.voiceId;
    }
  }

  const song = player.queue.current;
  const requester = song ? (song.requester as User) : null;

  res.send({
    guildId: player.guildId,
    loop: player.loop,
    pause: player.paused,
    volume: player.volume,
    autoplay: player.data.get("autoplay") === true,
    filter: player.data.get("activeFilter") ?? null,
    isPremium: perm.isPremium,
    isOwner: perm.isOwner,
    isAdmin: perm.isAdmin,
    hasFilterAccess,
    hasAutoplayAccess,
    autoplayEnabled,
    filterRequirement,
    autoplayRequirement,
    voteUrl,
    defaultSource,
    sourceAccess,
    member: isMemeberInVoice,
    position: player.position,
    updatedAt: Date.now(),
    current: song
      ? {
          title: song.title,
          uri: song.uri,
          length: song.duration,
          thumbnail: song.artworkUrl,
          author: song.author,
          requester: requester
            ? {
                id: requester.id,
                username: requester.username,
                globalName: requester.globalName,
                defaultAvatarURL: requester.defaultAvatarURL ?? null,
              }
            : null,
        }
      : null,
    queue: player.queue.map((track) => {
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
