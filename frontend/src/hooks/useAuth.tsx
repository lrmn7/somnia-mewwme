import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { usePrivy, useLogout, useWallets, useCreateWallet } from "@privy-io/react-auth";
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

/**
 * Privy-powered auth provider.
 *
 * Flow:
 * 1. User clicks Login → privy.login() opens modal (Discord only)
 * 2. Privy authenticates with Discord → creates embedded wallet
 * 3. We read user.discord from Privy user object → send to backend
 * 4. Backend creates session → user is authenticated
 * 5. We ensure embedded wallet exists + sync address to backend
 */
function PrivyAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");

  const { login: privyLogin, authenticated, ready, user: privyUser } = usePrivy();
  const { logout: privyLogout } = useLogout();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();

  const sessionCreating = useRef(false);
  const walletSynced = useRef(false);
  const walletCreating = useRef(false);

  // Create backend session from Privy user's Discord info
  const createSessionFromPrivy = useCallback(async () => {
    if (sessionCreating.current || !privyUser) return false;
    sessionCreating.current = true;

    try {
      // Extract Discord info from Privy user
      const discord = privyUser.discord;
      if (!discord?.subject) {
        console.warn("[Auth] Privy user has no Discord account linked");
        return false;
      }

      const { data } = await api.post<{ ok: boolean; user: DiscordUser }>(
        "/auth/privy-session",
        {
          discordId: discord.subject,
          username: discord.username ?? "unknown",
          avatar: null, // Privy doesn't provide Discord avatar hash
          globalName: discord.username,
        }
      );

      if (data.ok && data.user) {
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
        setUser(data);
        setStatus("authenticated");
      })
      .catch(() => {
        // No backend session — will be handled by Privy state watcher below
      });
  }, []);

  // 2. Watch Privy auth state and create backend session when needed
  useEffect(() => {
    if (!ready) return;

    // Privy not authenticated → user is unauthenticated
    if (!authenticated) {
      if (status !== "authenticated") {
        setStatus("unauthenticated");
      }
      return;
    }

    // Privy IS authenticated but no backend session yet → create one
    if (status !== "authenticated" && privyUser?.discord) {
      createSessionFromPrivy();
    }
  }, [ready, authenticated, privyUser, status, createSessionFromPrivy]);

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
