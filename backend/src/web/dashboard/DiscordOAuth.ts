import axios from "axios";

const DISCORD_API = "https://discord.com/api/v10";
const BOT_GUILDS_TTL_MS = 5 * 60 * 1000;

let botGuildsCache: DiscordGuild[] | null = null;
let botGuildsCacheAt = 0;

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
  global_name?: string | null;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
  owner: boolean;
}

export interface BotGuild extends DiscordGuild {
  hasBot: boolean;
  iconUrl: string | null;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  botToken: string;
}

export function createDiscordOAuth(cfg: OAuthConfig) {
  return {
    getAuthUrl(state: string): string {
      const params = new URLSearchParams({
        client_id: cfg.clientId,
        redirect_uri: cfg.redirectUri,
        response_type: "code",
        scope: "identify guilds",
        state,
        prompt: "none",
      });
      return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
    },

    async exchangeCode(code: string): Promise<string> {
      const res = await axios.post(
        `${DISCORD_API}/oauth2/token`,
        new URLSearchParams({
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri: cfg.redirectUri,
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      return res.data.access_token as string;
    },

    async fetchUser(accessToken: string): Promise<DiscordUser> {
      const res = await axios.get<DiscordUser>(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return res.data;
    },

    async fetchUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
      const res = await axios.get<DiscordGuild[]>(`${DISCORD_API}/users/@me/guilds`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return res.data;
    },

    async fetchBotGuilds(): Promise<DiscordGuild[]> {
      if (botGuildsCache && Date.now() - botGuildsCacheAt < BOT_GUILDS_TTL_MS) {
        return botGuildsCache;
      }
      const res = await axios.get<DiscordGuild[]>(`${DISCORD_API}/users/@me/guilds`, {
        headers: { Authorization: `Bot ${cfg.botToken}` },
        params: { limit: 200 },
      });
      botGuildsCache = res.data;
      botGuildsCacheAt = Date.now();
      return res.data;
    },

    guildIconUrl(guildId: string, icon: string | null): string | null {
      if (!icon) return null;
      const ext = icon.startsWith("a_") ? "gif" : "png";
      return `https://cdn.discordapp.com/icons/${guildId}/${icon}.${ext}`;
    },
  };
}
