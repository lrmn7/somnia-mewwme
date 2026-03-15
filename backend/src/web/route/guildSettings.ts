/**
 * Guild Settings Adapter — exposes guild configuration systems to the web dashboard.
 *
 * This adapter calls the SAME database methods used by slash commands.
 * No core logic is duplicated; no DB models are rewritten.
 *
 * GET  /v1/guild/:guildId/settings         → Read all guild settings
 * PATCH /v1/guild/:guildId/settings        → Update writable settings
 * GET  /v1/guild/:guildId/settings/locales  → List available locales
 */

import util from "node:util";
import { ChannelType, PermissionsBitField } from "discord.js";
import { Manager } from "../../manager.js";
import Fastify from "fastify";
import {
  buildDashboardUserPerm,
  hasFeatureAccess,
  getDashboardAccessConfig,
  buildSourceAccessMap,
} from "./resolveDashboardAccess.js";

// ── Writable field names ─────────────────────────────────────────────────────
const WRITABLE_FIELDS = new Set([
  "prefix",
  "language",
  "statusVoiceChannel",
  "djRole",
  "controlButton",
  "twentyfourseven",
  "setup",
  "autoplaySetting",
  "defaultSource",
]);

// ── GET handler ──────────────────────────────────────────────────────────────

export async function getGuildSettings(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  client.logger.info(
    "GuildSettingsRoute",
    `${req.method} ${req.routeOptions.url} params=${req.params ? util.inspect(req.params) : "{}"}`
  );

  const guildId = (req.params as Record<string, string>)["guildId"];
  if (!guildId) {
    res.code(400).send({ error: "guildId is required." });
    return;
  }

  // Verify guild exists in the bot's cache
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    res.code(404).send({ error: "Guild not found or bot is not in this guild." });
    return;
  }

  // Read every guild-scoped setting using the SAME db calls as commands
  const [
    prefix,
    language,
    autoreconnect,
    statusVoiceChannel,
    djRole,
    controlButton,
    notifyTwitch,
    notifyYoutube,
    setup,
    tempVoiceChannelSetting,
    autoplaySetting,
    guildDefaultSource,
  ] = await Promise.all([
    client.db.prefix.get(guildId),
    client.db.language.get(guildId),
    client.db.autoreconnect.get(guildId),
    client.db.StatusVoiceChannel.get(guildId),
    client.db.DjRole.get(guildId),
    client.db.ControlButton.get(guildId),
    client.db.NotifyTwitch.get(guildId),
    client.db.NotifyYoutube.get(guildId),
    client.db.setup.get(guildId),
    client.db.TempVoiceChannelSetting.get(guildId),
    client.db.AutoplaySetting.get(guildId),
    client.db.GuildDefaultSource.get(guildId),
  ]);

  // ── Premium & access flags (config-driven via DASHBOARD_ACCESS) ─────────
  const headerUserId = req.headers["user-id"] as string | undefined;
  const perm = await buildDashboardUserPerm(client, headerUserId, guildId);
  const dashAccess = getDashboardAccessConfig(client);
  const has247Access =
    hasFeatureAccess(dashAccess.TwentyFourSeven, perm) &&
    (perm.hasManageGuild || perm.isOwner || perm.isAdmin);
  const requirement247 = dashAccess.TwentyFourSeven?.[0] ?? "Premium";
  const hasSetupAccess =
    hasFeatureAccess(dashAccess.SongRequest, perm) &&
    (perm.hasManageGuild || perm.isOwner || perm.isAdmin);
  const requirementSetup = dashAccess.SongRequest?.[0] ?? "Member";
  const hasLanguageAccess =
    hasFeatureAccess(dashAccess.Language, perm) &&
    (perm.hasManageGuild || perm.isOwner || perm.isAdmin);
  const requirementLanguage = dashAccess.Language?.[0] ?? "Member";
  const hasStatusVCAccess =
    hasFeatureAccess(dashAccess.StatusVoiceChannel, perm) &&
    (perm.hasManageGuild || perm.isOwner || perm.isAdmin);
  const requirementStatusVC = dashAccess.StatusVoiceChannel?.[0] ?? "Member";
  const hasPrefixAccess =
    hasFeatureAccess(dashAccess.Prefix, perm) &&
    (perm.hasManageGuild || perm.isOwner || perm.isAdmin);
  const requirementPrefix = dashAccess.Prefix?.[0] ?? "Member";
  const hasDjRoleAccess =
    hasFeatureAccess(dashAccess.DjRole, perm) &&
    (perm.hasManageGuild || perm.isOwner || perm.isAdmin);
  const requirementDjRole = dashAccess.DjRole?.[0] ?? "Member";
  const hasControlButtonAccess =
    hasFeatureAccess(dashAccess.ControlButton, perm) &&
    (perm.hasManageGuild || perm.isOwner || perm.isAdmin);
  const requirementControlButton = dashAccess.ControlButton?.[0] ?? "Member";
  const voteUrl = `https://top.gg/bot/${client.user?.id}/vote`;

  // Fetch guild roles for the DJ Role dropdown (exclude @everyone, sort by position desc)
  const fetchedRoles = await guild.roles.fetch().catch(() => guild.roles.cache);
  const guildRoles = [...fetchedRoles.values()]
    .filter((r) => r.id !== guild.id) // exclude @everyone
    .sort((a, b) => b.position - a.position)
    .map((r) => ({ id: r.id, name: r.name, color: r.hexColor }));

  res.send({
    guildId,
    guildName: guild.name,

    // ── Writable settings ──────────────────────────────────────
    prefix: prefix ?? client.prefix ?? "me",
    language: language ?? "en",
    statusVoiceChannel: statusVoiceChannel ?? false,
    djRole: djRole ?? { guild: guildId, enable: false, roleid: null },
    controlButton: controlButton ?? "enable",
    autoplaySetting: autoplaySetting ?? false,
    roles: guildRoles,

    // ── Read-only settings (complex flows / side effects) ──────
    twentyfourseven: autoreconnect?.twentyfourseven ?? false,
    notifyTwitch: notifyTwitch ?? null,
    notifyYoutube: notifyYoutube ?? null,
    setup: setup ?? null,
    tempVoiceChannel: tempVoiceChannelSetting ?? null,

    // ── Premium & permission flags ─────────────────────────────
    isPremium: perm.isPremium,
    isOwner: perm.isOwner,
    isAdmin: perm.isAdmin,
    isGuildOwner: headerUserId === guild.ownerId,
    hasManageGuild: perm.hasManageGuild,
    has247Access,
    requirement247,
    hasSetupAccess,
    requirementSetup,
    hasLanguageAccess,
    requirementLanguage,
    hasStatusVCAccess,
    requirementStatusVC,
    hasPrefixAccess,
    requirementPrefix,
    hasDjRoleAccess,
    requirementDjRole,
    hasControlButtonAccess,
    requirementControlButton,
    hasAutoplaySettingAccess:
      hasFeatureAccess(dashAccess.Autoplay, perm) &&
      (perm.hasManageGuild || perm.isOwner || perm.isAdmin),
    requirementAutoplaySetting: dashAccess.Autoplay?.[0] ?? "Member",
    voteUrl,
    defaultSource: guildDefaultSource ?? "spotify",
    sourceAccess: buildSourceAccessMap(client, perm),
  });
}

// ── PATCH handler ────────────────────────────────────────────────────────────

export async function patchGuildSettings(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  client.logger.info(
    "GuildSettingsRoute",
    `${req.method} ${req.routeOptions.url} payload=${req.body ? util.inspect(req.body) : "{}"}`
  );

  const guildId = (req.params as Record<string, string>)["guildId"];
  if (!guildId) {
    res.code(400).send({ error: "guildId is required." });
    return;
  }

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    res.code(404).send({ error: "Guild not found or bot is not in this guild." });
    return;
  }

  if (
    req.headers["content-type"] !== "application/json" &&
    req.headers["content-type"]?.indexOf("application/json") === -1
  ) {
    res.code(400).send({ error: "content-type must be application/json" });
    return;
  }

  const body = req.body as Record<string, unknown>;
  if (!body || typeof body !== "object") {
    res.code(400).send({ error: "Missing JSON body." });
    return;
  }

  // Extract internal-only fields injected by the proxy layer
  const _userId = body["_userId"] as string | undefined;
  delete body["_userId"];

  // ── Premium & permission checks (config-driven via DASHBOARD_ACCESS) ───
  const perm = await buildDashboardUserPerm(client, _userId, guildId);
  const dashAccess = getDashboardAccessConfig(client);
  const { isPremium, isOwner, isAdmin, hasManageGuild } = perm;

  // Reject any key that is not writable
  for (const key of Object.keys(body)) {
    if (!WRITABLE_FIELDS.has(key)) {
      res.code(400).send({
        error: `Field '${key}' is not writable from the dashboard. Writable fields: ${[...WRITABLE_FIELDS].join(", ")}`,
      });
      return;
    }
  }

  const updated: Record<string, unknown> = {};

  try {
    // ── prefix ─────────────────────────────────────────────────────────────
    if ("prefix" in body) {
      // Access gate: check DASHBOARD_ACCESS.Prefix config
      if (!hasFeatureAccess(dashAccess.Prefix, perm)) {
        res
          .code(403)
          .send({
            error:
              "Changing prefix requires the configured access level. Check DASHBOARD_ACCESS.Prefix in config.",
            premiumRequired: true,
          });
        return;
      }
      // Manage Guild permission required (owner/admin bypass)
      if (!(hasManageGuild || isOwner || isAdmin)) {
        res
          .code(403)
          .send({ error: "You need the Manage Server permission to change the prefix." });
        return;
      }

      const val = body["prefix"];
      if (typeof val !== "string" || val.length === 0) {
        res.code(400).send({ error: "prefix must be a non-empty string." });
        return;
      }
      if (val.length > 10) {
        res.code(400).send({ error: "prefix must be 10 characters or fewer." });
        return;
      }
      // Same call as src/commands/Settings/Prefix.ts
      await client.db.prefix.set(guildId, val);
      updated["prefix"] = val;
    }

    // ── language ───────────────────────────────────────────────────────────
    if ("language" in body) {
      // Access gate: check DASHBOARD_ACCESS.Language config
      if (!hasFeatureAccess(dashAccess.Language, perm)) {
        res
          .code(403)
          .send({
            error:
              "Changing language requires the configured access level. Check DASHBOARD_ACCESS.Language in config.",
            premiumRequired: true,
          });
        return;
      }
      // Manage Guild permission required (owner/admin bypass)
      if (!(hasManageGuild || isOwner || isAdmin)) {
        res
          .code(403)
          .send({ error: "You need the Manage Server permission to change the language." });
        return;
      }

      const val = body["language"];
      if (typeof val !== "string") {
        res.code(400).send({ error: "language must be a string." });
        return;
      }
      // Same validation as src/commands/Settings/Language.ts
      const locales = client.i18n.getLocales();
      if (!locales.includes(val)) {
        res.code(400).send({
          error: `Invalid language '${val}'. Available: ${locales.join(", ")}`,
        });
        return;
      }
      await client.db.language.set(guildId, val);
      updated["language"] = val;
    }

    // ── statusVoiceChannel ─────────────────────────────────────────────────
    if ("statusVoiceChannel" in body) {
      // Access gate: check DASHBOARD_ACCESS.StatusVoiceChannel config
      if (!hasFeatureAccess(dashAccess.StatusVoiceChannel, perm)) {
        res
          .code(403)
          .send({
            error:
              "Changing Voice Channel Status requires the configured access level. Check DASHBOARD_ACCESS.StatusVoiceChannel in config.",
            premiumRequired: true,
          });
        return;
      }
      // Manage Guild permission required (owner/admin bypass)
      if (!(hasManageGuild || isOwner || isAdmin)) {
        res
          .code(403)
          .send({
            error: "You need the Manage Server permission to change the Voice Channel Status.",
          });
        return;
      }

      const val = body["statusVoiceChannel"];
      if (typeof val !== "boolean") {
        res.code(400).send({ error: "statusVoiceChannel must be a boolean." });
        return;
      }
      // Same call as src/commands/Settings/StatusVoiceChannel.ts
      await client.db.StatusVoiceChannel.set(guildId, val);
      updated["statusVoiceChannel"] = val;
    }

    // ── djRole ─────────────────────────────────────────────────────────────
    if ("djRole" in body) {
      // Access gate: check DASHBOARD_ACCESS.DjRole config
      if (!hasFeatureAccess(dashAccess.DjRole, perm)) {
        res
          .code(403)
          .send({
            error:
              "Changing DJ Role requires the configured access level. Check DASHBOARD_ACCESS.DjRole in config.",
            premiumRequired: true,
          });
        return;
      }
      // Manage Guild permission required (owner/admin bypass)
      if (!(hasManageGuild || isOwner || isAdmin)) {
        res
          .code(403)
          .send({ error: "You need the Manage Server permission to change the DJ Role." });
        return;
      }

      const val = body["djRole"];
      if (!val || typeof val !== "object") {
        res.code(400).send({ error: "djRole must be an object with { enable, roleid }." });
        return;
      }
      const payload = val as Record<string, unknown>;
      const enable = payload["enable"];
      const roleid = payload["roleid"];
      if (typeof enable !== "boolean") {
        res.code(400).send({ error: "djRole.enable must be a boolean." });
        return;
      }
      if (enable && (typeof roleid !== "string" || !roleid)) {
        res
          .code(400)
          .send({ error: "djRole.roleid must be a non-empty string when enable is true." });
        return;
      }
      // Same pattern as src/commands/Settings/DjRole.ts
      const djData = {
        guild: guildId,
        enable,
        roleid: enable ? (roleid as string) : null,
      };
      await client.db.DjRole.set(guildId, djData);
      updated["djRole"] = djData;
    }

    // ── controlButton ──────────────────────────────────────────────────────
    if ("controlButton" in body) {
      // Access gate: check DASHBOARD_ACCESS.ControlButton config
      if (!hasFeatureAccess(dashAccess.ControlButton, perm)) {
        res
          .code(403)
          .send({
            error:
              "Changing Player Control Buttons requires the configured access level. Check DASHBOARD_ACCESS.ControlButton in config.",
            premiumRequired: true,
          });
        return;
      }
      // Manage Guild permission required (owner/admin bypass)
      if (!(hasManageGuild || isOwner || isAdmin)) {
        res
          .code(403)
          .send({
            error: "You need the Manage Server permission to change the Player Control Buttons.",
          });
        return;
      }

      const val = body["controlButton"];
      if (val !== "enable" && val !== "disable") {
        res.code(400).send({ error: "controlButton must be 'enable' or 'disable'." });
        return;
      }
      // Same call as src/commands/Settings/ControlMode.ts
      await client.db.ControlButton.set(guildId, val);
      updated["controlButton"] = val;
    }

    // ── autoplaySetting ────────────────────────────────────────────────────
    if ("autoplaySetting" in body) {
      // Access gate: check DASHBOARD_ACCESS.Autoplay config
      if (!hasFeatureAccess(dashAccess.Autoplay, perm)) {
        res
          .code(403)
          .send({
            error:
              "Changing Autoplay setting requires the configured access level. Check DASHBOARD_ACCESS.Autoplay in config.",
            premiumRequired: true,
          });
        return;
      }
      // Manage Guild permission required (owner/admin bypass)
      if (!(hasManageGuild || isOwner || isAdmin)) {
        res
          .code(403)
          .send({ error: "You need the Manage Server permission to change the Autoplay setting." });
        return;
      }

      const val = body["autoplaySetting"];
      if (typeof val !== "boolean") {
        res.code(400).send({ error: "autoplaySetting must be a boolean." });
        return;
      }
      await client.db.AutoplaySetting.set(guildId, val);
      updated["autoplaySetting"] = val;
    }

    // ── defaultSource ─────────────────────────────────────────────────────
    if ("defaultSource" in body) {
      // Manage Guild permission required (owner/admin bypass)
      if (!(hasManageGuild || isOwner || isAdmin)) {
        res
          .code(403)
          .send({ error: "You need the Manage Server permission to change the default source." });
        return;
      }

      const val = body["defaultSource"];
      if (typeof val !== "string") {
        res.code(400).send({ error: "defaultSource must be a string." });
        return;
      }

      // Import helpers for source validation
      const { getDefaultSourceDashboardConfig, DASHBOARD_SOURCES } =
        await import("./resolveDashboardAccess.js");
      const sourceCfg = getDefaultSourceDashboardConfig(client);

      // Map frontend ids back to config keys
      const FE_TO_CFG: Record<string, string> = {
        soundcloud: "soundcloud",
        apple: "apple_music",
        spotify: "spotify",
        youtube: "youtube",
        youtube_music: "youtube_music",
        deezer: "deezer",
        tidal: "tidal",
      };

      const cfgKey = FE_TO_CFG[val];
      if (!cfgKey || !sourceCfg[cfgKey]) {
        const validFrontendIds = Object.keys(FE_TO_CFG).join(", ");
        res
          .code(400)
          .send({ error: `Invalid source '${val}'. Valid sources: ${validFrontendIds}` });
        return;
      }

      // Check if the guild has the required access level for this source
      const sourceAccessLevels = sourceCfg[cfgKey];
      if (!hasFeatureAccess(sourceAccessLevels, perm)) {
        const requirement = sourceAccessLevels[0] ?? "Premium";
        res.code(403).send({
          error: `This source requires ${requirement} access. Your guild does not meet the requirement.`,
          premiumRequired: true,
        });
        return;
      }

      await client.db.GuildDefaultSource.set(guildId, val);
      updated["defaultSource"] = val;
    }

    // ── twentyfourseven ────────────────────────────────────────────────────
    if ("twentyfourseven" in body) {
      const val = body["twentyfourseven"];
      if (typeof val !== "boolean") {
        res.code(400).send({ error: "twentyfourseven must be a boolean." });
        return;
      }

      // Access gate: check DASHBOARD_ACCESS.TwentyFourSeven config
      if (!hasFeatureAccess(dashAccess.TwentyFourSeven, perm)) {
        res
          .code(403)
          .send({
            error:
              "24/7 mode requires the configured access level. Check DASHBOARD_ACCESS.TwentyFourSeven in config.",
            premiumRequired: true,
          });
        return;
      }

      // Manage Guild permission required (owner/admin bypass)
      if (!(hasManageGuild || isOwner || isAdmin)) {
        res.code(403).send({ error: "You need the Manage Server permission to change 24/7 mode." });
        return;
      }

      if (val) {
        // Require the requesting user to be in a voice channel
        let memberVoice: { channelId: string | null } | undefined;
        if (_userId) {
          const member = await guild.members.fetch(_userId).catch(() => null);
          memberVoice = member?.voice;
        }
        if (!memberVoice?.channelId) {
          res.code(400).send({ error: "You must be in a voice channel to enable 24/7 mode." });
          return;
        }
        // Enable 24/7 — create/update the autoreconnect record
        const existing = await client.db.autoreconnect.get(guildId);
        const player = client.mewslink?.players?.get(guildId);
        await client.db.autoreconnect.set(`${guildId}`, {
          guild: existing?.guild ?? guildId,
          text: existing?.text ?? player?.textId ?? "",
          voice: existing?.voice ?? memberVoice.channelId,
          current: existing?.current ?? "",
          config: existing?.config ?? { loop: "none" },
          queue: existing?.queue ?? [],
          twentyfourseven: true,
        });
      } else {
        // Disable 24/7 — delete the autoreconnect record (same as command)
        await client.db.autoreconnect.delete(guildId);
      }
      updated["twentyfourseven"] = val;
    }

    // ── setup (Player Setup Channel) ───────────────────────────────────────
    if ("setup" in body) {
      // Check DASHBOARD_ACCESS.PlayerSetup config level first
      if (!hasFeatureAccess(dashAccess.SongRequest, perm)) {
        res
          .code(403)
          .send({
            error:
              "Player Setup Channel requires the configured access level. Check DASHBOARD_ACCESS.PlayerSetup in config.",
            premiumRequired: true,
          });
        return;
      }
      // Always requires Manage Guild permission regardless of DASHBOARD_ACCESS level
      if (!(hasManageGuild || isOwner || isAdmin)) {
        res
          .code(403)
          .send({
            error: "You need the Manage Server permission to manage the Player Setup Channel.",
          });
        return;
      }
      const val = body["setup"];
      if (typeof val === "string" && val === "delete") {
        // Delete existing setup — same logic as src/commands/Settings/Setup.ts "delete"
        const existing = await client.db.setup.get(guildId);
        if (existing && existing.enable) {
          // Attempt to clean up the channels/category
          if (existing.category) {
            const cat = await guild.channels.fetch(existing.category).catch(() => null);
            if (cat) await cat.delete().catch(() => null);
          }
          if (existing.voice) {
            const vc = await guild.channels.fetch(existing.voice).catch(() => null);
            if (vc) await vc.delete().catch(() => null);
          }
          if (existing.channel) {
            const tc = await guild.channels.fetch(existing.channel).catch(() => null);
            if (tc) await tc.delete().catch(() => null);
          }
        }
        await client.db.setup.delete(guildId);
        updated["setup"] = null;
      } else if (typeof val === "string" && val === "create") {
        // Create setup — same logic as src/commands/Settings/Setup.ts "create"
        const existing = await client.db.setup.get(guildId);
        if (existing && existing.enable) {
          res.code(400).send({ error: "Setup is already active. Delete it first." });
          return;
        }
        const parent = await guild.channels.create({
          name: `${client.user!.username}'s Music`,
          type: ChannelType.GuildCategory,
        });
        const textChannel = await guild.channels.create({
          name: "song-request",
          type: ChannelType.GuildText,
          topic: "Type a song name or URL to request it.",
          parent: parent.id,
        });
        const { EmbedBuilder } = await import("discord.js");
        const playEmbed = new EmbedBuilder()
          .setColor(client.color_main)
          .setAuthor({ name: "No song currently playing" })
          .setImage(client.config.bot.IMAGES_URL_REQUEST_MUSIC);
        const channelMsg = await textChannel.send({
          content: "**Queue list:**\nJoin a voice channel and type a song name or URL.",
          embeds: [playEmbed],
          components: [client.diSwitch],
        });
        const voiceChannel = await guild.channels.create({
          name: `${client.user!.username} ♪`,
          type: ChannelType.GuildVoice,
          parent: parent.id,
          userLimit: 99,
        });
        const newData = {
          guild: guildId,
          enable: true,
          channel: textChannel.id,
          playmsg: channelMsg.id,
          voice: voiceChannel.id,
          category: parent.id,
        };
        await client.db.setup.set(guildId, newData);
        updated["setup"] = newData;
      } else {
        res.code(400).send({ error: "setup must be 'create' or 'delete'." });
        return;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    client.logger.error(
      "GuildSettingsRoute",
      `Error updating settings for guild ${guildId}: ${msg}`
    );
    res.code(500).send({ error: "Failed to update settings.", detail: msg });
    return;
  }

  res.send({ updated });
}

// ── Locales endpoint ─────────────────────────────────────────────────────────

export async function getAvailableLocales(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  res.send({ locales: client.i18n.getLocales() });
}
