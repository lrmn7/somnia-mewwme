import { createPublicClient, http, defineChain, parseAbiItem, type Log } from "viem";
import type { Manager } from "../manager.js";

const MAX_TIP_CACHE_PER_GUILD = 10;

// Try to load @somnia-chain/reactivity SDK (optional dependency)
let SomniaSDK: any = null;
try {
  SomniaSDK = require("@somnia-chain/reactivity").SDK;
} catch {
  // SDK not installed - will fall back to viem polling
}

// ABI event signatures — separate per contract
const PREMIUM_EVENTS = {
  PremiumPurchased: parseAbiItem(
    "event PremiumPurchased(address indexed buyer, string discordUserId, string plan, uint256 amount, uint256 quota, uint256 expiresAt, uint256 timestamp)"
  ),
};

const FACTORY_EVENTS = {
  GuildCreated: parseAbiItem(
    "event GuildCreated(string guildId, address guildAddress, address indexed owner, uint256 timestamp)"
  ),
};

const GUILD_TIP_EVENTS = {
  Donated: parseAbiItem(
    "event Donated(address indexed sender, uint256 amount, uint256 fee, string message, uint256 timestamp)"
  ),
  Claimed: parseAbiItem(
    "event Claimed(address indexed owner, uint256 amount, uint256 timestamp)"
  ),
};

export class SomniaReactivityService {
  private client: Manager;
  private publicClient: any;
  private sdkInstance: any = null;
  private sdkSubscription: any = null;
  private unwatchFns: (() => void)[] = [];
  private isRunning = false;
  private knownGuildContracts = new Map<string, string>(); // contractAddress -> guildId

  constructor(client: Manager) {
    this.client = client;
  }

  async start() {
    const somniaConfig = this.client.config.Somnia;
    if (!somniaConfig?.Enable) {
      this.client.logger.info("SomniaReactivity", "Somnia integration is disabled in config.");
      return;
    }

    if (!somniaConfig.TipJarFactoryAddress && !somniaConfig.PremiumAddress) {
      this.client.logger.warn(
        "SomniaReactivity",
        "Neither TipJarFactoryAddress nor PremiumAddress set in config. Reactivity service will not start."
      );
      return;
    }

    try {
      const somniaTestnet = defineChain({
        id: somniaConfig.ChainId || 50312,
        name: "Somnia Testnet",
        nativeCurrency: {
          name: "Somnia Test Token",
          symbol: somniaConfig.CurrencySymbol || "STT",
          decimals: 18,
        },
        rpcUrls: {
          default: {
            http: [somniaConfig.RpcUrl || "https://dream-rpc.somnia.network"],
          },
        },
        blockExplorers: {
          default: {
            name: "Somnia Explorer",
            url: somniaConfig.ExplorerUrl || "https://shannon-explorer.somnia.network",
          },
        },
        testnet: true,
      });

      this.publicClient = createPublicClient({
        chain: somniaTestnet,
        transport: http(somniaConfig.RpcUrl || "https://dream-rpc.somnia.network"),
      });

      // Load existing guild contracts into memory
      await this.loadGuildContracts();

      // Try Somnia Reactivity SDK (WebSocket-based) first, fall back to viem polling
      if (SomniaSDK && somniaConfig.WssUrl) {
        try {
          await this.startWithSDK(somniaConfig);
          this.client.logger.info(
            "SomniaReactivity",
            `Started with Somnia Reactivity SDK (WebSocket) watching premium=${somniaConfig.PremiumAddress || "N/A"} factory=${somniaConfig.TipJarFactoryAddress || "N/A"} and ${this.knownGuildContracts.size} guild contracts`
          );
        } catch (sdkErr) {
          this.client.logger.warn(
            "SomniaReactivity",
            `SDK failed (${sdkErr}), falling back to viem polling...`
          );
          this.startWithPolling(somniaConfig);
        }
      } else {
        this.startWithPolling(somniaConfig);
      }

      this.isRunning = true;
      this.client.logger.info(
        "SomniaReactivity",
        `Service started on Somnia Testnet`
      );
    } catch (err) {
      this.client.logger.error("SomniaReactivity", `Failed to start: ${err}`);
    }
  }

  private async loadGuildContracts() {
    try {
      const allContracts = await this.client.db.GuildContract.all();
      for (const entry of allContracts) {
        const guildId = (entry as any).id || (entry as any).key;
        const data = (entry as any).value || (entry as any).data || entry;
        if (data.contractAddress) {
          this.knownGuildContracts.set(data.contractAddress.toLowerCase(), guildId);
        }
      }
    } catch (err) {
      this.client.logger.error("SomniaReactivity", `Failed to load guild contracts: ${err}`);
    }
  }

  // ── Somnia Reactivity SDK approach (WebSocket-based, real-time) ──
  private async startWithSDK(somniaConfig: any) {
    this.sdkInstance = new SomniaSDK({
      public: this.publicClient,
    });

    // Subscribe to factory events via WebSocket
    this.sdkSubscription = await this.sdkInstance.subscribe({
      ethCalls: [],
      onData: (data: any) => {
        this.handleSDKEvent(data);
      },
    });

    this.client.logger.info("SomniaReactivity", "SDK WebSocket subscription active.");
  }

  private handleSDKEvent(data: any) {
    try {
      // The SDK returns event data - route to appropriate handler
      const logs = data?.logs || (Array.isArray(data) ? data : [data]);
      for (const log of logs) {
        if (!log?.args) continue;

        // Determine event type from args presence
        if (log.args.guildId !== undefined && log.args.guildAddress !== undefined) {
          this.handleGuildCreated(log);
        } else if (log.args.discordUserId !== undefined && log.args.plan !== undefined) {
          this.handlePremiumPurchased(log);
        } else if (log.args.sender !== undefined && log.args.message !== undefined) {
          // Need to determine guildId from contract address
          const contractAddr = log.address?.toLowerCase();
          const guildId = contractAddr ? this.knownGuildContracts.get(contractAddr) : undefined;
          if (guildId) {
            this.handleDonated(log, guildId);
          }
        } else if (log.args.owner !== undefined && log.args.amount !== undefined && log.args.fee === undefined) {
          const contractAddr = log.address?.toLowerCase();
          const guildId = contractAddr ? this.knownGuildContracts.get(contractAddr) : undefined;
          if (guildId) {
            this.handleClaimed(log, guildId);
          }
        }
      }
    } catch (err) {
      this.client.logger.error("SomniaReactivity", `SDK event handling error: ${err}`);
    }
  }

  // ── Viem polling fallback ──
  private startWithPolling(somniaConfig: any) {
    // Watch TipJar factory events
    if (somniaConfig.TipJarFactoryAddress) {
      this.watchFactoryEvents(somniaConfig.TipJarFactoryAddress as `0x${string}`);
    }

    // Watch premium contract events
    if (somniaConfig.PremiumAddress) {
      this.watchPremiumEvents(somniaConfig.PremiumAddress as `0x${string}`);
    }

    // Watch existing guild contract events
    for (const [contractAddr, guildId] of this.knownGuildContracts) {
      this.watchGuildTipJarEvents(contractAddr as `0x${string}`, guildId);
    }

    this.client.logger.info(
      "SomniaReactivity",
      `Started viem polling: premium=${somniaConfig.PremiumAddress || "N/A"} factory=${somniaConfig.TipJarFactoryAddress || "N/A"} + ${this.knownGuildContracts.size} guild contracts`
    );
  }

  private watchFactoryEvents(factoryAddress: `0x${string}`) {
    try {
      // Watch GuildCreated
      const unwatchCreated = this.publicClient.watchEvent({
        address: factoryAddress,
        event: FACTORY_EVENTS.GuildCreated,
        onLogs: (logs: Log[]) => {
          for (const log of logs) {
            this.handleGuildCreated(log);
          }
        },
        pollingInterval: 12_000,
      });
      this.unwatchFns.push(unwatchCreated);
    } catch (err) {
      this.client.logger.error("SomniaReactivity", `Failed to watch factory events: ${err}`);
    }
  }

  private watchPremiumEvents(premiumAddress: `0x${string}`) {
    try {
      const unwatchPremium = this.publicClient.watchEvent({
        address: premiumAddress,
        event: PREMIUM_EVENTS.PremiumPurchased,
        onLogs: (logs: Log[]) => {
          for (const log of logs) {
            this.handlePremiumPurchased(log);
          }
        },
        pollingInterval: 12_000,
      });
      this.unwatchFns.push(unwatchPremium);
    } catch (err) {
      this.client.logger.error("SomniaReactivity", `Failed to watch premium events: ${err}`);
    }
  }

  private watchGuildTipJarEvents(contractAddress: `0x${string}`, guildId: string) {
    try {
      // Watch Donated
      const unwatchTip = this.publicClient.watchEvent({
        address: contractAddress,
        event: GUILD_TIP_EVENTS.Donated,
        onLogs: (logs: Log[]) => {
          for (const log of logs) {
            this.handleDonated(log, guildId);
          }
        },
        pollingInterval: 12_000,
      });
      this.unwatchFns.push(unwatchTip);

      // Watch Claimed
      const unwatchClaim = this.publicClient.watchEvent({
        address: contractAddress,
        event: GUILD_TIP_EVENTS.Claimed,
        onLogs: (logs: Log[]) => {
          for (const log of logs) {
            this.handleClaimed(log, guildId);
          }
        },
        pollingInterval: 12_000,
      });
      this.unwatchFns.push(unwatchClaim);
    } catch (err) {
      this.client.logger.error(
        "SomniaReactivity",
        `Failed to watch tip jar events for ${guildId}: ${err}`
      );
    }
  }

  private async handleGuildCreated(log: any) {
    try {
      const args = log.args || {};
      const guildId = args.guildId;
      const guildAddress = args.guildAddress?.toLowerCase();
      const owner = args.owner;

      if (!guildId || !guildAddress) return;

      this.client.logger.info(
        "SomniaReactivity",
        `GuildCreated: guild=${guildId} address=${guildAddress} owner=${owner}`
      );

      // Track and watch the new contract
      this.knownGuildContracts.set(guildAddress, guildId);
      this.watchGuildTipJarEvents(guildAddress as `0x${string}`, guildId);

      // Emit to dashboard
      if (this.client.dashboardEmit) {
        this.client.dashboardEmit(guildId, "guildContractCreated", {
          guildId,
          contractAddress: guildAddress,
          owner,
        });
      }
    } catch (err) {
      this.client.logger.error("SomniaReactivity", `handleGuildCreated error: ${err}`);
    }
  }

  private async handlePremiumPurchased(log: any) {
    try {
      const args = log.args || {};
      const buyer = args.buyer;
      const discordUserId = args.discordUserId;
      const plan = args.plan;
      const amount = args.amount?.toString();
      const expiresAt = Number(args.expiresAt) * 1000; // Convert to ms if needed
      const txHash = log.transactionHash || "";

      if (!discordUserId || !plan) return;

      // Determine quota from plan
      let quotaValue = 0;
      if (plan === "guild_basic") quotaValue = 1;
      else if (plan === "guild_plus") quotaValue = 3;
      else if (plan === "guild_pro") quotaValue = 5;

      this.client.logger.info(
        "SomniaReactivity",
        `PremiumPurchased: user=${discordUserId} plan=${plan} quota=${quotaValue} buyer=${buyer}`
      );

      const now = Date.now();
      const expiry = expiresAt > now ? expiresAt : now + 30 * 24 * 60 * 60 * 1000;
      const walletAddress = buyer?.toLowerCase() || "";

      // Create NEW subscription record (never overwrite)
      const subKey = `sub_${discordUserId}_${txHash}`;
      await this.client.db.Web3Subscriptions.set(subKey, {
        userId: discordUserId,
        txHash,
        walletAddress,
        tier: plan,
        quotaValue,
        amount: amount || "0",
        startTime: now,
        expiredAt: expiry,
        status: "active" as const,
      });

      // Update aggregated Web3Premium state (preserve redeemedGuilds & usedQuota)
      const existing = await this.client.db.Web3Premium.get(discordUserId);
      await this.client.db.Web3Premium.set(discordUserId, {
        walletAddress,
        txHash: existing?.txHash ?? txHash,
        plan: existing?.plan ?? plan,
        amount: amount || "0",
        isUserPremium: true,
        maxQuota: 0, // deprecated — use computeWeb3Quota
        usedQuota: existing?.usedQuota ?? 0,
        redeemedGuilds: existing?.redeemedGuilds ?? [],
        redeemedAt: existing?.redeemedAt ?? now,
        activatedAt: now,
        expiresAt: Math.max(existing?.expiresAt ?? 0, expiry),
      });

      // Emit to dashboard
      if (this.client.dashboardEmit) {
        this.client.dashboardEmit("global", "premiumActivated", {
          userId: discordUserId,
          plan,
          walletAddress,
          txHash,
        });
      }
    } catch (err) {
      this.client.logger.error("SomniaReactivity", `handlePremiumPurchased error: ${err}`);
    }
  }

  private async handleDonated(log: any, guildId: string) {
    try {
      const args = log.args || {};
      const sender = args.sender?.toLowerCase() || "";
      const amount = args.amount?.toString() || "0";
      const message = args.message || "";
      const txHash = log.transactionHash || "";
      const blockNumber = Number(log.blockNumber) || 0;

      this.client.logger.info(
        "SomniaReactivity",
        `Donated: guild=${guildId} sender=${sender} amount=${amount}`
      );

      // Store in DB cache (rolling last 10)
      const tipId = `${guildId}_${txHash}`;
      await this.client.db.TipCache.set(tipId, {
        guildId,
        senderAddress: sender,
        senderDiscordId: null, // From on-chain event we don't know the Discord user
        amount,
        message,
        txHash,
        blockNumber,
        timestamp: Date.now(),
      });

      // Enforce rolling window
      const allTips = await this.client.db.TipCache.all();
      const guildTips = allTips
        .filter((t: any) => {
          const tipData = (t as any).value || (t as any).data || t;
          return tipData.guildId === guildId;
        })
        .map((t: any) => ({
          id: (t as any).id || (t as any).key,
          timestamp: ((t as any).value || (t as any).data || t).timestamp || 0,
        }))
        .sort((a: any, b: any) => b.timestamp - a.timestamp);

      if (guildTips.length > MAX_TIP_CACHE_PER_GUILD) {
        const toRemove = guildTips.slice(MAX_TIP_CACHE_PER_GUILD);
        for (const old of toRemove) {
          await this.client.db.TipCache.delete(old.id);
        }
      }

      // Emit to dashboard
      if (this.client.dashboardEmit) {
        this.client.dashboardEmit(guildId, "tipReceived", {
          guildId,
          senderAddress: sender,
          amount,
          message,
          txHash,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      this.client.logger.error("SomniaReactivity", `handleDonated error: ${err}`);
    }
  }

  private async handleClaimed(log: any, guildId: string) {
    try {
      const args = log.args || {};
      const owner = args.owner?.toLowerCase() || "";
      const amount = args.amount?.toString() || "0";

      this.client.logger.info(
        "SomniaReactivity",
        `Claimed: guild=${guildId} owner=${owner} amount=${amount}`
      );

      // Emit to dashboard
      if (this.client.dashboardEmit) {
        this.client.dashboardEmit(guildId, "claimed", {
          guildId,
          owner,
          amount,
          txHash: log.transactionHash,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      this.client.logger.error("SomniaReactivity", `handleClaimed error: ${err}`);
    }
  }

  async stop() {
    // Clean up SDK subscription
    if (this.sdkSubscription?.unsubscribe) {
      try {
        await this.sdkSubscription.unsubscribe();
      } catch {
        // Ignore cleanup errors
      }
    }

    for (const unwatch of this.unwatchFns) {
      try {
        unwatch();
      } catch {
        // Ignore cleanup errors
      }
    }
    this.unwatchFns = [];
    this.sdkInstance = null;
    this.sdkSubscription = null;
    this.isRunning = false;
    this.client.logger.info("SomniaReactivity", "Service stopped.");
  }
}
