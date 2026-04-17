import { FastifyRequest, FastifyReply } from "fastify";
import { Manager } from "../../manager.js";
import { computeWeb3Quota, getUserSubscriptions } from "./web3Premium.js";

export async function checkGlobalPremium(client: Manager, guildId: string): Promise<boolean> {
  const allWeb3 = await client.db.Web3Premium.all();
  const foundInWeb3 = allWeb3.find((entry: any) => {
    const d = entry.data || entry.value || entry;
    return d.redeemedGuilds && d.redeemedGuilds.includes(guildId);
  });
  if (foundInWeb3) return true;
  return false;
}

export async function getPremiumUserStatus(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = (req as any).session?.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  try {
    const web3Data = await client.db.Web3Premium.get(userId);
    const computedQuota = await computeWeb3Quota(client, userId);
    const subscriptions = await getUserSubscriptions(client, userId);

    // Include active legacy user premium as a virtual subscription
    try {
      const legacyUser = await client.db.PremiumUserLegacy.get(userId);
      if (legacyUser && legacyUser.isPremium && (legacyUser.quotaValue ?? 0) > 0) {
        const now = Date.now();
        const notExpired = legacyUser.expiresAt === "lifetime" || (typeof legacyUser.expiresAt === "number" && legacyUser.expiresAt > now);
        if (notExpired) {
          subscriptions.unshift({
            userId,
            txHash: "legacy_grant",
            walletAddress: "",
            tier: legacyUser.tier || "guild_basic",
            quotaValue: legacyUser.quotaValue!,
            amount: "0",
            startTime: legacyUser.redeemedAt || 0,
            expiredAt: legacyUser.expiresAt === "lifetime" ? 9999999999999 : legacyUser.expiresAt,
            status: "active",
            source: "legacy",
            plan: legacyUser.plan || "",
          });
        }
      }
    } catch {
      // ignore legacy lookup
    }

    const guilds = (req as any).session?.guilds ?? [];
    const botGuildIds = new Set(client.guilds.cache.keys());

    const mutualGuilds = guilds
      .filter((g: any) => botGuildIds.has(g.id))
      .map((g: any) => {
        const guild = client.guilds.cache.get(g.id);
        return {
          id: g.id,
          name: guild?.name ?? g.name,
          icon: guild?.iconURL({ size: 64 }) ?? null,
        };
      });

    const redeemedGuildsInfo: { id: string; name: string; platform: string }[] = [];

    if (web3Data && web3Data.redeemedGuilds) {
      for (const gId of web3Data.redeemedGuilds) {
        const g = client.guilds.cache.get(gId);
        redeemedGuildsInfo.push({ id: gId, name: g?.name ?? gId, platform: "web3" });
      }
    }

    const isWeb3Active = computedQuota > 0;

    return reply.send({
      success: true,
      web3: isWeb3Active
        ? {
            computedQuota,
            usedQuota: web3Data?.usedQuota ?? 0,
            redeemedGuilds: web3Data?.redeemedGuilds ?? [],
            subscriptions,
          }
        : null,
      mutualGuilds,
      redeemedGuilds: redeemedGuildsInfo,
    });
  } catch (err) {
    client.logger.error("PremiumAPI", `getPremiumUserStatus: ${err}`);
    return reply.code(500).send({ error: "Failed to fetch premium status." });
  }
}
