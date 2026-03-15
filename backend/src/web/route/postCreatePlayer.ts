import util from "node:util";
import { Guild, GuildMember, TextChannel, ChannelType, PermissionFlagsBits } from "discord.js";
import { Manager } from "../../manager.js";
import Fastify from "fastify";

/**
 * Returns a suitable text channel ID for the guild.
 * Prefers the guild's system channel, then falls back to the first text
 * channel where the bot has SEND_MESSAGES permission.
 *
 * @param excludeId - Optional channel ID to skip (e.g. the music-setup
 *   channel).  When the resolved ID would equal this value a different
 *   channel is chosen so that trackStart.ts never hits its setup-channel
 *   guard and the "Now Playing" embed is always sent.
 *
 * Returns an empty string if none found (graceful degradation).
 */
async function resolveTextChannelId(
  client: Manager,
  guild: Guild,
  excludeId?: string
): Promise<string> {
  // Prefer system channel (Discord's default announcement channel)
  const systemId = guild.systemChannelId;
  if (systemId && systemId !== excludeId) {
    const ch = (await client.channels.fetch(systemId).catch(() => undefined)) as
      | TextChannel
      | undefined;
    if (
      ch &&
      ch.isTextBased() &&
      guild.members.me?.permissionsIn(ch).has(PermissionFlagsBits.SendMessages)
    ) {
      return systemId;
    }
  }
  // Walk guild channels and find first writable text channel that isn't excluded
  const channels = await guild.channels.fetch().catch(() => undefined);
  if (channels) {
    for (const [, ch] of channels) {
      if (
        ch &&
        ch.id !== excludeId &&
        ch.type === ChannelType.GuildText &&
        guild.members.me?.permissionsIn(ch).has(PermissionFlagsBits.SendMessages)
      ) {
        return ch.id;
      }
    }
    // No non-excluded channel found — fall back to the excluded one rather
    // than returning an empty string (embed will be suppressed but harmless).
    for (const [, ch] of channels) {
      if (
        ch &&
        ch.type === ChannelType.GuildText &&
        guild.members.me?.permissionsIn(ch).has(PermissionFlagsBits.SendMessages)
      ) {
        return ch.id;
      }
    }
  }
  return "";
}

export class PostCreatePlayer {
  guild: Guild | null = null;
  member: GuildMember | null = null;
  constructor(protected client: Manager) {}

  async main(req: Fastify.FastifyRequest, res: Fastify.FastifyReply) {
    this.client.logger.info(
      PostCreatePlayer.name,
      `${req.method} ${req.routeOptions.url} payload=${req.body ? util.inspect(req.body) : "{}"}`
    );
    const data = req.body as Record<string, string>;
    const validBody = await this.checker(data, req, res);
    if (!validBody) return;
    // Resolve a real text channel so trackStart can send the Now Playing embed.
    // When connecting via the dashboard there is no Discord interaction to infer
    // a channel from, so we find the best available one for the guild.
    //
    // We EXCLUDE the guild's music-setup channel (if any) so the resolved textId
    // never matches data.channel in trackStart.ts — preventing the embed-suppress
    // guard from firing on dashboard-created players.
    const setupData = await this.client.db.setup.get(this.guild!.id).catch(() => null);
    const textId = await resolveTextChannelId(
      this.client,
      this.guild!,
      setupData?.channel ?? undefined
    );
    const playerData = {
      guildId: this.guild!.id,
      voiceId: this.member!.voice.channel!.id,
      textId,
      shardId: this.guild?.shardId ?? 0,
      deaf: true,
      volume: this.client.config.bot.DEFAULT_VOLUME ?? 50,
    };
    this.client.mewslink.create(playerData);
    res.send(playerData);
  }

  clean() {
    this.guild = null;
    this.member = null;
  }

  async checker(
    data: Record<string, string>,
    req: Fastify.FastifyRequest,
    res: Fastify.FastifyReply
  ): Promise<boolean> {
    const reqKey = ["guildId", "userId"];
    if (!data) return this.errorRes(req, res, "Missing body");
    if (Object.keys(data).length !== reqKey.length) return this.errorRes(req, res, "Missing key");
    if (!data["guildId"]) return this.errorRes(req, res, "Missing guildId key");
    if (!data["userId"]) return this.errorRes(req, res, "Missing userId key");
    const Guild = await this.client.guilds.fetch(data["guildId"]).catch(() => undefined);
    if (!Guild) return this.errorRes(req, res, "Guild not found");
    const isPlayerExist = this.client.mewslink.players.get(Guild.id);
    if (isPlayerExist) return this.errorRes(req, res, "Player existed in this guild");
    this.guild = Guild;
    const Member = await Guild.members.fetch(data["userId"]).catch(() => undefined);
    if (!Member) return this.errorRes(req, res, "User not found");
    if (!Member.voice.channel || !Member.voice)
      return this.errorRes(req, res, "User is not in voice");
    this.member = Member;
    return true;
  }

  async errorRes(req: Fastify.FastifyRequest, res: Fastify.FastifyReply, message: string) {
    res.code(400);
    res.send({ error: message });
    this.clean();
    return false;
  }
}
