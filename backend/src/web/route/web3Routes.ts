import type { FastifyRequest, FastifyReply } from "fastify";
import type { Manager } from "../../manager.js";
import { randomBytes } from "crypto";
import axios from "axios";

// Somnia Network
const SOMNIA_RPC = "https://dream-rpc.somnia.network";

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

// ─── Tier Config (by tier name) ───

const TIER_CONFIG: Record<string, { quota: number; price: number }> = {
  basic: { quota: 1, price: 2 },
  plus: { quota: 3, price: 3 },
  pro: { quota: 5, price: 5 },
};

async function getUserActiveSubscriptions(client: Manager, userId: string) {
  const all = await client.db.Web3Subscriptions.all();
  return all.filter(
    (s) =>
      s.value?.discordUserId === userId &&
      s.value?.isActive !== false &&
      (s.value?.expiresAt ?? 0) > Date.now()
  );
}

async function recalculateUserPremium(client: Manager, userId: string) {
  const activeSubs = await getUserActiveSubscriptions(client, userId);
  if (activeSubs.length === 0) {
    await client.db.premium.delete(userId);
    return { totalQuota: 0, maxExpiry: 0 };
  }
  const totalQuota = activeSubs.reduce((sum, s) => sum + (s.value?.quota ?? 0), 0);
  const maxExpiry = Math.max(...activeSubs.map((s) => s.value?.expiresAt ?? 0));
  const existing = await client.db.premium.get(userId);
  await client.db.premium.set(userId, {
    ...existing,
    id: userId,
    isPremium: true,
    expiresAt: maxExpiry,
    plan: "web3_stacked",
    redeemedAt: existing?.redeemedAt ?? Date.now(),
    redeemedBy: existing?.redeemedBy ?? {
      id: userId,
      username: "web3",
      displayName: "Web3 Subscriber",
      avatarURL: "",
      createdAt: Date.now(),
      mention: "",
    },
  });
  return { totalQuota, maxExpiry };
}

// ─── Wallet Management ───

export async function connectWallet(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = req.session.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { walletAddress } = req.body as { walletAddress?: string };
  if (!walletAddress || !isValidAddress(walletAddress)) {
    return reply.code(400).send({ error: "Invalid wallet address" });
  }

  const profile = await client.db.UserProfile.get(userId);
  if (!profile) return reply.code(404).send({ error: "User profile not found" });

  await client.db.UserProfile.set(userId, {
    ...profile,
    walletAddress: walletAddress.toLowerCase(),
    walletProvider: "privy",
    walletConnectedAt: Date.now(),
  });

  return reply.send({
    success: true,
    walletAddress: walletAddress.toLowerCase(),
    walletProvider: "privy",
  });
}

export async function disconnectWallet(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = req.session.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const profile = await client.db.UserProfile.get(userId);
  if (!profile) return reply.code(404).send({ error: "User profile not found" });

  await client.db.UserProfile.set(userId, {
    ...profile,
    walletAddress: null,
    walletProvider: null,
    walletConnectedAt: null,
  });

  return reply.send({ success: true });
}

export async function getWalletStatus(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = req.session.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const profile = await client.db.UserProfile.get(userId);
  return reply.send({
    connected: !!profile?.walletAddress,
    walletAddress: profile?.walletAddress ?? null,
    walletProvider: profile?.walletProvider ?? null,
    walletConnectedAt: profile?.walletConnectedAt ?? null,
  });
}

// ─── Community / Guild Tip Data ───

export async function getGuildTipContract(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { guildId } = req.params as { guildId: string };
  const guildWeb3 = await client.db.GuildWeb3.get(guildId);
  return reply.send({
    guildId,
    contractAddress: guildWeb3?.contractAddress ?? null,
    createdAt: guildWeb3?.createdAt ?? null,
    tipNotifyChannelId: guildWeb3?.tipNotifyChannelId ?? null,
  });
}

export async function registerGuildTipContract(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = req.session.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { guildId, contractAddress } = req.body as {
    guildId?: string;
    contractAddress?: string;
  };

  if (!guildId || !contractAddress || !isValidAddress(contractAddress)) {
    return reply.code(400).send({ error: "Invalid guildId or contract address" });
  }

  // Allow guild owner OR users with Manage Server permission
  const guilds = req.session.guilds;
  const sessionGuild = guilds?.find((g) => g.id === guildId);
  const botGuild = client.guilds.cache.get(guildId);
  const isGuildOwner = sessionGuild?.owner === true || botGuild?.ownerId === userId;
  const permissionBits =
    (sessionGuild as { permissions?: string; permissions_new?: string } | undefined)?.permissions ??
    (sessionGuild as { permissions?: string; permissions_new?: string } | undefined)?.permissions_new;
  let hasManageGuild = false;
  if (permissionBits) {
    try {
      hasManageGuild = (BigInt(permissionBits) & BigInt(0x20)) !== BigInt(0);
    } catch {
      hasManageGuild = false;
    }
  }
  if (!isGuildOwner && !hasManageGuild) {
    return reply.code(403).send({ error: "You need Manage Server permission to create a tip contract" });
  }

  const existing = await client.db.GuildWeb3.get(guildId);
  if (existing?.contractAddress) {
    return reply.code(409).send({ error: "Guild already has a tip contract" });
  }

  await client.db.GuildWeb3.set(guildId, {
    guildId,
    contractAddress: contractAddress.toLowerCase(),
    createdAt: Date.now(),
  });

  // Notify ReactivityService to monitor the new contract
  if (client.reactivityService?.addTipContract) {
    client.reactivityService.addTipContract(contractAddress, guildId);
  }

  return reply.send({ success: true, contractAddress: contractAddress.toLowerCase() });
}

export async function getGuildTipNotify(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { guildId } = req.params as { guildId: string };
  const guildWeb3 = await client.db.GuildWeb3.get(guildId);
  return reply.send({
    guildId,
    tipNotifyChannelId: guildWeb3?.tipNotifyChannelId ?? null,
  });
}

export async function setGuildTipNotify(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = req.session.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { guildId } = req.params as { guildId: string };
  const { channelId } = req.body as { channelId?: string | null };
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return reply.code(404).send({ error: "Guild not found" });

  const sessionGuild = req.session.guilds?.find((g) => g.id === guildId);
  const isGuildOwner = sessionGuild?.owner === true || guild.ownerId === userId;
  const permissionBits =
    (sessionGuild as { permissions?: string; permissions_new?: string } | undefined)?.permissions ??
    (sessionGuild as { permissions?: string; permissions_new?: string } | undefined)?.permissions_new;
  let hasManageGuild = false;
  if (permissionBits) {
    try {
      hasManageGuild = (BigInt(permissionBits) & BigInt(0x20)) !== BigInt(0);
    } catch {
      hasManageGuild = false;
    }
  }
  if (!isGuildOwner && !hasManageGuild) {
    return reply.code(403).send({ error: "You need Manage Server permission to manage tip notifications" });
  }

  const existing = await client.db.GuildWeb3.get(guildId);
  if (!existing?.contractAddress) {
    return reply.code(400).send({ error: "This server does not have a tip contract yet" });
  }

  if (!channelId) {
    await client.db.GuildWeb3.set(guildId, {
      ...existing,
      tipNotifyChannelId: null,
    });
    return reply.send({ success: true, tipNotifyChannelId: null });
  }

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased() || channel.isVoiceBased() || channel.isThread()) {
    return reply.code(400).send({ error: "Selected channel must be a text channel" });
  }

  await client.db.GuildWeb3.set(guildId, {
    ...existing,
    tipNotifyChannelId: channelId,
  });

  return reply.send({ success: true, tipNotifyChannelId: channelId });
}

export async function getGuildTips(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { guildId } = req.params as { guildId: string };
  const allTips = await client.db.Web3Tips.all();
  const guildTips = allTips
    .filter((t) => t.value?.guildId === guildId)
    .map((t) => t.value)
    .sort((a, b) => (b?.timestamp ?? 0) - (a?.timestamp ?? 0));

  const totalAmount = guildTips.reduce((acc, tip) => {
    return acc + BigInt(tip?.amount ?? "0");
  }, BigInt(0));

  return reply.send({
    guildId,
    totalTips: totalAmount.toString(),
    tipCount: guildTips.length,
    tips: guildTips.slice(0, 50).map((t) => ({
      id: t?.id ?? "",
      guildId: t?.guildId ?? "",
      senderWallet: t?.senderWallet ?? "",
      amount: t?.amount ?? "0",
      txHash: t?.txHash ?? "",
      timestamp: t?.timestamp ?? 0,
      message: t?.message ?? "",
    })),
  });
}

export async function getCommunityServers(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { search } = req.query as { search?: string };
  const allGuildWeb3 = await client.db.GuildWeb3.all();
  const allPreGuilds = await client.db.preGuild.all();

  const botGuilds = Array.from(client.guilds.cache.values());

  // Build premium status map
  const premiumByGuild = new Map<string, { isPremium: boolean; plan: string | null }>();
  for (const pg of allPreGuilds) {
    if (pg.value?.isPremium) {
      premiumByGuild.set(pg.id, {
        isPremium: true,
        plan: pg.value?.plan ?? null,
      });
    }
  }

  // Only include guilds that have a deployed contract
  let servers = botGuilds
    .map((g) => {
      const web3 = allGuildWeb3.find((w) => w.id === g.id);
      if (!web3?.value?.contractAddress) return null;
      const prem = premiumByGuild.get(g.id);
      return {
        id: g.id,
        name: g.name,
        icon: g.iconURL({ size: 128 }) ?? null,
        memberCount: g.memberCount,
        ownerId: g.ownerId,
        contractAddress: web3.value.contractAddress,
        contractCreatedAt: web3.value?.createdAt ?? 0,
        joinedAt: g.joinedTimestamp ?? 0,
        hasPremium: prem?.isPremium ?? false,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  // Apply search filter
  if (search && search.trim().length > 0) {
    const searchLower = search.trim().toLowerCase();
    servers = servers.filter((s) => s.name.toLowerCase().includes(searchLower));
  }

  // Popular: by member count (most active communities first)
  const popularServers = [...servers].sort((a, b) => b.memberCount - a.memberCount).slice(0, 20);
  // Newest: by contract deployment date
  const newestServers = [...servers].sort((a, b) => (b.contractCreatedAt ?? 0) - (a.contractCreatedAt ?? 0)).slice(0, 20);

  return reply.send({ popularServers, newestServers });
}

export async function getCommunityServerDetail(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { guildId } = req.params as { guildId: string };
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return reply.code(404).send({ error: "Server not found" });

  const [web3, guildPremium] = await Promise.all([
    client.db.GuildWeb3.get(guildId),
    client.db.preGuild.get(guildId),
  ]);

  if (!web3?.contractAddress) return reply.code(404).send({ error: "Server has no tip contract" });

  const owner = await guild.fetchOwner().catch(() => null);
  const hasPremium = !!guildPremium?.isPremium;

  // Try to get an invite URL if bot has CREATE_INSTANT_INVITE permission
  let inviteUrl: string | null = null;
  try {
    const me = await guild.members.fetchMe();
    if (me.permissions.has("CreateInstantInvite")) {
      const existingInvites = await guild.invites.fetch().catch(() => null);
      const botInvite = existingInvites?.find((inv) => inv.inviterId === client.user?.id && !inv.expiresAt);
      if (botInvite) {
        inviteUrl = botInvite.url;
      } else {
        const defaultChannel = guild.systemChannel || guild.channels.cache.find((c) => c.isTextBased() && c.permissionsFor(me)?.has("CreateInstantInvite"));
        if (defaultChannel && "createInvite" in defaultChannel) {
          const invite = await (defaultChannel as any).createInvite({ maxAge: 0, maxUses: 0, reason: "Community server listing" }).catch(() => null);
          inviteUrl = invite?.url ?? null;
        }
      }
    }
  } catch {
    // Bot doesn't have permission or other error
  }

  return reply.send({
    id: guild.id,
    name: guild.name,
    icon: guild.iconURL({ size: 256 }) ?? null,
    memberCount: guild.memberCount,
    ownerId: guild.ownerId,
    ownerName: owner?.user?.username ?? null,
    contractAddress: web3.contractAddress,
    hasPremium,
    inviteUrl,
  });
}

export async function getUserSubscriptions(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = req.session.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const allSubs = await client.db.Web3Subscriptions.all();
  const userSubs = allSubs
    .filter((s) => s.value?.discordUserId === userId)
    .map((s) => s.value)
    .sort((a, b) => (b?.timestamp ?? 0) - (a?.timestamp ?? 0));

  return reply.send({ subscriptions: userSubs });
}

// ─── Verify & Claim Premium Subscription ───

async function rpcCall(method: string, params: unknown[]): Promise<any> {
  const { data } = await axios.post(SOMNIA_RPC, {
    jsonrpc: "2.0",
    id: 1,
    method,
    params,
  });
  return data.result;
}

export async function verifyAndClaimSubscription(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = req.session.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { txHash, tier } = req.body as { txHash?: string; tier?: "basic" | "plus" | "pro" };

  if (!txHash || !isValidTxHash(txHash)) {
    return reply.code(400).send({ error: "Invalid transaction hash" });
  }

  if (!tier || !TIER_CONFIG[tier]) {
    return reply.code(400).send({ error: "Invalid subscription tier. Must be basic, plus, or pro." });
  }

  const tierInfo = TIER_CONFIG[tier];

  // Check if already claimed
  const existingSubs = await client.db.Web3Subscriptions.all();
  const alreadyClaimed = existingSubs.some((s) => s.value?.txHash === txHash);
  if (alreadyClaimed) {
    return reply.code(409).send({ error: "This transaction has already been claimed" });
  }

  // Get user's wallet address
  const profile = await client.db.UserProfile.get(userId);
  if (!profile?.walletAddress) {
    return reply.code(400).send({ error: "No wallet connected. Please connect your wallet first." });
  }

  try {
    // Verify transaction on-chain via RPC
    const txReceipt = await rpcCall("eth_getTransactionReceipt", [txHash]);

    if (!txReceipt) {
      return reply.code(404).send({ error: "Transaction not found. It may still be pending." });
    }

    // Check transaction succeeded
    if (txReceipt.status !== "0x1") {
      return reply.code(400).send({ error: "Transaction failed on-chain" });
    }

    // Verify the sender matches the user's wallet
    const tx = await rpcCall("eth_getTransactionByHash", [txHash]);
    if (!tx) {
      return reply.code(404).send({ error: "Transaction not found" });
    }

    const txFrom = tx.from?.toLowerCase();
    const userWallet = profile.walletAddress.toLowerCase();
    if (txFrom !== userWallet) {
      return reply.code(403).send({
        error: "Transaction sender does not match your connected wallet",
      });
    }

    // Verify the transaction was sent to the PremiumSubscription contract
    const web3Config = (client.config as any).Web3;
    const premiumContract = web3Config?.PremiumSubscriptionContract?.toLowerCase();
    if (premiumContract && tx.to?.toLowerCase() !== premiumContract) {
      return reply.code(400).send({ error: "Transaction is not for the subscription contract" });
    }

    // Save subscription record with tier, quota, expiry
    const now = Date.now();
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days
    const subId = randomBytes(16).toString("hex");
    await client.db.Web3Subscriptions.set(subId, {
      id: subId,
      discordUserId: userId,
      walletAddress: userWallet,
      tier,
      quota: tierInfo.quota,
      months: 1,
      amount: tx.value || "0",
      txHash,
      timestamp: now,
      expiresAt,
      isActive: true,
    });

    // Recalculate aggregate premium from all active subscriptions
    const { totalQuota, maxExpiry } = await recalculateUserPremium(client, userId);

    client.logger.info(
      "Web3VerifyService",
      `Premium verified & activated for ${userId} (tier: ${tier}, quota: ${tierInfo.quota}) tx: ${txHash}`
    );

    return reply.send({
      success: true,
      message: `Premium ${tier} activated! Quota: ${tierInfo.quota} guild(s).`,
      tier,
      quota: tierInfo.quota,
      totalQuota,
      expiresAt: maxExpiry,
    });
  } catch (err: any) {
    client.logger.error("Web3VerifyService", `Failed to verify tx ${txHash}: ${err.message}`);
    return reply.code(500).send({ error: "Failed to verify transaction. Please try again." });
  }
}

// ─── Web3 Premium Guild Activation ───

/**
 * Get the user's Web3 premium status + activated guilds.
 * Dynamically computes maxQuota from all active subscriptions (quota stacking).
 * Returns: isPremium, expiresAt, plan, maxQuota, usedQuota, subscriptions[], activatedGuilds[], userGuilds[]
 */
export async function getWeb3PremiumStatus(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = req.session.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const premium = await client.db.premium.get(userId);
  const isWeb3Premium = premium?.isPremium && (premium?.plan?.startsWith("web3_") || premium?.plan === "web3_stacked");

  // Get all active Web3 subscriptions for this user
  const activeSubs = await getUserActiveSubscriptions(client, userId);
  const maxQuota = activeSubs.reduce((sum, s) => sum + (s.value?.quota ?? 0), 0);

  // Count how many guilds this user has activated via Web3
  const allPreGuilds = await client.db.preGuild.all();
  const userActivatedGuilds = allPreGuilds.filter(
    (g) => g.value?.redeemedBy?.ownerId === userId && (g.value?.plan?.startsWith("web3_") || g.value?.plan === "web3_stacked")
  );

  const usedQuota = userActivatedGuilds.length;

  // Build active subscriptions info
  const subscriptions = activeSubs.map((s) => ({
    id: s.value?.id ?? s.id,
    tier: s.value?.tier ?? "basic",
    quota: s.value?.quota ?? 0,
    amount: s.value?.amount ?? "0",
    expiresAt: s.value?.expiresAt ?? 0,
    timestamp: s.value?.timestamp ?? 0,
    txHash: s.value?.txHash ?? "",
  }));

  // Build activated guilds info
  const activatedGuilds = userActivatedGuilds.map((g) => {
    const guild = client.guilds.cache.get(g.id);
    return {
      guildId: g.id,
      name: g.value?.redeemedBy?.name ?? guild?.name ?? "Unknown Server",
      icon: guild?.iconURL({ size: 128 }) ?? null,
      activatedAt: g.value?.redeemedAt ?? 0,
      expiresAt: g.value?.expiresAt ?? 0,
    };
  });

  // Get user's guilds from session (where the bot is also present)
  const userGuilds = (req.session.guilds ?? [])
    .filter((g) => client.guilds.cache.has(g.id))
    .map((g) => {
      const botGuild = client.guilds.cache.get(g.id);
      const isAlreadyActivated = userActivatedGuilds.some((ag) => ag.id === g.id);
      // Check if guild has premium from another source
      const guildPre = allPreGuilds.find((pg) => pg.id === g.id);
      const hasPremiumFromOther = guildPre?.value?.isPremium && !guildPre?.value?.plan?.startsWith("web3_") && guildPre?.value?.plan !== "web3_stacked";
      return {
        id: g.id,
        name: g.name,
        icon: botGuild?.iconURL({ size: 128 }) ?? null,
        memberCount: botGuild?.memberCount ?? 0,
        isActivated: isAlreadyActivated,
        hasPremiumFromOther: !!hasPremiumFromOther,
      };
    });

  return reply.send({
    isPremium: !!isWeb3Premium,
    expiresAt: premium?.expiresAt ?? null,
    plan: premium?.plan ?? null,
    maxQuota,
    usedQuota,
    subscriptions,
    activatedGuilds,
    userGuilds,
  });
}

/**
 * Activate Web3 premium on a guild. User must have active Web3 premium
 * and available quota (dynamically computed from active subscriptions).
 */
export async function activateGuildPremium(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = req.session.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { guildId } = req.body as { guildId?: string };
  if (!guildId) return reply.code(400).send({ error: "Missing guildId" });

  // Check user has active Web3 premium
  const premium = await client.db.premium.get(userId);
  const isWeb3Premium = premium?.isPremium && (premium?.plan?.startsWith("web3_") || premium?.plan === "web3_stacked");
  if (!isWeb3Premium) {
    return reply.code(403).send({ error: "You don't have an active Web3 premium subscription" });
  }

  // Check the guild exists and the bot is in it
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    return reply.code(404).send({ error: "Server not found or bot is not in this server" });
  }

  // Check user is in the guild
  const userGuilds = req.session.guilds ?? [];
  const userInGuild = userGuilds.some((g) => g.id === guildId);
  if (!userInGuild) {
    return reply.code(403).send({ error: "You are not a member of this server" });
  }

  // Check guild doesn't already have premium
  const existingGuildPre = await client.db.preGuild.get(guildId);
  if (existingGuildPre?.isPremium) {
    return reply.code(409).send({ error: "This server already has premium active" });
  }

  // Dynamic quota from active subscriptions
  const activeSubs = await getUserActiveSubscriptions(client, userId);
  const totalQuota = activeSubs.reduce((sum, s) => sum + (s.value?.quota ?? 0), 0);
  const maxExpiry = activeSubs.length > 0 ? Math.max(...activeSubs.map((s) => s.value?.expiresAt ?? 0)) : 0;

  // Check quota
  const allPreGuilds = await client.db.preGuild.all();
  const usedQuota = allPreGuilds.filter(
    (g) => g.value?.redeemedBy?.ownerId === userId && (g.value?.plan?.startsWith("web3_") || g.value?.plan === "web3_stacked")
  ).length;
  if (usedQuota >= totalQuota) {
    return reply.code(403).send({
      error: `You have used all ${totalQuota} guild slot(s). Deactivate a server or upgrade your subscription.`,
    });
  }

  // Activate guild premium
  const now = Date.now();
  const owner = await guild.fetchOwner().catch(() => null);

  await client.db.preGuild.set(guildId, {
    id: guildId,
    isPremium: true,
    redeemedBy: {
      id: guildId,
      name: guild.name,
      createdAt: guild.createdAt.getTime(),
      GuildiconURL: guild.iconURL({ size: 512 }) ?? null,
      ownerId: userId,
      ownerName: owner?.user?.username ?? "Unknown",
      ownerMention: `<@${userId}>`,
    },
    redeemedAt: now,
    expiresAt: maxExpiry,
    plan: "web3_stacked",
  } as any);

  client.logger.info(
    "Web3GuildPremium",
    `Guild ${guildId} (${guild.name}) activated as premium by ${userId}`
  );

  return reply.send({
    success: true,
    message: `Premium activated on ${guild.name}!`,
    guildId,
    expiresAt: maxExpiry,
  });
}

/**
 * Deactivate Web3 premium from a guild.
 */
export async function deactivateGuildPremium(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = req.session.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { guildId } = req.body as { guildId?: string };
  if (!guildId) return reply.code(400).send({ error: "Missing guildId" });

  // Check the guild has Web3 premium activated by this user
  const guildPre = await client.db.preGuild.get(guildId);
  if (!guildPre?.isPremium || (!guildPre?.plan?.startsWith("web3_") && guildPre?.plan !== "web3_stacked")) {
    return reply.code(404).send({ error: "This server does not have premium active" });
  }

  if (guildPre.redeemedBy?.ownerId !== userId) {
    return reply.code(403).send({ error: "You did not activate premium on this server" });
  }

  await client.db.preGuild.delete(guildId);

  const guild = client.guilds.cache.get(guildId);
  client.logger.info(
    "Web3GuildPremium",
    `Guild ${guildId} (${guild?.name ?? "?"}) premium deactivated by ${userId}`
  );

  return reply.send({
    success: true,
    message: `Premium deactivated from ${guild?.name ?? "server"}`,
    guildId,
  });
}

// ─── Guild Web3 Overview (for Guild Stats page) ───

/**
 * Get full Web3 overview for a guild: server info, contract, premium status, tip stats.
 */
export async function getGuildWeb3Overview(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = req.session.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { guildId } = req.params as { guildId: string };

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return reply.code(404).send({ error: "Server not found" });

  // Fetch guild Web3 contract, premium status, and tips in parallel
  const [guildWeb3, guildPremium, allTips] = await Promise.all([
    client.db.GuildWeb3.get(guildId),
    client.db.preGuild.get(guildId),
    client.db.Web3Tips.all(),
  ]);

  // Calculate tip stats
  const guildTips = allTips
    .filter((t) => t.value?.guildId === guildId)
    .map((t) => t.value)
    .sort((a, b) => (b?.timestamp ?? 0) - (a?.timestamp ?? 0));

  const totalTipsAmount = guildTips.reduce(
    (acc, tip) => acc + BigInt(tip?.amount ?? "0"),
    BigInt(0)
  );

  // Determine if current user is the guild owner
  const isGuildOwner = guild.ownerId === userId;

  // Premium info
  const hasPremium = !!guildPremium?.isPremium;
  let premiumPlan: string | null = null;
  let premiumExpiresAt: number | "lifetime" | null = null;
  let premiumRedeemedBy: string | null = null;
  if (hasPremium && guildPremium) {
    premiumPlan = guildPremium.plan ?? null;
    premiumExpiresAt = guildPremium.expiresAt ?? null;
    premiumRedeemedBy = guildPremium.redeemedBy?.ownerMention ?? null;
  }

  return reply.send({
    guildId,
    name: guild.name,
    icon: guild.iconURL({ size: 256 }) ?? null,
    memberCount: guild.memberCount,
    ownerId: guild.ownerId,
    isGuildOwner,

    // Contract
    contractAddress: guildWeb3?.contractAddress ?? null,

    // Premium
    hasPremium,
    premiumPlan,
    premiumExpiresAt,
    premiumRedeemedBy,

    // Tips
    totalTips: totalTipsAmount.toString(),
    tipCount: guildTips.length,
    recentTips: guildTips.slice(0, 5).map((t) => ({
      senderWallet: t?.senderWallet ?? "",
      amount: t?.amount ?? "0",
      txHash: t?.txHash ?? "",
      timestamp: t?.timestamp ?? 0,
      message: t?.message ?? "",
    })),
  });
}

// ─── Admin Platform Stats ───

/**
 * Get platform-wide statistics (admin only).
 * GET /api/admin/platform-stats
 */
export async function getAdminPlatformStats(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = req.session.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  // Check if user is admin/owner
  const ownerStr = String(client.owner ?? "");
  const adminList = (client.config.bot.ADMIN ?? []).map(String);
  const isOwner = userId === ownerStr;
  const isAdmin = adminList.includes(userId);

  client.logger.info("AdminStats", `userId=${userId} owner=${ownerStr} isOwner=${isOwner} isAdmin=${isAdmin} adminList=[${adminList.join(",")}]`);

  if (!isOwner && !isAdmin) {
    return reply.code(403).send({ error: "Admin only" });
  }

  // Get all tips
  const allTips = await client.db.Web3Tips.all();
  const totalTipAmount = allTips.reduce(
    (acc, t) => acc + BigInt(t.value?.amount ?? "0"),
    BigInt(0)
  );
  const tipCount = allTips.length;

  // Get unique guilds that received tips
  const tippedGuilds = new Set(allTips.map((t) => t.value?.guildId).filter(Boolean));

  // Get all subscriptions
  const allSubs = await client.db.Web3Subscriptions.all();
  const subCount = allSubs.length;
  const activeSubCount = allSubs.filter(
    (s) => s.value?.isActive !== false && (s.value?.expiresAt ?? 0) > Date.now()
  ).length;

  // Count by tier
  const tierCounts: Record<string, number> = { basic: 0, plus: 0, pro: 0, unknown: 0 };
  for (const sub of allSubs) {
    const tier = sub.value?.tier;
    if (tier && tierCounts[tier] !== undefined) {
      tierCounts[tier]++;
    } else {
      tierCounts.unknown++;
    }
  }

  const totalSubRevenue = allSubs.reduce(
    (acc, s) => acc + BigInt(s.value?.amount ?? "0"),
    BigInt(0)
  );

  // Premium guilds
  const allPreGuilds = await client.db.preGuild.all();
  const premiumGuildCount = allPreGuilds.filter((g) => g.value?.isPremium).length;

  // Users with premium
  const allPremium = await client.db.premium.all();
  const premiumUserCount = allPremium.filter((p) => p.value?.isPremium).length;

  return reply.send({
    tips: {
      totalAmount: totalTipAmount.toString(),
      count: tipCount,
      uniqueGuilds: tippedGuilds.size,
    },
    subscriptions: {
      total: subCount,
      active: activeSubCount,
      byTier: tierCounts,
      totalRevenue: totalSubRevenue.toString(),
    },
    premium: {
      guilds: premiumGuildCount,
      users: premiumUserCount,
    },
    platform: {
      totalGuilds: client.guilds.cache.size,
      totalUsers: client.users.cache.size,
    },
  });
}

// ─── Community Server Invite ───

/**
 * Get or create an invite for a community server.
 * GET /api/community/servers/:guildId/invite
 */
export async function getCommunityServerInvite(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { guildId } = req.params as { guildId: string };
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return reply.code(404).send({ error: "Server not found" });

  try {
    const me = await guild.members.fetchMe();
    if (!me.permissions.has("CreateInstantInvite")) {
      return reply.code(403).send({ error: "Bot does not have CREATE_INSTANT_INVITE permission" });
    }

    // Try to find an existing non-expiring invite created by the bot
    const existingInvites = await guild.invites.fetch().catch(() => null);
    const botInvite = existingInvites?.find(
      (inv) => inv.inviterId === client.user?.id && !inv.expiresAt
    );
    if (botInvite) {
      return reply.send({ inviteUrl: botInvite.url, guildId });
    }

    // Create a new invite on the system channel or first available text channel
    const defaultChannel =
      guild.systemChannel ||
      guild.channels.cache.find(
        (c) => c.isTextBased() && c.permissionsFor(me)?.has("CreateInstantInvite")
      );

    if (!defaultChannel || !("createInvite" in defaultChannel)) {
      return reply.code(404).send({ error: "No suitable channel found to create invite" });
    }

    const invite = await (defaultChannel as any).createInvite({
      maxAge: 0,
      maxUses: 0,
      reason: "Community server listing invite",
    });

    return reply.send({ inviteUrl: invite.url, guildId });
  } catch (err: any) {
    client.logger.error("CommunityInvite", `Failed to get/create invite for ${guildId}: ${err.message}`);
    return reply.code(500).send({ error: "Failed to get or create invite" });
  }
}
