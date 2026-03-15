import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface WalletStatus {
  connected: boolean;
  walletAddress: string | null;
  walletProvider: string | null;
  walletConnectedAt: number | null;
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletStatus>({
    connected: false,
    walletAddress: null,
    walletProvider: null,
    walletConnectedAt: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await api.get<WalletStatus>("/api/wallet");
      setWallet(data);
    } catch {
      setWallet({ connected: false, walletAddress: null, walletProvider: null, walletConnectedAt: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const connectWallet = useCallback(async (walletAddress: string) => {
    const { data } = await api.post<{ success: boolean; walletAddress: string }>("/api/wallet/connect", { walletAddress });
    if (data.success) {
      await fetchStatus();
    }
    return data;
  }, [fetchStatus]);

  const disconnectWallet = useCallback(async () => {
    const { data } = await api.post<{ success: boolean }>("/api/wallet/disconnect");
    if (data.success) {
      setWallet({ connected: false, walletAddress: null, walletProvider: null, walletConnectedAt: null });
    }
    return data;
  }, []);

  return {
    wallet,
    loading,
    connectWallet,
    disconnectWallet,
    refreshWallet: fetchStatus,
  };
}
