import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!PRIVY_APP_ID) {
    return <LegacyAuthProvider>{children}</LegacyAuthProvider>;
  }
  return <PrivyAuthProvider>{children}</PrivyAuthProvider>;
}

/** Legacy auth provider for when Privy is not configured */
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

  const { login: privyLogin, authenticated, ready, user: privyUser } = usePrivy();
  const { logout: privyLogout } = useLogout();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();

  const sessionCreating = useRef(false);
  const backendSessionOk = useRef(false);
  const walletSynced = useRef(false);
  const walletCreating = useRef(false);
  const discordTokenRef = useRef<string | null>(null);

  // Capture Discord OAuth access token when Privy grants it
  useOAuthTokens({
    onOAuthTokenGrant: ({ provider, oauthTokens }) => {
      if (provider === "discord" && oauthTokens?.accessToken) {
        discordTokenRef.current = oauthTokens.accessToken;
      }
    },
  });

  // Create backend session from Privy user's Discord info
  const createSessionFromPrivy = useCallback(async () => {
    if (sessionCreating.current || backendSessionOk.current || !privyUser) return false;
    sessionCreating.current = true;

    try {
      const discord = privyUser.discord;
      if (!discord?.subject) {
        console.warn("[Auth] Privy user has no Discord account linked");
        return false;
      }

      const { data } = await api.post<{ ok: boolean; user: DiscordUser }>(
        "/auth/privy-session",
        {
          accessToken: discordTokenRef.current ?? undefined,
          discordId: discord.subject,
          username: discord.username ?? "unknown",
          avatar: null,
          globalName: discord.username,
        }
      );

      if (data.ok && data.user) {
        backendSessionOk.current = true;
        setUser(data.user);
        setStatus("authenticated");
        return true;
      }
    } catch (err) {
      console.error("[Auth] Failed to create backend session:", err);
    } finally {
      sessionCreating.current = false;
    }
    return false;
  }, [privyUser]);

  // 1. On mount: check if backend session already exists
  useEffect(() => {
    api
      .get<DiscordUser>("/auth/me")
      .then(({ data }) => {
        backendSessionOk.current = true;
        setUser(data);
        setStatus("authenticated");
      })
      .catch(() => {
        // No backend session — if Privy is already ready, set unauthenticated
        if (ready && !authenticated) {
          setStatus("unauthenticated");
        }
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Watch Privy auth state and create backend session when needed
  useEffect(() => {
    if (!ready) return;

    if (!authenticated) {
      if (!backendSessionOk.current) {
        setStatus("unauthenticated");
      }
      return;
    }

    // Privy IS authenticated but no backend session yet → create one
    if (!backendSessionOk.current && privyUser?.discord) {
      createSessionFromPrivy();
    }
  }, [ready, authenticated, privyUser, createSessionFromPrivy]);

  // 3. Ensure embedded wallet exists after Privy login
  useEffect(() => {
    if (!authenticated || !ready || walletCreating.current) return;

    const hasEmbedded = wallets.some((w) => w.walletClientType === "privy");
    if (hasEmbedded) return; // wallet already exists

    // Wait a moment for Privy's createOnLogin to work, then create manually if needed
    const timer = setTimeout(() => {
      const hasIt = wallets.some((w) => w.walletClientType === "privy");
      if (!hasIt && !walletCreating.current) {
        walletCreating.current = true;
        createWallet()
          .catch((err) => {
            // "already has a wallet" error is fine
            if (!String(err).includes("already")) {
              console.warn("[Auth] Wallet creation failed:", err);
            }
          })
          .finally(() => { walletCreating.current = false; });
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

  const login = useCallback(() => { privyLogin(); }, [privyLogin]);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    try { await privyLogout(); } catch { /* ignore */ }
    window.location.href = "/";
  }, [privyLogout]);

  return (
    <AuthContext.Provider value={{ user, status, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
