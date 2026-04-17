import { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSignMessage,
  useSwitchChain,
} from "wagmi";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { somniaTestnet, truncateAddress } from "@/lib/web3";

interface WalletState {
  address: string | undefined;
  isConnected: boolean;
  isBound: boolean;
  boundAddress: string | null;
  isCorrectChain: boolean;
  isConnecting: boolean;
  isBinding: boolean;
  walletChangeAvailableAt: number;
}

export function useWallet() {
  const { address, isConnected, chainId } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();

  const [boundAddress, setBoundAddress] = useState<string | null>(null);
  const [walletChangeAvailableAt, setWalletChangeAvailableAt] = useState<number>(0);
  const [isBinding, setIsBinding] = useState(false);
  const [isLoadingBinding, setIsLoadingBinding] = useState(true);

  const isCorrectChain = chainId === somniaTestnet.id;
  const isCooldownActive = walletChangeAvailableAt > Date.now();

  // Load existing binding on mount
  useEffect(() => {
    loadBinding();
  }, []);

  const loadBinding = useCallback(async () => {
    try {
      setIsLoadingBinding(true);
      const { data } = await api.get("/api/wallet/binding");
      if (data.bound) {
        setBoundAddress(data.walletAddress);
        setWalletChangeAvailableAt(data.walletChangeAvailableAt || 0);
      } else {
        setBoundAddress(null);
        setWalletChangeAvailableAt(0);
      }
    } catch {
      setBoundAddress(null);
      setWalletChangeAvailableAt(0);
    } finally {
      setIsLoadingBinding(false);
    }
  }, []);

  const connectWallet = useCallback(async () => {
    try {
      const connector = connectors.find((c) => c.id === "injected") || connectors[0];
      if (!connector) {
        toast.error("No wallet detected. Please install MetaMask or OKX Wallet.");
        return;
      }

      toast.loading("Connecting wallet...", { id: "wallet-connect" });
      await connectAsync({ connector });
      toast.success("Wallet connected!", { id: "wallet-connect" });

      // Auto-switch to Somnia testnet
      try {
        await switchChainAsync({ chainId: somniaTestnet.id });
      } catch {
        toast.warning("Please switch to Somnia Testnet in your wallet.", { id: "chain-switch" });
      }
    } catch (err: any) {
      if (err?.code === 4001) {
        toast.error("Connection rejected by user.", { id: "wallet-connect" });
      } else {
        toast.error("Failed to connect wallet.", { id: "wallet-connect" });
      }
    }
  }, [connectAsync, connectors, switchChainAsync]);

  const switchToSomnia = useCallback(async () => {
    try {
      toast.loading("Switching to Somnia Testnet...", { id: "chain-switch" });
      await switchChainAsync({ chainId: somniaTestnet.id });
      toast.success("Switched to Somnia Testnet!", { id: "chain-switch" });
    } catch {
      toast.error("Failed to switch network. Please add Somnia Testnet manually.", {
        id: "chain-switch",
      });
    }
  }, [switchChainAsync]);

  const bindWallet = useCallback(async () => {
    if (!address) {
      toast.error("Please connect your wallet first.");
      return;
    }

    try {
      setIsBinding(true);
      toast.loading("Requesting signature...", { id: "wallet-bind" });

      // Get nonce from backend
      const { data: nonceData } = await api.get("/api/wallet/nonce");

      // Sign the message
      const signature = await signMessageAsync({
        message: nonceData.message,
      });

      toast.loading("Verifying signature...", { id: "wallet-bind" });

      // Send to backend
      const { data: bindData } = await api.post("/api/wallet/bind", {
        walletAddress: address,
        signature,
      });

      if (bindData.success) {
        setBoundAddress(address.toLowerCase());
        setWalletChangeAvailableAt(bindData.walletChangeAvailableAt || 0);
        toast.success(`Wallet ${truncateAddress(address)} bound to your account!`, {
          id: "wallet-bind",
        });
      }
    } catch (err: any) {
      if (err?.code === 4001 || err?.code === "ACTION_REJECTED") {
        toast.error("Signature rejected.", { id: "wallet-bind" });
      } else {
        const msg = err?.response?.data?.error || "Failed to bind wallet.";
        toast.error(msg, { id: "wallet-bind" });
      }
    } finally {
      setIsBinding(false);
    }
  }, [address, signMessageAsync]);

  /** Unbind current wallet only. Does NOT open wallet popup. */
  const unbindCurrentWallet = useCallback(async () => {
    try {
      setIsBinding(true);
      toast.loading("Unbinding current wallet...", { id: "wallet-change" });
      await api.delete("/api/wallet/unbind");
      setBoundAddress(null);
      setWalletChangeAvailableAt(0);

      // Disconnect browser wallet session
      try { await disconnectAsync(); } catch { /* ignore */ }

      toast.success("Wallet unbound. You can now connect a new one.", { id: "wallet-change" });
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Failed to unbind wallet.";
      toast.error(msg, { id: "wallet-change" });
      await loadBinding();
    } finally {
      setIsBinding(false);
    }
  }, [disconnectAsync, loadBinding]);

  const state: WalletState = {
    address,
    isConnected,
    isBound: !!boundAddress,
    boundAddress,
    isCorrectChain,
    isConnecting: false,
    isBinding,
    walletChangeAvailableAt,
  };

  return {
    ...state,
    isCooldownActive,
    isLoadingBinding,
    connectWallet,
    switchToSomnia,
    bindWallet,
    unbindCurrentWallet,
    loadBinding,
  };
}
