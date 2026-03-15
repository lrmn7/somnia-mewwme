import { Manager } from "../manager.js";
import { randomBytes } from "crypto";
import {
  createPublicClient,
  webSocket,
  defineChain,
  decodeEventLog,
} from "viem";
import { SDK } from "@somnia-chain/reactivity";

// ─── Somnia Testnet Chain Definition ───

const somniaTestnet = defineChain({
  id: 50312,
  name: "Somnia Testnet",
  nativeCurrency: { decimals: 18, name: "STT", symbol: "STT" },
  rpcUrls: {
    default: {
      http: ["https://dream-rpc.somnia.network"],
      webSocket: ["ws://api.infra.testnet.somnia.network/ws"],
    },
  },
});

// ─── Contract ABIs (event-only) ───

const GUILD_TIP_EVENT_ABI = [
  {
    type: "event",
    name: "TipReceived",
    inputs: [
      { name: "guildId", type: "string", indexed: true },
      { name: "sender", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "message", type: "string", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

const SUBSCRIPTION_EVENT_ABI = [
  {
    type: "event",
    name: "SubscriptionCreated",
    inputs: [
      { name: "wallet", type: "address", indexed: true },
      { name: "tierId", type: "uint256", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "quota", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

// ─── Tier Mapping ───

const TIER_BY_ID: Record<string, { tier: "basic" | "plus" | "pro"; quota: number }> = {
  "1": { tier: "basic", quota: 1 },
  "2": { tier: "plus", quota: 3 },
  "3": { tier: "pro", quota: 5 },
};

/**
 * ReactivityService — Subscribes to Somnia on-chain events via WebSocket
 * using the @somnia-chain/reactivity SDK.
 *
 * - TipReceived: log only (no DB save — tip history is read from on-chain)
 * - SubscriptionCreated: save to DB and activate premium (important data)
 */
export class ReactivityService {
  private client: Manager;
  private sdk: SDK | null = null;
  private subscriptionContract: string | null = null;
  private tipContracts: Set<string> = new Set();
  private contractToGuild: Map<string, string> = new Map(); // contractAddress → guildId

  constructor(client: Manager) {
    this.client = client;
    this.init();
  }

  private async init() {
    const web3Config = (this.client.config as any).Web3;

    if (!web3Config?.Enable) {
      this.client.logger.info("ReactivityService", "Web3 is disabled, skipping Reactivity setup");
      return;
    }

    // Suppress unhandled WebSocket ErrorEvent from crashing/spamming console
    process.on("uncaughtException", (err: any) => {
      if (err?.message?.includes("Unexpected server response") || err?.type === "error") {
        this.client.logger.warn("ReactivityService", `WebSocket connection error (will retry): ${err.message ?? "unknown"}`);
        return;
      }
      throw err;
    });

    this.subscriptionContract = web3Config.PremiumSubscriptionContract?.toLowerCase() ?? null;

    // Load existing guild tip contracts from DB
    try {
      const allGuildWeb3 = await this.client.db.GuildWeb3.all();
      for (const g of allGuildWeb3) {
        if (g.value?.contractAddress) {
          const addr = g.value.contractAddress.toLowerCase();
          this.tipContracts.add(addr);
          this.contractToGuild.set(addr, g.value.guildId ?? g.id);
        }
      }
    } catch (err) {
      this.client.logger.warn("ReactivityService", `Failed to load guild contracts: ${err}`);
    }

    this.client.logger.info(
      "ReactivityService",
      `Initializing — Subscription contract: ${this.subscriptionContract ?? "none"}, Tip contracts: ${this.tipContracts.size}`
    );

    await this.startSubscription();
  }

  private async startSubscription() {
    try {
      const publicClient = createPublicClient({
        chain: somniaTestnet,
        transport: webSocket(undefined, {
          reconnect: { attempts: 5, delay: 10_000 },
        }),
      });

      this.sdk = new SDK({ public: publicClient } as any);

      // Build contract filter list
      const contractSources: string[] = [];
      if (this.subscriptionContract) contractSources.push(this.subscriptionContract);
      for (const addr of this.tipContracts) contractSources.push(addr);

      if (contractSources.length === 0) {
        this.client.logger.warn("ReactivityService", "No contracts to monitor, skipping subscription");
        return;
      }

      const subscription = await this.sdk.subscribe({
        ethCalls: [],
        eventContractSources: contractSources as `0x${string}`[],
        onData: (data: any) => this.handleEvent(data),
        onError: (error: any) => {
          this.client.logger.error("ReactivityService", `Subscription error: ${error?.message ?? error}`);
        },
      });

      this.client.logger.info(
        "ReactivityService",
        `Subscribed to ${contractSources.length} contract(s) via Somnia Reactivity WebSocket`
      );
    } catch (err: any) {
      this.client.logger.error("ReactivityService", `Failed to start Reactivity subscription: ${err.message}`);
      // Retry after 30 seconds
      setTimeout(() => this.startSubscription(), 30_000);
    }
  }

  private async handleEvent(data: any) {
    try {
      const topics = data?.result?.topics;
      const eventData = data?.result?.data;
      const address = data?.result?.address?.toLowerCase();

      if (!topics || !eventData || !address) return;

      // Try to decode as SubscriptionCreated
      if (this.subscriptionContract && address === this.subscriptionContract) {
        try {
          const decoded: any = decodeEventLog({
            abi: SUBSCRIPTION_EVENT_ABI,
            topics,
            data: eventData,
          });
          if (decoded.eventName === "SubscriptionCreated") {
            await this.handleSubscriptionEvent(decoded.args, data);
            return;
          }
        } catch {
          // Not a SubscriptionCreated event
        }
      }

      // Try to decode as TipReceived
      if (this.tipContracts.has(address)) {
        try {
          const decoded: any = decodeEventLog({
            abi: GUILD_TIP_EVENT_ABI,
            topics,
            data: eventData,
          });
          if (decoded.eventName === "TipReceived") {
            this.handleTipEvent(decoded.args, address, data);
            return;
          }
        } catch {
          // Not a TipReceived event
        }
      }
    } catch (err: any) {
      this.client.logger.error("ReactivityService", `Error handling event: ${err.message}`);
    }
  }

  /**
   * TipReceived: Log + push real-time to frontend via Socket.IO.
   * No database save — tip history is read directly from on-chain.
   */
  private handleTipEvent(
    args: { sender: string; amount: bigint; message: string; timestamp: bigint },
    contractAddress: string,
    rawData: any
  ) {
    const amountSTT = Number(args.amount) / 1e18;
    const txHash = rawData?.result?.transactionHash ?? "";
    this.client.logger.info(
      "ReactivityService",
      `TipReceived: ${amountSTT.toFixed(4)} STT from ${args.sender} to contract ${contractAddress}${args.message ? ` — "${args.message}"` : ""}`
    );

    // Push real-time tip event to frontend via Socket.IO
    const guildId = this.contractToGuild.get(contractAddress);
    if (guildId && this.client.dashboardEmit) {
      this.client.dashboardEmit(guildId, "tipReceived", {
        sender: args.sender,
        amount: args.amount.toString(),
        message: args.message ?? "",
        timestamp: Number(args.timestamp) * 1000,
        txHash,
        contractAddress,
      });
    }
  }

  /**
   * SubscriptionCreated: Save to DB and activate premium.
   * This is important data that must persist.
   */
  private async handleSubscriptionEvent(
    args: { wallet: string; tierId: bigint; amount: bigint; quota: bigint; timestamp: bigint },
    rawData: any
  ) {
    const tierIdStr = args.tierId.toString();
    const tierInfo = TIER_BY_ID[tierIdStr];
    if (!tierInfo) {
      this.client.logger.warn("ReactivityService", `Unknown tier ID: ${tierIdStr}`);
      return;
    }

    const walletAddress = args.wallet.toLowerCase();
    const txHash = rawData?.result?.transactionHash ?? "";

    // Check for duplicate tx
    if (txHash) {
      const existingSubs = await this.client.db.Web3Subscriptions.all();
      const isDuplicate = existingSubs.some((s) => s.value?.txHash === txHash);
      if (isDuplicate) {
        this.client.logger.info("ReactivityService", `Duplicate subscription tx: ${txHash}, skipping`);
        return;
      }
    }

    // Find Discord user by wallet address
    const allProfiles = await this.client.db.UserProfile.all();
    const userProfile = allProfiles.find(
      (p) => p.value?.walletAddress?.toLowerCase() === walletAddress
    );
    const discordUserId = userProfile?.value?.userId ?? "";

    // Save subscription to DB
    const now = Date.now();
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days
    const subId = randomBytes(16).toString("hex");

    await this.client.db.Web3Subscriptions.set(subId, {
      id: subId,
      discordUserId,
      walletAddress,
      tier: tierInfo.tier,
      quota: tierInfo.quota,
      months: 1,
      amount: args.amount.toString(),
      txHash,
      timestamp: now,
      expiresAt,
      isActive: true,
    });

    this.client.logger.info(
      "ReactivityService",
      `SubscriptionCreated: ${tierInfo.tier} (quota: ${tierInfo.quota}) by ${walletAddress}${discordUserId ? ` (Discord: ${discordUserId})` : ""}`
    );

    // Activate premium if Discord user found
    if (discordUserId) {
      await this.recalculateUserPremium(discordUserId);
      this.client.logger.info(
        "ReactivityService",
        `Premium activated for ${discordUserId} via Reactivity`
      );
    }
  }

  /**
   * Recalculate a user's premium from all active Web3 subscriptions.
   */
  private async recalculateUserPremium(userId: string) {
    const allSubs = await this.client.db.Web3Subscriptions.all();
    const activeSubs = allSubs.filter(
      (s) =>
        s.value?.discordUserId === userId &&
        s.value?.isActive !== false &&
        (s.value?.expiresAt ?? 0) > Date.now()
    );

    if (activeSubs.length === 0) {
      await this.client.db.premium.delete(userId);
      return;
    }

    const totalQuota = activeSubs.reduce((sum, s) => sum + (s.value?.quota ?? 0), 0);
    const maxExpiry = Math.max(...activeSubs.map((s) => s.value?.expiresAt ?? 0));
    const existing = await this.client.db.premium.get(userId);

    await this.client.db.premium.set(userId, {
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
  }

  /**
   * Register a new tip contract for monitoring.
   * Called when a guild creates a new tip contract.
   */
  public addTipContract(contractAddress: string, guildId?: string) {
    const addr = contractAddress.toLowerCase();
    if (this.tipContracts.has(addr)) return;
    this.tipContracts.add(addr);
    if (guildId) this.contractToGuild.set(addr, guildId);
    this.client.logger.info("ReactivityService", `Added tip contract: ${addr} (guild: ${guildId ?? "unknown"}), restarting subscription...`);
    // Restart subscription to include the new contract
    this.startSubscription();
  }
}
