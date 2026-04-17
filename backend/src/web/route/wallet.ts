import { randomBytes } from "crypto";
import { verifyMessage } from "ethers";
import type { FastifyRequest, FastifyReply } from "fastify";
import type { Manager } from "../../manager.js";

const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const nonceStore = new Map<string, { nonce: string; createdAt: number }>();

// Cleanup expired nonces periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of nonceStore) {
    if (now - val.createdAt > NONCE_EXPIRY_MS) nonceStore.delete(key);
  }
}, 60_000);

export async function getWalletNonce(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = req.session.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized." });

  const nonce = randomBytes(32).toString("hex");
  nonceStore.set(userId, { nonce, createdAt: Date.now() });

  return reply.send({
    nonce,
    message: `Sign this message to verify your wallet ownership for Mewwme.\n\nNonce: ${nonce}`,
  });
}

export async function postWalletBind(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = req.session.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized." });

  const { walletAddress, signature } = req.body as {
    walletAddress?: string;
    signature?: string;
  };

  if (!walletAddress || !signature) {
    return reply.code(400).send({ error: "walletAddress and signature are required." });
  }

  const addrLower = walletAddress.toLowerCase();

  // Validate address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return reply.code(400).send({ error: "Invalid wallet address format." });
  }

  // Check cooldown: if user already has a binding, enforce 7-day cooldown
  const existingUserBinding = await client.db.WalletBinding.get(userId);
  if (existingUserBinding && existingUserBinding.walletChangeAvailableAt) {
    const now = Date.now();
    if (now < existingUserBinding.walletChangeAvailableAt) {
      const remainingMs = existingUserBinding.walletChangeAvailableAt - now;
      return reply.code(429).send({
        error: `You can change your wallet after ${formatCooldownRemaining(remainingMs)}.`,
        walletChangeAvailableAt: existingUserBinding.walletChangeAvailableAt,
        remainingMs,
      });
    }
  }

  // Retrieve and validate nonce
  const stored = nonceStore.get(userId);
  if (!stored) {
    return reply.code(400).send({ error: "No nonce found. Please request a new nonce first." });
  }
  if (Date.now() - stored.createdAt > NONCE_EXPIRY_MS) {
    nonceStore.delete(userId);
    return reply.code(400).send({ error: "Nonce expired. Please request a new nonce." });
  }

  // Verify signature
  const expectedMessage = `Sign this message to verify your wallet ownership for Mewwme.\n\nNonce: ${stored.nonce}`;
  try {
    const recoveredAddress = verifyMessage(expectedMessage, signature);
    if (recoveredAddress.toLowerCase() !== addrLower) {
      return reply.code(403).send({ error: "Signature does not match wallet address." });
    }
  } catch {
    return reply.code(400).send({ error: "Invalid signature." });
  }

  // Clear used nonce
  nonceStore.delete(userId);

  // Check if this wallet is already bound to another user
  const allBindings = await client.db.WalletBinding.all();
  const existingBinding = allBindings.find((entry: any) => {
    const data = entry.value || entry.data || entry;
    return data.walletAddress?.toLowerCase() === addrLower;
  });
  if (existingBinding) {
    const existingId = (existingBinding as any).id || (existingBinding as any).key;
    if (existingId !== userId) {
      return reply.code(409).send({ error: "This wallet is already bound to another account." });
    }
  }

  // Store the binding with cooldown timestamps
  const now = Date.now();
  await client.db.WalletBinding.set(userId, {
    walletAddress: addrLower,
    nonce: stored.nonce,
    signature,
    createdAt: existingUserBinding?.createdAt || now,
    walletBoundAt: now,
    walletChangeAvailableAt: now + COOLDOWN_MS,
  });

  client.logger.info("WalletBind", `User ${userId} bound wallet ${addrLower} (cooldown until ${new Date(now + COOLDOWN_MS).toISOString()})`);

  return reply.send({
    success: true,
    walletAddress: addrLower,
    walletBoundAt: now,
    walletChangeAvailableAt: now + COOLDOWN_MS,
    message: "Wallet bound successfully.",
  });
}

export async function getWalletBinding(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = req.session.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized." });

  const binding = await client.db.WalletBinding.get(userId);
  if (!binding) {
    return reply.send({ bound: false, walletAddress: null });
  }

  return reply.send({
    bound: true,
    walletAddress: binding.walletAddress,
    createdAt: binding.createdAt,
    walletBoundAt: binding.walletBoundAt || binding.createdAt,
    walletChangeAvailableAt: binding.walletChangeAvailableAt || 0,
  });
}

export async function deleteWalletUnbind(
  client: Manager,
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = req.session.user?.id;
  if (!userId) return reply.code(401).send({ error: "Unauthorized." });

  const binding = await client.db.WalletBinding.get(userId);
  if (!binding) {
    return reply.code(404).send({ error: "No wallet binding found." });
  }

  // Enforce cooldown
  if (binding.walletChangeAvailableAt) {
    const now = Date.now();
    if (now < binding.walletChangeAvailableAt) {
      const remainingMs = binding.walletChangeAvailableAt - now;
      return reply.code(429).send({
        error: `You can change your wallet after ${formatCooldownRemaining(remainingMs)}.`,
        walletChangeAvailableAt: binding.walletChangeAvailableAt,
        remainingMs,
      });
    }
  }

  await client.db.WalletBinding.delete(userId);
  client.logger.info("WalletUnbind", `User ${userId} unbound wallet ${binding.walletAddress}`);

  return reply.send({ success: true, message: "Wallet unbound successfully." });
}

function formatCooldownRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
