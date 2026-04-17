import { Manager } from "../manager.js";
import { reconcileUserQuota } from "../web/route/web3Premium.js";

export class PremiumExpiryService {
  private client: Manager;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(client: Manager) {
    this.client = client;
  }

  start() {
    this.client.logger.info("PremiumExpiry", "Premium expiry checker started (runs every 1 hour).");
    this.checkExpired().catch((err) =>
      this.client.logger.error("PremiumExpiry", `Initial check failed: ${err}`)
    );
    this.intervalId = setInterval(() => {
      this.checkExpired().catch((err) =>
        this.client.logger.error("PremiumExpiry", `Hourly check failed: ${err}`)
      );
    }, 60 * 60 * 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async checkExpired() {
    const now = Date.now();
    const allSubs = await this.client.db.Web3Subscriptions.all();
    let expiredCount = 0;
    const affectedUsers = new Set<string>();

    for (const entry of allSubs) {
      const key: string = (entry as any).id ?? (entry as any).key ?? "";
      const sub = (entry as any).value ?? (entry as any).data ?? entry;
      if (sub.status === "active" && sub.expiredAt <= now) {
        sub.status = "expired";
        if (key) {
          await this.client.db.Web3Subscriptions.set(key, sub);
          affectedUsers.add(sub.userId);
          expiredCount++;
        }
      }
    }

    for (const userId of affectedUsers) {
      await reconcileUserQuota(this.client, userId);
    }

    if (expiredCount > 0) {
      this.client.logger.info(
        "PremiumExpiry",
        `Marked ${expiredCount} subscription(s) as expired for ${affectedUsers.size} user(s).`
      );
    }
  }
}
