import { FastifyRequest, FastifyReply } from "fastify";
import { Manager } from "../../manager.js";

function isAdmin(client: Manager, userId: string) {
  return client.config.bot.ADMIN.includes(userId) || client.config.bot.OWNER_ID === userId;
}

export async function postPremiumUserLegacy(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId, targetId, duration, tier } = req.body as {
    userId: string;
    targetId: string;
    duration: string;
    tier?: string;
  };
  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });

  const resolvedTier = tier && ["guild_basic", "guild_plus", "guild_pro"].includes(tier) ? tier : "guild_basic";
  const quotaValue = resolvedTier === "guild_pro" ? 5 : resolvedTier === "guild_plus" ? 3 : 1;

  try {
    const targetUser = await client.users.fetch(targetId);
    let expiresAt: number | "lifetime" = Date.now();
    let plan = "";

    switch (duration) {
      case "1month":
        expiresAt += 86400000 * 30;
        plan = "1 Month";
        break;
      case "3months":
        expiresAt += 86400000 * 90;
        plan = "3 Months";
        break;
      case "1year":
        expiresAt += 86400000 * 365;
        plan = "1 Year";
        break;
      default:
        expiresAt = "lifetime";
        plan = "Lifetime";
        break;
    }

    const newPreUser = await client.db.PremiumUserLegacy.set(targetId, {
      id: targetUser.id,
      isPremium: true,
      redeemedBy: {
        id: targetUser.id,
        username: targetUser.username,
        displayName: targetUser.displayName,
        avatarURL: targetUser.avatarURL({ size: 512 }) ?? null,
        createdAt: targetUser.createdAt.getTime(),
        mention: `<@${targetUser.id}>`,
      },
      redeemedAt: Date.now(),
      expiresAt: expiresAt,
      plan: `${plan} (${resolvedTier === "guild_pro" ? "Pro" : resolvedTier === "guild_plus" ? "Plus" : "Basic"})`,
      tier: resolvedTier,
      quotaValue,
    });

    return reply.send({ success: true, data: newPreUser });
  } catch (err) {
    client.logger.error("AdminPremiumAPI", String(err));
    return reply.code(500).send({ error: "Failed to update User Premium." });
  }
}

export async function postPremiumGuildLegacy(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId, targetId, duration } = req.body as {
    userId: string;
    targetId: string;
    duration: string;
  };

  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });

  try {
    const targetGuild = await client.guilds.fetch(targetId);
    const owner = await targetGuild.fetchOwner();
    let expiresAt: number | "lifetime" = Date.now();
    let plan = "";

    switch (duration) {
      case "1month":
        expiresAt += 86400000 * 30;
        plan = "1 Month";
        break;
      case "3months":
        expiresAt += 86400000 * 90;
        plan = "3 Months";
        break;
      case "1year":
        expiresAt += 86400000 * 365;
        plan = "1 Year";
        break;
      default:
        expiresAt = "lifetime";
        plan = "Lifetime";
        break;
    }

    const newPreGuild = await client.db.PremiumGuildLegacy.set(targetId, {
        id: targetGuild.id,
        isPremium: true,
        redeemedBy: {
          id: targetGuild.id,
          name: targetGuild.name,
          createdAt: targetGuild.createdAt.getTime(),
          GuildiconURL: targetGuild.iconURL({ size: 512 }) ?? null,
          ownerId: targetGuild.ownerId,
          ownerName: owner.user.username,
          ownerMention: `<@${targetGuild.ownerId}>`,
        },
        redeemedAt: Date.now(),
        expiresAt: expiresAt,
        plan: plan,
      });

    return reply.send({ success: true, data: newPreGuild });
  } catch (err) {
    client.logger.error("AdminPremiumAPI", String(err));
    return reply.code(500).send({ error: "Failed to update Guild Premium." });
  }
}
export async function getPremiumLegacy(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId } = req.query as { userId: string };
  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });

  try {
    const users = await client.db.PremiumUserLegacy.all();
    const guilds = await client.db.PremiumGuildLegacy.all();

    return reply.send({
      success: true,
      data: {
        users: users.map((u: any) => u.value || u.data || u),
        guilds: guilds.map((g: any) => g.value || g.data || g),
      },
    });
  } catch (err) {
    client.logger.error("AdminPremiumAPI", String(err));
    return reply.code(500).send({ error: "Failed to fetch Premium list." });
  }
}

export async function deletePremiumLegacy(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId, targetId, type } = req.body as {
    userId: string;
    targetId: string;
    type: "user" | "guild";
  };
  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });

  try {
    if (type === "user") {
      await client.db.PremiumUserLegacy.delete(targetId);
    } else {
      await client.db.PremiumGuildLegacy.delete(targetId);
    }
    return reply.send({ success: true });
  } catch (err) {
    client.logger.error("AdminPremiumAPI", String(err));
    return reply.code(500).send({ error: `Failed to remove ${type} premium.` });
  }
}


export async function getMaintenance(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId } = req.query as { userId: string };
  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });

  try {
    const maintenance = await client.db.maintenance.all();
    return reply.send({ success: true, enabled: maintenance.length > 0 });
  } catch (err) {
    return reply.code(500).send({ error: "Failed to fetch maintenance status." });
  }
}

export async function postMaintenance(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId, enable } = req.body as { userId: string; enable: boolean };
  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });

  try {
    if (enable) {
      await client.db.maintenance.set(userId, "true");
    } else {
      await client.db.maintenance.deleteAll();
    }
    return reply.send({ success: true, enabled: enable });
  } catch (err) {
    return reply.code(500).send({ error: "Failed to update maintenance status." });
  }
}

export async function getBlacklist(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId } = req.query as { userId: string };
  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });

  try {
    const users = Array.from(await client.db.BlacklistUser.all());
    const guilds = Array.from(await client.db.BlacklistGuild.all());
    return reply.send({
      success: true,
      data: {
        users: users.map((u: any) => u.id || u.user),
        guilds: guilds.map((g: any) => g.id || g.guild),
      },
    });
  } catch (err) {
    return reply.code(500).send({ error: "Failed to fetch blacklist." });
  }
}

export async function postBlacklist(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId, targetId, type } = req.body as {
    userId: string;
    targetId: string;
    type: "user" | "guild";
  };
  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });

  try {
    if (type === "user") {
      await client.db.BlacklistUser.set(targetId, true);
    } else {
      await client.db.BlacklistGuild.set(targetId, true);
    }
    return reply.send({ success: true });
  } catch (err) {
    return reply.code(500).send({ error: "Failed to blacklist ID." });
  }
}

export async function deleteBlacklist(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { userId, targetId, type } = req.body as {
    userId: string;
    targetId: string;
    type: "user" | "guild";
  };
  if (!isAdmin(client, userId)) return reply.code(403).send({ error: "Unauthorized" });

  try {
    if (type === "user") {
      await client.db.BlacklistUser.delete(targetId);
    } else {
      await client.db.BlacklistGuild.delete(targetId);
    }
    return reply.send({ success: true });
  } catch (err) {
    return reply.code(500).send({ error: "Failed to un-blacklist ID." });
  }
}
