import { fetch } from "undici";
import { parse as parseHTML } from "node-html-parser";

const TOKEN_REGEX = /(ey[\w-]+)\.([\w-]+)\.([\w-]+)/;
const APPLE_MUSIC_URL = "https://music.apple.com/us/browse";

export class AppleTokenManager {
  private token: string | null = null;
  private tokenExpiry: number = 0;
  private refreshPromise: Promise<string> | null = null;
  private logger: (msg: string) => void;

  constructor(initialToken?: string, logger?: (msg: string) => void) {
    this.logger = logger ?? (() => {});
    if (initialToken) {
      this.token = initialToken;
      this.tokenExpiry = this.getTokenExpiry(initialToken);
      this.logger(`Initialized with config token, expires at ${new Date(this.tokenExpiry).toISOString()}`);
    } else {
      this.logger("No initial token provided, will auto-fetch on first request");
    }
  }

  public async getToken(): Promise<string> {
    if (this.token && !this.isExpired()) {
      return this.token;
    }

    // Prevent multiple concurrent refresh calls
    if (this.refreshPromise) {
      this.logger("Token refresh already in progress, waiting...");
      return this.refreshPromise;
    }

    this.logger(this.token ? "Token expired, refreshing..." : "No token available, fetching...");
    this.refreshPromise = this.fetchToken();
    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  public async getHeaders(): Promise<{ Authorization: string; origin: string }> {
    const token = await this.getToken();
    return {
      Authorization: `Bearer ${token}`,
      origin: "https://music.apple.com",
    };
  }

  public isExpired(): boolean {
    if (!this.token) return true;
    // Refresh 60 seconds before actual expiry
    return Date.now() >= this.tokenExpiry - 60_000;
  }

  public invalidate(): void {
    this.logger("Token invalidated (likely 401 response)");
    this.token = null;
    this.tokenExpiry = 0;
  }

  private async fetchToken(): Promise<string> {
    try {
      this.logger("Fetching Apple Music page to extract token...");
      const pageRes = await fetch(APPLE_MUSIC_URL, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      const html = await pageRes.text();
      const root = parseHTML(html);

      const scriptTag = root.querySelector("script[type='module'][crossorigin]");
      const scriptSrc = scriptTag?.getAttribute("src");

      if (!scriptSrc) {
        throw new Error("Apple Music module script tag not found");
      }

      const scriptUrl = scriptSrc.startsWith("http")
        ? scriptSrc
        : `https://music.apple.com${scriptSrc}`;

      this.logger(`Downloading JS bundle: ${scriptUrl}`);
      const jsRes = await fetch(scriptUrl);
      const jsContent = await jsRes.text();

      const match = jsContent.match(TOKEN_REGEX);
      if (!match || !match[0]) {
        throw new Error("Apple Music access token not found in JS bundle");
      }

      const newToken = match[0];
      this.token = newToken;
      this.tokenExpiry = this.getTokenExpiry(newToken);

      this.logger(`Token fetched successfully! Expires at ${new Date(this.tokenExpiry).toISOString()}`);
      return newToken;
    } catch (err: any) {
      this.logger(`Failed to fetch token: ${err.message}`);
      // If we still have the old token (even if expired), return it as fallback
      if (this.token) {
        this.logger("Using old token as fallback");
        return this.token;
      }
      throw new Error(`Failed to fetch Apple Music token: ${err.message}`);
    }
  }

  private getTokenExpiry(token: string): number {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return 0;

      const payload = JSON.parse(
        Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")
      );

      if (payload.exp) {
        return payload.exp * 1000; // Convert seconds to milliseconds
      }

      // If no exp claim, assume 12 hours from now
      return Date.now() + 12 * 60 * 60 * 1000;
    } catch {
      // If decoding fails, assume 12 hours from now
      return Date.now() + 12 * 60 * 60 * 1000;
    }
  }
}
