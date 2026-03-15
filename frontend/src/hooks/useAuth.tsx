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

  const navigate = useNavigate();
  const { login: privyLogin, authenticated, ready, user: privyUser } = usePrivy();
  const { logout: privyLogout } = useLogout();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();

  const sessionCreating = useRef(false);
  const walletSynced = useRef(false);
  const walletCreating = useRef(false);

  // 1. On mount: check if backend session already exists
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

  // 2. Watch Privy auth state - only proceed after both Privy ready AND backend checked
  useEffect(() => {
    // Wait for both Privy SDK and backend check to complete
    if (!ready || !backendChecked) return;

    // If already authenticated from /auth/me, nothing to do
    if (status === "authenticated") return;

    // Privy not authenticated → user is unauthenticated
    if (!authenticated) {
      setStatus("unauthenticated");
      return;
    }

    // Privy IS authenticated but no backend session yet → create one (fresh login)
    if (privyUser?.discord && !sessionCreating.current) {
      sessionCreating.current = true;

      const discord = privyUser.discord;
      api
        .post<{ ok: boolean; user: DiscordUser }>("/auth/privy-session", {
          discordId: discord.subject,
          username: discord.username ?? "unknown",
          avatar: null,
          globalName: discord.username,
        })
        .then(({ data }) => {
          if (data.ok && data.user) {
            setUser(data.user);
            setStatus("authenticated");
            // Fresh login → navigate to /servers
            navigate("/servers", { replace: true });
          }
        })
        .catch((err) => {
          console.error("[Auth] Failed to create backend session:", err);
          setStatus("unauthenticated");
        })
        .finally(() => {
          sessionCreating.current = false;
        });
    }
  }, [ready, backendChecked, authenticated, privyUser, status, navigate]);

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
