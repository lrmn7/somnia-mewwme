import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { usePrivy, useLogout, useWallets, useCreateWallet, useOAuthTokens } from "@privy-io/react-auth";
import type { DiscordUser } from "@/types/player";
import { api } from "@/lib/api";
import { PRIVY_APP_ID } from "@/lib/config";

interface AuthContextValue {
  user: DiscordUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  status: "loading",
  login: () => {},
  logout: async () => {},
});

const DISCORD_TOKEN_STORAGE_KEY = "mewwme.discord.oauthToken";

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!PRIVY_APP_ID) {
    return <LegacyAuthProvider>{children}</LegacyAuthProvider>;
  }
  return <PrivyAuthProvider>{children}</PrivyAuthProvider>;
}

function LegacyAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");

  useEffect(() => {
    api
      .get<DiscordUser>("/auth/me")
      .then(({ data }) => { setUser(data); setStatus("authenticated"); })
      .catch(() => { setUser(null); setStatus("unauthenticated"); });
  }, []);

  const login = useCallback(() => { window.location.href = "/login"; }, []);
  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    window.location.href = "/";
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function PrivyAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const [backendChecked, setBackendChecked] = useState(false);
  const [discordToken, setDiscordToken] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(DISCORD_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [sessionRetryTick, setSessionRetryTick] = useState(0);

  const navigate = useNavigate();
  const { login: privyLogin, authenticated, ready, user: privyUser } = usePrivy();
  const { logout: privyLogout } = useLogout();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();

  const sessionCreating = useRef(false);
  const sessionAttempted = useRef(false);
  const tokenSyncing = useRef(false);
  const tokenSynced = useRef(false);
  const walletSynced = useRef(false);
  const walletCreating = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRetryCount = useRef(0);

  // Capture Discord OAuth token when Privy grants it (triggers re-render via setState)
  useOAuthTokens({
    onOAuthTokenGrant: (params: any) => {
      const oauthTokens = params?.oAuthTokens ?? params?.oauthTokens;
      const provider = oauthTokens?.provider;
      const token = oauthTokens?.accessToken ?? params?.oAuthToken ?? null;
      if (provider && provider !== "discord") return;
      if (token) {
        setDiscordToken(token);
        try {
          window.localStorage.setItem(DISCORD_TOKEN_STORAGE_KEY, token);
        } catch {
          // ignore storage errors
        }
      }
    },
  });

  // 1. On mount: check if backend session already exists (returning user)
  useEffect(() => {
    return () => {
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    api
      .get<DiscordUser>("/auth/me")
      .then(({ data }) => {
        setUser(data);
        setStatus("authenticated");
      })
      .catch(() => {
        // No existing session
      })
      .finally(() => {
        setBackendChecked(true);
      });
  }, []);

  // 2. After Privy authenticates, create backend session once.
  //    Use Discord OAuth token when available; otherwise use Privy Discord identity directly.
  useEffect(() => {
    if (!ready || !backendChecked) return;
    if (status === "authenticated") return;

    if (!authenticated) {
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
      sessionRetryCount.current = 0;
      sessionAttempted.current = false;
      tokenSynced.current = false;
      setStatus("unauthenticated");
      return;
    }

    if (!privyUser?.discord || sessionCreating.current || sessionAttempted.current) return;

    const discord = privyUser.discord;

    sessionAttempted.current = true;
    sessionCreating.current = true;
    api
      .post<{ ok: boolean; user: DiscordUser; hasGuilds?: boolean }>("/auth/privy-session", {
        accessToken: discordToken ?? undefined,
        discordId: discord.subject,
        username: discord.username ?? "unknown",
        avatar: null,
        globalName: discord.username,
      })
      .then(({ data }) => {
        if (data.ok && data.user) {
          sessionRetryCount.current = 0;
          setUser(data.user);
          setStatus("authenticated");
          tokenSynced.current = Boolean(discordToken);
          navigate("/servers", { replace: true });
        }
      })
      .catch(() => {
        sessionAttempted.current = false;
        // Keep recovering backend session silently while Privy is still authenticated.
        if (authenticated) {
          setStatus("loading");
          if (!retryTimer.current) {
            const retryDelayMs = Math.min(30_000, 2_000 * Math.max(1, 2 ** sessionRetryCount.current));
            sessionRetryCount.current += 1;
            retryTimer.current = setTimeout(() => {
              retryTimer.current = null;
              setSessionRetryTick((v) => v + 1);
            }, retryDelayMs);
          }
          return;
        }
        setUser(null);
        setStatus("unauthenticated");
      })
      .finally(() => {
        sessionCreating.current = false;
      });
  }, [ready, backendChecked, authenticated, privyUser, status, navigate, discordToken, sessionRetryTick]);

  // 2b. If session was created before OAuth token arrived, upgrade it once
  // so backend can fetch full guild list (including servers without the bot).
  useEffect(() => {
    if (status !== "authenticated") return;
    if (!discordToken || !privyUser?.discord) return;
    if (tokenSynced.current || tokenSyncing.current) return;

    tokenSyncing.current = true;
    api
      .post<{ ok: boolean }>("/auth/privy-session", {
        accessToken: discordToken,
        discordId: privyUser.discord.subject,
        username: privyUser.discord.username ?? "unknown",
        avatar: null,
        globalName: privyUser.discord.username,
      })
      .then(() => {
        window.dispatchEvent(new Event("mewwme:guilds-refresh"));
      })
      .finally(() => {
        tokenSynced.current = true;
        tokenSyncing.current = false;
      });
  }, [status, discordToken, privyUser]);

  // 3. Ensure embedded wallet exists after Privy login
  useEffect(() => {
    if (!authenticated || !ready || walletCreating.current) return;

    const hasEmbedded = wallets.some((w) => w.walletClientType === "privy");
    if (hasEmbedded) return;

    const timer = setTimeout(() => {
      const hasIt = wallets.some((w) => w.walletClientType === "privy");
      if (!hasIt && !walletCreating.current) {
        walletCreating.current = true;
        createWallet()
          .catch((err) => {
            if (!String(err).includes("already")) {
              console.warn("[Auth] Wallet creation failed:", err);
            }
          })
          .finally(() => {
            walletCreating.current = false;
          });
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [authenticated, ready, wallets, createWallet]);

  // 4. Sync embedded wallet address to backend
  useEffect(() => {
    if (status !== "authenticated" || walletSynced.current) return;
    const embedded = wallets.find((w) => w.walletClientType === "privy");
    if (!embedded?.address) return;

    walletSynced.current = true;
    api.post("/api/wallet/connect", { walletAddress: embedded.address }).catch(() => {});
  }, [status, wallets]);

  const login = useCallback(() => {
    privyLogin();
  }, [privyLogin]);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    try {
      await privyLogout();
    } catch {
      /* ignore */
    }
    setUser(null);
    setDiscordToken(null);
    try {
      window.localStorage.removeItem(DISCORD_TOKEN_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
    setStatus("unauthenticated");
    navigate("/", { replace: true });
  }, [privyLogout, navigate]);

  return (
    <AuthContext.Provider value={{ user, status, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
