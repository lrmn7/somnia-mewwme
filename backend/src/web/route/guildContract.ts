import type { FastifyRequest, FastifyReply } from "fastify";
import type { Manager } from "../../manager.js";
import { buildDashboardUserPerm } from "./resolveDashboardAccess.js";

export async function getGuildOwnerWallet(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = req.session.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized." });

  const { guildId } = req.params as { guildId: string };
  if (!guildId) return reply.code(400).send({ error: "Missing guildId." });

  // Check MANAGE_GUILD permission
  const perm = await buildDashboardUserPerm(client, userId, guildId);
  if (!perm.hasManageGuild && !perm.isOwner && !perm.isAdmin) {
    return reply.code(403).send({
      error: "You need Manage Server permission.",
    });
  }

  // Resolve guild owner from Discord
  let guild;
  try {
    guild = client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId));
  } catch {
    return reply.code(404).send({ error: "Guild not found. Is the bot in this server?" });
  }

  const ownerId = guild.ownerId;
  if (!ownerId) {
    return reply.code(500).send({ error: "Could not resolve guild owner." });
  }

  // Look up owner's wallet binding
  const binding = await client.db.WalletBinding.get(ownerId);
  if (!binding || !binding.walletAddress) {
    return reply.send({
      bound: false,
      ownerDiscordId: ownerId,
      ownerWallet: null,
      error: "Guild owner has not connected their wallet. Ask the server owner to bind their wallet first.",
    });
  }

  return reply.send({
    bound: true,
    ownerDiscordId: ownerId,
    ownerWallet: binding.walletAddress.toLowerCase(),
  });
}

export async function postGuildContract(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = req.session.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized." });

  const { guildId } = req.params as { guildId: string };
  const { contractAddress, factoryAddress, creatorWallet, ownerWallet, txHash } = req.body as {
    contractAddress?: string;
    factoryAddress?: string;
    creatorWallet?: string;
    ownerWallet?: string;
    txHash?: string;
  };

  if (!guildId || !creatorWallet) {
    return reply.code(400).send({
      error: "guildId and creatorWallet are required.",
    });
  }

  if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
    return reply.code(400).send({ error: "A valid contract address (0x + 40 hex chars) is required." });
  }

  // Check MANAGE_GUILD permission
  const perm = await buildDashboardUserPerm(client, userId, guildId);
  if (!perm.hasManageGuild && !perm.isOwner && !perm.isAdmin) {
    return reply.code(403).send({
      error: "You need Manage Server permission to create a contract for this guild.",
    });
  }

  // Check if contract already exists for this guild
  const existing = await client.db.GuildContract.get(guildId);
  if (existing) {
    return reply.code(409).send({
      error: "A contract already exists for this guild.",
      contractAddress: existing.contractAddress,
    });
  }

  // Fetch guild name/icon from Discord for storage
  let guildName = `Guild ${guildId}`;
  let guildIcon: string | null = null;
  try {
    const guild = client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId));
    if (guild) {
      guildName = guild.name;
      guildIcon = guild.iconURL({ size: 256 }) || null;
    }
  } catch {
    // Use defaults
  }

  // Store the contract
  await client.db.GuildContract.set(guildId, {
    contractAddress: contractAddress.toLowerCase(),
    factoryAddress: (factoryAddress || "").toLowerCase(),
    creatorDiscordId: userId,
    creatorWallet: creatorWallet.toLowerCase(),
    ownerWallet: (ownerWallet || "").toLowerCase(),
    txHash: txHash || "",
    guildName,
    guildIcon,
    createdAt: Date.now(),
  });

  // Emit socket event
  if (client.dashboardEmit) {
    client.dashboardEmit(guildId, "guildContractCreated", {
      guildId,
      contractAddress: contractAddress.toLowerCase(),
      creatorDiscordId: userId,
    });
  }

  client.logger.info(
    "GuildContract",
    `Guild ${guildId} contract created by ${userId}: ${contractAddress}`
  );

  return reply.send({
    success: true,
    contractAddress: contractAddress.toLowerCase(),
    message: "Guild contract registered successfully.",
  });
}

export async function getGuildContract(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const { guildId } = req.params as { guildId: string };
  if (!guildId) return reply.code(400).send({ error: "Missing guildId." });

  const data = await client.db.GuildContract.get(guildId);
  if (!data) {
    return reply.send({ exists: false, contractAddress: null });
  }

  return reply.send({
    exists: true,
    contractAddress: data.contractAddress,
    factoryAddress: data.factoryAddress,
    creatorDiscordId: data.creatorDiscordId,
    creatorWallet: data.creatorWallet,
    createdAt: data.createdAt,
  });
}
