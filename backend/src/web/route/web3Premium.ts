import type { FastifyRequest, FastifyReply } from "fastify";
import type { Manager } from "../../manager.js";

/** Map plan key → server quota value */
function getPlanQuota(plan: string): number {
  switch (plan) {
    case "guild_basic": return 1;
    case "guild_plus": return 3;
    case "guild_pro": return 5;
    default: return 0;
  }
}

// ─── Shared helpers (exported for use by PremiumExpiryService, commands, etc.) ───

/** Sum quotaValue of all ACTIVE subscriptions for a user */
export async function computeWeb3Quota(client: Manager, userId: string): Promise<number> {
  const now = Date.now();
  const allSubs = await client.db.Web3Subscriptions.all();
  const prefix = `sub_${userId}_`;
  let total = 0;
  for (const entry of allSubs) {
    const key: string = (entry as any).id ?? (entry as any).key ?? "";
    if (!key.startsWith(prefix)) continue;
    const sub = (entry as any).value ?? (entry as any).data ?? entry;
    if (sub.status === "active" && sub.expiredAt > now) {
      total += sub.quotaValue ?? 0;
    }
  }

  // Legacy user premium: add quota from admin-granted premium
  try {
    const legacyUser = await client.db.PremiumUserLegacy.get(userId);
    if (legacyUser && legacyUser.isPremium && (legacyUser.quotaValue ?? 0) > 0) {
      const notExpired = legacyUser.expiresAt === "lifetime" || (typeof legacyUser.expiresAt === "number" && legacyUser.expiresAt > now);
      if (notExpired) {
        total += legacyUser.quotaValue!;
      }
    }
  } catch {
    // ignore legacy lookup failures
  }

  // Legacy fallback: if no subscriptions found, check old Web3Premium record
  if (total === 0) {
    const legacy = await client.db.Web3Premium.get(userId);
    if (legacy && legacy.isUserPremium && legacy.expiresAt > now && (legacy.maxQuota ?? 0) > 0) {
      return legacy.maxQuota;
    }
  }
  return total;
}

/** If usedQuota exceeds computed quota, auto-unclaim excess guilds (LIFO) */
export async function reconcileUserQuota(client: Manager, userId: string): Promise<void> {
  const computedQuota = await computeWeb3Quota(client, userId);
  const record = await client.db.Web3Premium.get(userId);
  if (!record) return;

  const usedQuota = record.usedQuota ?? 0;
  if (usedQuota <= computedQuota) {
    // Update isUserPremium flag
    if (computedQuota === 0 && record.isUserPremium) {
      record.isUserPremium = false;
      await client.db.Web3Premium.set(userId, record);
    }
    return;
  }

  // Need to unclaim excess guilds (remove from end = LIFO)
  const redeemed = record.redeemedGuilds ?? [];
  const excess = usedQuota - computedQuota;
  const removed = redeemed.splice(redeemed.length - excess, excess);

  record.redeemedGuilds = redeemed;
  record.usedQuota = redeemed.length;
  record.isUserPremium = computedQuota > 0;
  await client.db.Web3Premium.set(userId, record);

  if (removed.length > 0) {
    client.logger.info(
      "Web3Premium",
      `Reconciled user ${userId}: removed ${removed.length} guild(s) [${removed.join(",")}]. Quota now ${record.usedQuota}/${computedQuota}`
    );
  }
}

/** Return all subscriptions for a user (active + expired), sorted newest first */
export async function getUserSubscriptions(client: Manager, userId: string) {
  const allSubs = await client.db.Web3Subscriptions.all();
  const prefix = `sub_${userId}_`;
  const result: any[] = [];
  for (const entry of allSubs) {
    const key: string = (entry as any).id ?? (entry as any).key ?? "";
    if (!key.startsWith(prefix)) continue;
    const sub = (entry as any).value ?? (entry as any).data ?? entry;
    result.push(sub);
  }
  result.sort((a, b) => (b.startTime ?? 0) - (a.startTime ?? 0));
  return result;
}

// ─── API Endpoints ───

export async function postWeb3PremiumActivate(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = (req as any).session?.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized." });

  const { txHash, plan, amount, expiresAt } = req.body as {
    txHash?: string;
    plan?: string;
    amount?: string;
    expiresAt?: number;
  };

  if (!txHash || !plan || !amount) {
    return reply.code(400).send({
      error: "txHash, plan, and amount are required.",
    });
  }

  const validPlans = ["guild_basic", "guild_plus", "guild_pro"];
  if (!validPlans.includes(plan)) {
    return reply.code(400).send({ error: `Invalid plan. Must be one of: ${validPlans.join(", ")}` });
  }

  // Get wallet address from binding
  const binding = await client.db.WalletBinding.get(userId);
  if (!binding || !binding.walletAddress) {
    return reply.code(403).send({
      error: "No wallet bound to your account. Please bind your wallet first.",
    });
  }
  const walletAddress = binding.walletAddress.toLowerCase();

  // Check for duplicate tx hash in subscriptions table
  const subKey = `sub_${userId}_${txHash}`;
  const existingSub = await client.db.Web3Subscriptions.get(subKey);
  if (existingSub) {
    return reply.code(409).send({ error: "This transaction has already been used for premium activation." });
  }

  // Also check across all subscriptions for the same txHash from any user
  const allSubs = await client.db.Web3Subscriptions.all();
  const duplicateTx = allSubs.find((entry: any) => {
    const sub = entry.value ?? entry.data ?? entry;
    return sub.txHash?.toLowerCase() === txHash.toLowerCase();
  });
  if (duplicateTx) {
    return reply.code(409).send({ error: "This transaction has already been used for premium activation." });
  }

  // Create NEW subscription record (never overwrite)
  const now = Date.now();
  const duration = 30 * 24 * 60 * 60 * 1000; // 30 days
  const quotaValue = getPlanQuota(plan);
  const expiry = expiresAt || (now + duration);

  await client.db.Web3Subscriptions.set(subKey, {
    userId,
    txHash,
    walletAddress,
    tier: plan,
    quotaValue,
    amount,
    startTime: now,
    expiredAt: expiry,
    status: "active" as const,
  });

  // Update aggregated Web3Premium state (preserve redeemedGuilds & usedQuota)
  const existing = await client.db.Web3Premium.get(userId);
  await client.db.Web3Premium.set(userId, {
    walletAddress,
    txHash: existing?.txHash ?? txHash,
    plan: existing?.plan ?? plan,
    amount: existing?.amount ?? amount,
    isUserPremium: true,
    maxQuota: 0, // deprecated — use computeWeb3Quota
    usedQuota: existing?.usedQuota ?? 0,
    redeemedGuilds: existing?.redeemedGuilds ?? [],
    redeemedAt: existing?.redeemedAt ?? now,
    activatedAt: now,
    expiresAt: Math.max(existing?.expiresAt ?? 0, expiry),
  });

  const computedQuota = await computeWeb3Quota(client, userId);

  // Emit socket events
  if (client.dashboardEmit) {
    client.dashboardEmit("global", "premiumActivated", {
      userId,
      plan,
      walletAddress,
      txHash,
    });
  }

  client.logger.info(
    "Web3Premium",
    `User ${userId} activated ${plan} premium (computed quota ${computedQuota}) via tx:${txHash}, expires:${new Date(expiry).toISOString()}`
  );

  return reply.send({
    success: true,
    plan,
    computedQuota,
    usedQuota: existing?.usedQuota ?? 0,
    activatedAt: now,
    expiresAt: expiry,
    message: `Premium ${plan} activated successfully.`,
  });
}

export async function getWeb3PremiumStatus(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = (req as any).session?.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized." });

  const computedQuota = await computeWeb3Quota(client, userId);
  const record = await client.db.Web3Premium.get(userId);
  const subscriptions = await getUserSubscriptions(client, userId);

  if (computedQuota === 0 && !record) {
    return reply.send({
      active: false,
      computedQuota: 0,
      usedQuota: 0,
      redeemedGuilds: [],
      subscriptions: [],
    });
  }

  return reply.send({
    active: computedQuota > 0,
    computedQuota,
    usedQuota: record?.usedQuota ?? 0,
    redeemedGuilds: record?.redeemedGuilds ?? [],
    walletAddress: record?.walletAddress ?? null,
    subscriptions,
  });
}

export async function postWeb3PremiumClaim(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = (req as any).session?.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized." });

  const { guildId } = req.body as { guildId?: string };
  if (!guildId) {
    return reply.code(400).send({ error: "guildId is required." });
  }

  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return reply.code(404).send({ error: "Guild not found or bot is not in it." });
    }

    const computedQuota = await computeWeb3Quota(client, userId);
    if (computedQuota <= 0) {
      return reply.code(404).send({ error: "No active Web3 premium found." });
    }

    const web3Data = await client.db.Web3Premium.get(userId);
    const usedQuota = web3Data?.usedQuota ?? 0;
    if (usedQuota >= computedQuota) {
      return reply.code(400).send({ error: `Quota full (${usedQuota}/${computedQuota}). Unclaim a server first.` });
    }

    const redeemed = web3Data?.redeemedGuilds ?? [];
    if (redeemed.includes(guildId)) {
      return reply.code(400).send({ error: "Premium is already claimed for this server via Web3." });
    }

    // Check if guild already has premium from another source
    const { checkGlobalPremium } = await import("./premiumClaim.js");
    const isAlreadyPremium = await checkGlobalPremium(client, guildId);
    if (isAlreadyPremium) {
      return reply.code(400).send({ error: "This server already has premium active from another source." });
    }

    redeemed.push(guildId);
    const newUsed = usedQuota + 1;

    // Ensure Web3Premium record exists
    const updatedRecord = web3Data ?? {
      walletAddress: "",
      txHash: "",
      plan: "",
      amount: "",
      isUserPremium: true,
      maxQuota: 0,
      usedQuota: 0,
      redeemedGuilds: [],
      redeemedAt: Date.now(),
      activatedAt: Date.now(),
      expiresAt: 0,
    };
    updatedRecord.redeemedGuilds = redeemed;
    updatedRecord.usedQuota = newUsed;
    updatedRecord.isUserPremium = true;
    await client.db.Web3Premium.set(userId, updatedRecord);

    client.logger.info(
      "Web3Premium",
      `User ${userId} claimed premium for guild ${guildId} (${guild.name}). Quota: ${newUsed}/${computedQuota}`
    );

    return reply.send({
      success: true,
      message: `Premium activated for **${guild.name}** via Web3.`,
      quota: `${newUsed}/${computedQuota}`,
    });
  } catch (err) {
    client.logger.error("Web3Premium", `postWeb3PremiumClaim: ${err}`);
    return reply.code(500).send({ error: "Failed to claim premium." });
  }
}

export async function postWeb3PremiumUnclaim(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = (req as any).session?.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized." });

  const { guildId } = req.body as { guildId?: string };
  if (!guildId) {
    return reply.code(400).send({ error: "guildId is required." });
  }

  try {
    const guild = client.guilds.cache.get(guildId);
    const guildName = guild?.name ?? guildId;

    const web3Data = await client.db.Web3Premium.get(userId);
    if (!web3Data) {
      return reply.code(404).send({ error: "No Web3 premium data found." });
    }
    const redeemed = web3Data.redeemedGuilds ?? [];
    if (!redeemed.includes(guildId)) {
      return reply.code(400).send({ error: "This server is not claimed via your Web3 premium." });
    }

    web3Data.redeemedGuilds = redeemed.filter((id: string) => id !== guildId);
    web3Data.usedQuota = Math.max(0, (web3Data.usedQuota ?? 0) - 1);
    await client.db.Web3Premium.set(userId, web3Data);

    const computedQuota = await computeWeb3Quota(client, userId);

    client.logger.info(
      "Web3Premium",
      `User ${userId} unclaimed premium from guild ${guildId} (${guildName}). Quota: ${web3Data.usedQuota}/${computedQuota}`
    );

    return reply.send({
      success: true,
      message: `Premium deactivated from **${guildName}** (Web3).`,
      quota: `${web3Data.usedQuota}/${computedQuota}`,
    });
  } catch (err) {
    client.logger.error("Web3Premium", `postWeb3PremiumUnclaim: ${err}`);
    return reply.code(500).send({ error: "Failed to unclaim premium." });
  }
}
