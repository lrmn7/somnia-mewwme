import util from "node:util";
import { Manager } from "../../manager.js";
import Fastify from "fastify";
import {
  buildDashboardUserPerm,
  hasFeatureAccess,
  getDashboardAccessConfig,
} from "./resolveDashboardAccess.js";

export async function getUserPremium(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  client.logger.info(
    "GetUserPremium",
    `${req.method} ${req.routeOptions.url} params=${req.params ? util.inspect(req.params) : "{}"}`
  );

  const userId = (req.params as Record<string, string>)["userId"];
  if (!userId) {
    return res.code(400).send({ error: "Missing userId parameter." });
  }

  const guildId = (req.query as Record<string, string | undefined>)["guildId"] || undefined;

  const perm = await buildDashboardUserPerm(client, userId, guildId);
  const dashAccess = getDashboardAccessConfig(client);

  const hasAccess = perm.isPremium || perm.isOwner || perm.isAdmin;

  const primaryLevel = (arr: string[] | undefined) => arr?.[0] ?? "Premium";

  res.send({
    isPremium: perm.isPremium,
    isOwner: perm.isOwner,
    isAdmin: perm.isAdmin,
    hasAccess,
    voteUrl: `https://top.gg/bot/${client.user?.id}/vote`,
    // Per-feature access flags driven by DASHBOARD_ACCESS config
    access: {
      filters: hasFeatureAccess(dashAccess.Filters, perm),
      twentyFourSeven: hasFeatureAccess(dashAccess.TwentyFourSeven, perm),
      autoplay: hasFeatureAccess(dashAccess.Autoplay, perm),
      lastfm: hasFeatureAccess(dashAccess.LastFm, perm),
      songRequest: hasFeatureAccess(dashAccess.SongRequest, perm),
      language: hasFeatureAccess(dashAccess.Language, perm),
      statusVoiceChannel: hasFeatureAccess(dashAccess.StatusVoiceChannel, perm),
      prefix: hasFeatureAccess(dashAccess.Prefix, perm),
      djRole: hasFeatureAccess(dashAccess.DjRole, perm),
      controlButton: hasFeatureAccess(dashAccess.ControlButton, perm),
      playlist: hasFeatureAccess(dashAccess.Playlist, perm),
    },
    // Primary requirement level per-feature (for frontend overlay text)
    requirements: {
      filters: primaryLevel(dashAccess.Filters),
      twentyFourSeven: primaryLevel(dashAccess.TwentyFourSeven),
      autoplay: primaryLevel(dashAccess.Autoplay),
      lastfm: primaryLevel(dashAccess.LastFm),
      songRequest: primaryLevel(dashAccess.SongRequest),
      language: primaryLevel(dashAccess.Language),
      statusVoiceChannel: primaryLevel(dashAccess.StatusVoiceChannel),
      prefix: primaryLevel(dashAccess.Prefix),
      djRole: primaryLevel(dashAccess.DjRole),
      controlButton: primaryLevel(dashAccess.ControlButton),
      playlist: primaryLevel(dashAccess.Playlist),
    },
  });
}
