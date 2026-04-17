import type { FastifyRequest, FastifyReply } from "fastify";
import type { Manager } from "../../manager.js";
import { checkGlobalPremium } from "./premiumClaim.js";

const MAX_TIP_CACHE_PER_GUILD = 10;

export async function getCommunityGuilds(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const allContracts = await client.db.GuildContract.all();

    const guilds = await Promise.all(
      allContracts.map(async (entry: any) => {
        const guildId = entry.id || entry.key;
        const data = entry.value || entry.data || entry;

        // Try to get guild info from Discord cache, fallback to stored data
        let guildName = data.guildName || `Guild ${guildId}`;
        let guildIcon: string | null = data.guildIcon || null;
        let memberCount = 0;
        let isPremium = false;

        try {
          const discordGuild = await client.guilds.fetch(guildId).catch(() => null);
          if (discordGuild) {
            guildName = discordGuild.name;
            guildIcon = discordGuild.iconURL({ size: 128 }) || guildIcon;
            memberCount = discordGuild.memberCount || 0;
          }
        } catch {
          // Fallback to stored data above
        }

        // Check premium status (Web3 claimed guilds + legacy)
        try {
          if (await checkGlobalPremium(client, guildId)) isPremium = true;
        } catch {}
        if (!isPremium) {
          try {
            const legacy = await client.db.PremiumGuildLegacy.get(guildId);
            if (legacy?.isPremium) isPremium = true;
          } catch {}
        }

        // Get tip count from cache
        const allTips = await client.db.TipCache.all();
        const guildTips = allTips.filter((t: any) => {
          const tipData = t.value || t.data || t;
          return tipData.guildId === guildId;
        });

        return {
          guildId,
          guildName,
          guildIcon,
          memberCount,
          isPremium,
          contractAddress: data.contractAddress,
          totalTipsCached: guildTips.length,
          createdAt: data.createdAt,
        };
      })
    );

    return reply.send({ success: true, guilds });
  } catch (err) {
    client.logger.error("CommunityGuilds", String(err));
    return reply.code(500).send({ error: "Failed to fetch community guilds." });
  }
}

export async function getCommunityGuildDetail(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { guildId } = req.params as { guildId: string };
  if (!guildId) return reply.code(400).send({ error: "Missing guildId." });

  try {
    const contractData = await client.db.GuildContract.get(guildId);
    if (!contractData) {
      return reply.code(404).send({ error: "Guild does not have a contract." });
    }

    // Get guild info — fallback to stored data
    let guildName = contractData.guildName || `Guild ${guildId}`;
    let guildIcon: string | null = contractData.guildIcon || null;
    let memberCount = 0;
    let isPremium = false;

    try {
      const discordGuild = await client.guilds.fetch(guildId).catch(() => null);
      if (discordGuild) {
        guildName = discordGuild.name;
        guildIcon = discordGuild.iconURL({ size: 256 }) || guildIcon;
        memberCount = discordGuild.memberCount || 0;
      }
    } catch {
      // Fallback to stored data above
    }

    // Check premium (Web3 claimed guilds + legacy)
    try {
      if (await checkGlobalPremium(client, guildId)) isPremium = true;
    } catch {}
    if (!isPremium) {
      try {
        const legacy = await client.db.PremiumGuildLegacy.get(guildId);
        if (legacy?.isPremium) isPremium = true;
      } catch {}
    }

    // Get cached tip history (latest 10)
    const allTips = await client.db.TipCache.all();
    const guildTips = allTips
      .filter((t: any) => {
        const tipData = t.value || t.data || t;
        return tipData.guildId === guildId;
      })
      .map((t: any) => {
        const tipData = t.value || t.data || t;
        return {
          id: t.id || t.key,
          senderAddress: tipData.senderAddress,
          senderDiscordId: tipData.senderDiscordId,
          amount: tipData.amount,
          message: tipData.message,
          txHash: tipData.txHash,
          timestamp: tipData.timestamp,
        };
      })
      .sort((a: any, b: any) => b.timestamp - a.timestamp)
      .slice(0, MAX_TIP_CACHE_PER_GUILD);

    return reply.send({
      success: true,
      guildId,
      guildName,
      guildIcon,
      memberCount,
      isPremium,
      contractAddress: contractData.contractAddress,
      creatorDiscordId: contractData.creatorDiscordId,
      createdAt: contractData.createdAt,
      tips: guildTips,
    });
  } catch (err) {
    client.logger.error("CommunityGuildDetail", String(err));
    return reply.code(500).send({ error: "Failed to fetch guild details." });
  }
}

export async function getCommunityGuildHistory(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { guildId } = req.params as { guildId: string };
  if (!guildId) return reply.code(400).send({ error: "Missing guildId." });

  try {
    const allTips = await client.db.TipCache.all();
    const guildTips = allTips
      .filter((t: any) => {
        const tipData = t.value || t.data || t;
        return tipData.guildId === guildId;
      })
      .map((t: any) => {
        const tipData = t.value || t.data || t;
        return {
          sender: tipData.senderAddress || "",
          senderDiscordId: tipData.senderDiscordId || null,
          amount: tipData.amount || "0",
          message: tipData.message || "",
          txHash: tipData.txHash || "",
          timestamp: tipData.timestamp ? Math.floor(tipData.timestamp / 1000) : 0,
        };
      })
      .sort((a: any, b: any) => b.timestamp - a.timestamp)
      .slice(0, MAX_TIP_CACHE_PER_GUILD);

    // Resolve Discord user info for tips
    const enriched = await Promise.all(
      guildTips.map(async (tip: any) => {
        if (!tip.senderDiscordId) return tip;
        try {
          const user = await client.users.fetch(tip.senderDiscordId).catch(() => null);
          if (user) {
            return {
              ...tip,
              displayName: user.globalName || user.username || null,
              avatarURL: user.displayAvatarURL({ size: 64 }) || null,
            };
          }
        } catch { /* ignore */ }
        return tip;
      })
    );

    return reply.send(enriched);
  } catch (err) {
    client.logger.error("CommunityGuildHistory", String(err));
    return reply.code(500).send([]);
  }
}

export async function postCommunityTip(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = req.session.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized." });

  const { guildId } = req.params as { guildId: string };
  const { senderAddress, amount, message, txHash, blockNumber } = req.body as {
    senderAddress?: string;
    amount?: string;
    message?: string;
    txHash?: string;
    blockNumber?: number;
  };

  if (!guildId || !senderAddress || !amount || !txHash) {
    return reply.code(400).send({ error: "guildId, senderAddress, amount, and txHash are required." });
  }

  // Verify guild has a contract
  const contractData = await client.db.GuildContract.get(guildId);
  if (!contractData) {
    return reply.code(404).send({ error: "Guild does not have a contract." });
  }

  try {
    // Create a unique key for this tip
    const tipId = `${guildId}_${txHash}`;

    // Check for duplicate tx
    const existing = await client.db.TipCache.get(tipId);
    if (existing) {
      return reply.send({ success: true, message: "Tip already recorded.", duplicate: true });
    }

    // Store the tip
    await client.db.TipCache.set(tipId, {
      guildId,
      senderAddress: senderAddress.toLowerCase(),
      senderDiscordId: userId,
      amount,
      message: message || "",
      txHash,
      blockNumber: blockNumber || 0,
      timestamp: Date.now(),
    });

    // Enforce rolling window: keep only latest 10 tips per guild
    const allTips = await client.db.TipCache.all();
    const guildTips = allTips
      .filter((t: any) => {
        const tipData = t.value || t.data || t;
        return tipData.guildId === guildId;
      })
      .map((t: any) => ({
        id: t.id || t.key,
        timestamp: (t.value || t.data || t).timestamp || 0,
      }))
      .sort((a: any, b: any) => b.timestamp - a.timestamp);

    // Remove tips beyond the 10 most recent
    if (guildTips.length > MAX_TIP_CACHE_PER_GUILD) {
      const toRemove = guildTips.slice(MAX_TIP_CACHE_PER_GUILD);
      for (const old of toRemove) {
        await client.db.TipCache.delete(old.id);
      }
    }

    // Emit socket event for realtime UI
    if (client.dashboardEmit) {
      client.dashboardEmit(guildId, "tipReceived", {
        guildId,
        senderAddress: senderAddress.toLowerCase(),
        senderDiscordId: userId,
        amount,
        message: message || "",
        txHash,
        timestamp: Date.now(),
      });
    }

    client.logger.info("CommunityTip", `Tip ${amount} STT to guild ${guildId} from ${userId} tx:${txHash}`);

    return reply.send({ success: true, message: "Tip recorded successfully." });
  } catch (err) {
    client.logger.error("CommunityTip", String(err));
    return reply.code(500).send({ error: "Failed to record tip." });
  }
}
