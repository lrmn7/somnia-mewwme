import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { DiscordUser } from "@/types/player";
import { api } from "@/lib/api";
import { BACKEND_URL } from "@/lib/config";

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
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [status, setStatus] =
    useState<AuthContextValue["status"]>("loading");

  useEffect(() => {
    api
      .get<DiscordUser>("/auth/me")
      .then(({ data }) => {
        setUser(data);
        setStatus("authenticated");
      })
      .catch(() => {
        setUser(null);
        setStatus("unauthenticated");
      });
  }, []);

  const login = useCallback(() => {
    window.location.href = `${BACKEND_URL}/auth/discord`;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    window.location.href = "/";
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
