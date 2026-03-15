import util from "node:util";
import { Manager } from "../../manager.js";
import Fastify from "fastify";
import { MewslinkLoopMode, MewslinkPlayer, MewslinkPlayerState } from "../../mewslink/main.js";
import { MewslinkFilterData, type MewslinkFilterMode } from "../../mewslink/Interface/Constants.js";
import type { FilterOptions } from "../../mewslink/Interface/Player.js";
import { emitPlayerState } from "../../utilities/EmitPlayerState.js";
import type {
  MewslinkSearchOptions,
  MewslinkSearchResult,
} from "../../mewslink/Interface/Manager.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SEARCH_MAX_ATTEMPTS = 3;
const SEARCH_RETRY_DELAY_MS = 600;

export type TrackRes = {
  title: string;
  uri: string;
  length: number;
  thumbnail: string;
  author: string;
  requester: null;
};

export class PatchControl {
  protected skiped: boolean = false;
  protected isPrevious: boolean = false;
  protected addedTrack: TrackRes[] = [];
  protected dashboardRequester: import("discord.js").User | null = null;

  private static guildLocks = new Map<string, Promise<void>>();

  constructor(protected client: Manager) {}

  private static async acquireLock(guildId: string): Promise<() => void> {
    while (PatchControl.guildLocks.has(guildId)) {
      await PatchControl.guildLocks.get(guildId);
    }
    let release!: () => void;
    const promise = new Promise<void>((r) => {
      release = r;
    });
    PatchControl.guildLocks.set(guildId, promise);
    return () => {
      PatchControl.guildLocks.delete(guildId);
      release();
    };
  }

  async main(req: Fastify.FastifyRequest, res: Fastify.FastifyReply) {
    // this.client.logger.info(PatchControl.name,`${req.method} ${req.routeOptions.url} payload=${req.body ? util.inspect(req.body) : "{}"}`);
    const isValid = await this.checker(req, res);
    if (!isValid) return;
    const guildId = (req.params as Record<string, string>)["guildId"];
    const releaseLock = await PatchControl.acquireLock(guildId);

    try {
      const player = this.client.mewslink.players.get(guildId) as MewslinkPlayer | undefined;
      if (!player || player.state === MewslinkPlayerState.DESTROYED) {
        if (!res.sent) {
          res.code(409).send({ error: "Player session has ended. Please reconnect the bot." });
        }
        return;
      }
      const headerUserId = (req.headers as Record<string, string | undefined>)["user-id"];
      if (headerUserId) {
        try {
          this.dashboardRequester = await this.client.users.fetch(headerUserId);
        } catch {
          this.dashboardRequester = null;
        }
      }
      const jsonBody = req.body as Record<string, unknown>;
      const currentKeys = Object.keys(jsonBody);
      try {
        for (const key of currentKeys) {
          const data = await (this as any)[key](res, player, jsonBody[key]);
          if (!data) return;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.client.logger.error(
          PatchControl.name,
          `Unhandled error while processing key(s) [${currentKeys.join(", ")}] ` +
            `for guild ${guildId}: ${message}`
        );
        if (!res.sent) {
          res.code(500).send({
            error: "An internal error occurred while processing the request.",
            detail: message,
          });
        }
        this.resetData();
        return;
      }

      res.send({
        loop: jsonBody.loop,
        skiped: this.skiped,
        previous: this.isPrevious,
        position: jsonBody.position,
        volume: jsonBody.volume,
        added: this.addedTrack,
      });
      emitPlayerState(this.client, player);
      this.resetData();
    } finally {
      releaseLock();
    }
  }

  async loop(res: Fastify.FastifyReply, player: MewslinkPlayer, mode: string) {
    if (!mode || !["song", "queue", "none"].includes(mode)) {
      res.code(400);
      res.send({ error: `Invalid loop mode, '${mode}' mode does not exist!` });
      return false;
    }
    player.setLoop(mode as MewslinkLoopMode);
    return true;
  }

  async skipMode(res: Fastify.FastifyReply, player: MewslinkPlayer, mode: string) {
    if (!mode || !["previous", "skip"].includes(mode)) {
      res.code(400);
      res.send({ error: `Invalid loop mode, '${mode}' mode does not exist!` });
      return false;
    }
    if (mode == "skip" && player.queue.length == 0) return true;
    if (mode == "previous" && player.queue.previous.length == 0) return true;
    player.data.set("dashboardPlayback", true);
    if (mode == "skip") {
      await player.skip();
      this.skiped = true;
      return true;
    }
    await player.previous();
    this.isPrevious = true;
    return true;
  }

  async position(res: Fastify.FastifyReply, player: MewslinkPlayer, pos: string) {
    if (isNaN(Number(pos))) {
      res.code(400);
      res.send({ error: `Position must be a number!` });
      return false;
    }
    await player.seek(Number(pos));
    return true;
  }

  async volume(res: Fastify.FastifyReply, player: MewslinkPlayer, vol: unknown) {
    if (vol === undefined || vol === null) return true;
    if (isNaN(Number(vol))) {
      res.code(400);
      res.send({ error: `Volume must be a number!` });
      return false;
    }
    await player.setVolume(Number(vol));
    return true;
  }

  async add(res: Fastify.FastifyReply, player: MewslinkPlayer, uriArray: unknown) {
    if (!uriArray) return true;
    if (!Array.isArray(uriArray)) {
      res.code(400);
      res.send({ error: `add property must be an array of links` });
      return false;
    }
    const wasIdle = !player.playing && !player.queue.current;
    const guildId = (player as unknown as { guildId: string }).guildId ?? "unknown";
    const userId = this.dashboardRequester?.id ?? this.client.user?.id ?? "bot";
    const {
      buildDashboardUserPerm: buildPerm,
      hasFeatureAccess: checkAccess,
      getDefaultSourceDashboardConfig: getSourceCfg,
    } = await import("./resolveDashboardAccess.js");
    const sourceCfg = getSourceCfg(this.client);
    const FE_TO_CFG_MAP: Record<string, string> = {
      spotify: "spotify",
      apple: "apple_music",
      soundcloud: "soundcloud",
      deezer: "deezer",
      tidal: "tidal",
      youtube: "youtube",
      youtube_music: "youtube_music",
    };
    const SOURCE_NAMES: Record<string, string> = {
      spotify: "Spotify",
      apple: "Apple Music",
      soundcloud: "SoundCloud",
      deezer: "Deezer",
      tidal: "Tidal",
      youtube: "YouTube",
      youtube_music: "YouTube Music",
    };

    for (const rawUri of uriArray) {
      const uri = String(rawUri ?? "").trim();
      if (!uri) {
        res.code(400);
        res.send({ error: `add property contains an empty value` });
        return false;
      }
      if (uri === "null" || uri === "undefined" || uri.length < 3) {
        res.code(400);
        res.send({ error: `Invalid track URI: '${uri}'` });
        return false;
      }
      if (/^https?:\/\//i.test(uri)) {
        const urlSource = this.detectUrlSourceForAccess(uri);
        if (urlSource) {
          const cfgKey = FE_TO_CFG_MAP[urlSource];
          if (cfgKey && sourceCfg[cfgKey]) {
            const accessLevels = sourceCfg[cfgKey];
            const perm = await buildPerm(this.client, this.dashboardRequester?.id, guildId);
            if (!checkAccess(accessLevels, perm)) {
              const requirement = accessLevels[0] ?? "Premium";
              const name = SOURCE_NAMES[urlSource] ?? urlSource;
              res.code(403).send({
                error: `${name} links are not allowed in this server. This source requires ${requirement} access.`,
              });
              return false;
            }
          }
        }
      }

      const trackRequester = this.dashboardRequester ?? this.client.user!;

      const spotifyUrlMatch =
        /^https?:\/\/(?:open\.)?spotify\.com\/(track|album|playlist|artist)\/([A-Za-z0-9]+)/.exec(
          uri
        );
      const normalisedUri = spotifyUrlMatch
        ? `spotify:${spotifyUrlMatch[1]}:${spotifyUrlMatch[2]}`
        : uri;

      const isSpotifyUri = /^spotify:/.test(normalisedUri);
      const isSpotifySearch = /^spsearch:/i.test(normalisedUri);
      const isDirectLink = /^https?:\/\//i.test(uri);
      const searchEngine: string | undefined =
        isSpotifyUri || isSpotifySearch ? "spotify" : undefined;

      const searchContext = { guildId, userId, rawUri: uri };
      let result = await this.searchWithRetry(
        normalisedUri,
        { requester: trackRequester, ...(searchEngine ? { engine: searchEngine } : {}) },
        searchContext
      );
      if ((!result || result.tracks.length === 0) && isSpotifyUri) {
        const trackId = normalisedUri.replace(/^spotify:[^:]+:/i, "");
        // this.client.logger.info(PatchControl.name,`Spotify URI resolved 0 tracks, falling back to spsearch – ` +`guildId=${guildId} userId=${userId} trackId=${trackId}`);
        result = await this.searchWithRetry(
          `spsearch:${trackId}`,
          { requester: trackRequester, engine: "spotify" },
          { ...searchContext, rawUri: `spsearch:${trackId}` }
        );
      }

      if (
        (!result || result.tracks.length === 0) &&
        !isDirectLink &&
        !isSpotifyUri &&
        !isSpotifySearch
      ) {
        const { DASHBOARD_SOURCES: DS } = await import("./resolveDashboardAccess.js");
        const FALLBACK_SOURCES = ["deezer", "youtube_music", "apple_music", "soundcloud"];
        for (const cfgKey of FALLBACK_SOURCES) {
          const engineName = DS[cfgKey] ?? cfgKey;
          const fallbackResult = await this.searchWithRetry(
            normalisedUri,
            { requester: trackRequester, engine: engineName },
            { ...searchContext, rawUri: `[fallback:${cfgKey}] ${uri}` }
          );
          if (fallbackResult && fallbackResult.tracks.length > 0) {
            result = fallbackResult;
            break;
          }
        }
      }

      if (!result) {
        res.code(503);
        res.send({ error: "Failed to fetch track info. Please try again." });
        return false;
      }
      if (result.tracks.length === 0) {
        res.code(404);
        res.send({ error: `Track not found for '${uri}'` });
        return false;
      }
      const song = result.tracks[0];
      try {
        player.queue.add(song);
      } catch (qErr) {
        this.client.logger.error(
          PatchControl.name,
          `queue.add() failed for guild ${player.guildId}, uri='${normalisedUri}': ${String(qErr)}`
        );
        res.code(500).send({ error: "Failed to add track to queue.", detail: String(qErr) });
        return false;
      }
      this.addedTrack.push({
        title: song.title,
        uri: song.uri || "",
        length: song.duration,
        thumbnail: song.artworkUrl || "",
        author: song.author,
        requester: null,
      });
    }

    if (wasIdle && player.queue.current) {
      try {
        player.data.set("dashboardPlayback", true);
        await player.play();
        //this.client.logger.info(PatchControl.name,`Auto-started playback for guild ${player.guildId}`);
      } catch (err) {
        this.client.logger.warn(
          PatchControl.name,
          `Auto-play failed for guild ${player.guildId}: ${String(err)}`
        );
      }
    }

    return true;
  }

  async pause(res: Fastify.FastifyReply, player: MewslinkPlayer, value: boolean) {
    await player.setPause(value);
    return true;
  }

  async shuffle(res: Fastify.FastifyReply, player: MewslinkPlayer, _value: unknown) {
    if (player.queue.length <= 1) {
      return true;
    }
    player.queue.shuffle();
    try {
      await this.client.UpdateQueueMsg(player);
    } catch (err) {
      this.client.logger.warn(
        PatchControl.name,
        `UpdateQueueMsg after shuffle failed for guild ${player.guildId}: ${String(err)}`
      );
    }
    return true;
  }

  /**
   * @param query        The search query / URI to resolve.
   * @param options      Passed unchanged to mewslink.search().
   * @param context      Diagnostic context (guildId, userId, raw URI) for logs.
   */
  private async searchWithRetry(
    query: string,
    options: MewslinkSearchOptions,
    context: { guildId: string; userId: string; rawUri: string }
  ): Promise<MewslinkSearchResult | null> {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= SEARCH_MAX_ATTEMPTS; attempt++) {
      try {
        const result = await this.client.mewslink.search(query, options);
        if (attempt > 1) {
          this.client.logger.info(
            PatchControl.name,
            `Search succeeded on attempt ${attempt} – ` +
              `guildId=${context.guildId} userId=${context.userId} uri=${context.rawUri}`
          );
        }
        return result;
      } catch (err) {
        lastError = err;
        const isFetch =
          err instanceof Error &&
          (err.message.includes("fetch failed") ||
            err.message.includes("ECONNRESET") ||
            err.message.includes("ETIMEDOUT") ||
            err.message.includes("ENOTFOUND") ||
            err.message.includes("socket hang up"));

        this.client.logger.warn(
          PatchControl.name,
          `Search attempt ${attempt}/${SEARCH_MAX_ATTEMPTS} failed ` +
            `(${isFetch ? "network" : "unknown"} error) – ` +
            `guildId=${context.guildId} userId=${context.userId} ` +
            `uri=${context.rawUri} – ${String(err)}`
        );
        if (!isFetch) break;

        if (attempt < SEARCH_MAX_ATTEMPTS) {
          await sleep(SEARCH_RETRY_DELAY_MS * attempt); // 600ms, 1200ms
        }
      }
    }
    return null;
  }

  async removeFromQueue(res: Fastify.FastifyReply, player: MewslinkPlayer, indexValue: unknown) {
    const index = Number(indexValue);
    if (isNaN(index) || index < 0) {
      res.code(400).send({ error: "removeFromQueue must be a non-negative integer." });
      return false;
    }
    if (index >= player.queue.length) {
      res.code(400).send({ error: "removeFromQueue index out of bounds." });
      return false;
    }
    player.queue.remove(index);
    return true;
  }

  async moveInQueue(res: Fastify.FastifyReply, player: MewslinkPlayer, value: unknown) {
    if (!value || typeof value !== "object") {
      res.code(400).send({ error: "moveInQueue must be an object with 'from' and 'to' indices." });
      return false;
    }
    const { from, to } = value as Record<string, unknown>;
    const fromIdx = Number(from);
    const toIdx = Number(to);
    if (isNaN(fromIdx) || isNaN(toIdx) || fromIdx < 0 || toIdx < 0) {
      res.code(400).send({ error: "moveInQueue 'from' and 'to' must be non-negative integers." });
      return false;
    }
    if (fromIdx >= player.queue.length || toIdx >= player.queue.length) {
      res.code(400).send({ error: "moveInQueue index out of bounds." });
      return false;
    }
    player.queue.move(fromIdx, toIdx);
    return true;
  }

  async skipToIndex(res: Fastify.FastifyReply, player: MewslinkPlayer, indexValue: unknown) {
    const index = Number(indexValue);
    if (isNaN(index) || index < 0) {
      res.code(400).send({ error: "skipToIndex must be a non-negative integer." });
      return false;
    }
    if (index >= player.queue.length) {
      res.code(400).send({ error: "skipToIndex index is out of bounds." });
      return false;
    }

    const target = player.queue[index];

    if (!target.encoded || !target.isPlayable) {
      try {
        await target.resolver(this.client.mewslink, {
          nodeName: player.node.options.name,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.client.logger.error(
          PatchControl.name,
          `skipToIndex: failed to resolve track "${target.title}" for guild ${player.guildId}: ${msg}`
        );
        res.code(400).send({ error: `Track could not be resolved: ${msg}` });
        return false;
      }
    }

    if (!target.encoded) {
      res.code(400).send({ error: "Target track is not playable after resolution." });
      return false;
    }

    player.queue.remove(index);
    if (player.queue.current) {
      player.queue.previous.push(player.queue.current);
    }

    player.queue.current = target;
    player.playing = true;
    player.paused = false;
    player.track = target.encoded;
    player.position = 0;
    player.data.set("dashboardPlayback", true);
    player.node.rest.updatePlayer({
      guildId: player.guildId,
      noReplace: false,
      playerOptions: {
        track: {
          encoded: target.encoded,
          length: target.duration,
        },
        volume: player.volume,
      },
    });

    this.skiped = true;
    return true;
  }

  async autoplay(res: Fastify.FastifyReply, player: MewslinkPlayer, value: unknown) {
    const enable = value === true;
    if (enable) {
      const guildAutoplaySetting = await this.client.db.AutoplaySetting.get(player.guildId);
      if (guildAutoplaySetting === false) {
        res.code(403);
        res.send({ error: "Autoplay is disabled for this server." });
        return false;
      }
    }

    if (enable) {
      if (!player.queue.current) {
        res.code(400);
        res.send({ error: "Cannot enable autoplay: no track is currently playing." });
        return false;
      }
      player.data.set("autoplay", true);
      player.data.set("identifier", player.queue.current.identifier);
      player.data.set("requester", this.client.user!);
      player.data.set("source", player.queue.current.source);
      player.data.set("author", player.queue.current.author);
      player.data.set("title", player.queue.current.title);
    } else {
      player.data.set("autoplay", false);
      player.data.set("identifier", null);
      player.data.set("requester", null);
    }
    return true;
  }

  async checker(req: Fastify.FastifyRequest, res: Fastify.FastifyReply): Promise<boolean> {
    const accpetKey: string[] = [
      "loop",
      "skipMode",
      "position",
      "volume",
      "add",
      "pause",
      "shuffle",
      "autoplay",
      "removeFromQueue",
      "skipToIndex",
      "moveInQueue",
      "filter",
    ];
    const guildId = (req.params as Record<string, string>)["guildId"];
    const player = this.client.mewslink.players.get(guildId);
    if (!player) {
      res.code(404);
      res.send({ error: "Current player not found!" });
      return false;
    }
    if (player.state === MewslinkPlayerState.DESTROYED) {
      res.code(409);
      res.send({ error: "Player session has ended. Please reconnect the bot." });
      return false;
    }

    const headerUserId = (req.headers as Record<string, string | undefined>)["user-id"];
    if (headerUserId && player.voiceId) {
      const guild = await this.client.guilds.fetch(guildId).catch(() => undefined);
      if (guild) {
        const member = await guild.members.fetch(headerUserId).catch(() => undefined);
        if (!member || member.voice.channelId !== player.voiceId) {
          res.code(403).send({
            error: "You must be in the same voice channel as the bot to control the player.",
          });
          return false;
        }
      }
    }

    if (req.headers["content-type"] !== "application/json") {
      res.code(400);
      res.send({ error: "content-type must be application/json!" });
      return false;
    }
    if (!req.body) {
      res.code(400);
      res.send({ error: "Missing body" });
      return false;
    }
    const jsonBody = req.body as Record<string, unknown>;
    for (const key of Object.keys(jsonBody)) {
      if (!accpetKey.includes(key)) {
        res.code(400);
        res.send({ error: `Invalid body, key '${key}' does not exist!` });
        return false;
      }
    }
    return true;
  }

  async filter(res: Fastify.FastifyReply, player: MewslinkPlayer, value: unknown) {
    if (!value || typeof value !== "object") {
      res.code(400).send({ error: "filter must be an object with preset, custom, or clear." });
      return false;
    }

    const payload = value as Record<string, unknown>;

    if (payload.clear === true) {
      await player.filter.clear();
      player.data.set("activeFilter", null);
      return true;
    }

    const { buildDashboardUserPerm, hasFeatureAccess, getDashboardAccessConfig } =
      await import("./resolveDashboardAccess.js");
    const guildId = player.guildId;
    const headerUserId = this.dashboardRequester?.id ?? null;
    const perm = await buildDashboardUserPerm(this.client, headerUserId ?? undefined, guildId);
    const dashAccess = getDashboardAccessConfig(this.client);

    if (!hasFeatureAccess(dashAccess.Filters, perm)) {
      res.code(403).send({
        error:
          "Audio filters require the configured access level. Check DASHBOARD_ACCESS.Filters in config.",
        premiumRequired: true,
      });
      return false;
    }

    if (typeof payload.preset === "string") {
      const presetName = payload.preset as string;
      if (!(presetName in MewslinkFilterData)) {
        const available = Object.keys(MewslinkFilterData).join(", ");
        res.code(400).send({
          error: `Unknown filter preset '${presetName}'. Available: ${available}`,
        });
        return false;
      }
      await player.filter.set(presetName as MewslinkFilterMode);
      player.data.set("activeFilter", presetName === "clear" ? null : presetName);
      return true;
    }

    if (payload.custom && typeof payload.custom === "object") {
      await player.filter.setRaw(payload.custom as FilterOptions);
      player.data.set("activeFilter", "custom");
      return true;
    }

    res.code(400).send({ error: "filter must contain preset, custom, or clear." });
    return false;
  }

  resetData() {
    this.skiped = false;
    this.addedTrack = [];
    this.isPrevious = false;
    this.dashboardRequester = null;
  }

  isValidHttpUrl(string: string) {
    let url;

    try {
      url = new URL(string);
    } catch (_) {
      return false;
    }

    return url.protocol === "http:" || url.protocol === "https:";
  }

  private detectUrlSourceForAccess(uri: string): string | null {
    try {
      if (!/^https?:\/\//i.test(uri.trim())) return null;
      const url = new URL(uri.trim());
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
}
