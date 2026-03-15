import { useCallback, useEffect } from "react";
import { useWallets } from "@privy-io/react-auth";
import { setWalletRef } from "@/lib/privyHelper";

/**
 * Hook to access the Privy embedded wallet and create an ethers provider from it.
 * Always prefer the embedded wallet (walletClientType === "privy") over browser extensions.
 */
export function useEmbeddedWallet() {
  let wallets: any[] = [];
  try {
    const w = useWallets();
    wallets = w.wallets ?? [];
  } catch {
    // Privy not available
  }

  // Find the embedded wallet (privy-created), fall back to first wallet
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy") ?? null;
  const address = embeddedWallet?.address ?? null;

  // Keep the standalone helper in sync
  useEffect(() => {
    setWalletRef(embeddedWallet);
  }, [embeddedWallet]);

  /**
   * Get an ethers BrowserProvider + Signer from the Privy embedded wallet.
   * Automatically switches chain to Somnia if needed.
   */
  const getProviderAndSigner = useCallback(async () => {
    if (!embeddedWallet) {
      throw new Error("No embedded wallet found. Please connect your wallet first.");
    }

    const { SOMNIA_CHAIN_ID } = await import("@/lib/config");

    // Switch to Somnia chain if not already on it
    try {
      await embeddedWallet.switchChain(SOMNIA_CHAIN_ID);
    } catch {
      // May already be on the correct chain
    }

    // Get EIP-1193 provider from the embedded wallet
    const eip1193Provider = await embeddedWallet.getEthereumProvider();

    const { BrowserProvider } = await import("ethers");
    const provider = new BrowserProvider(eip1193Provider);
    const signer = await provider.getSigner();

    return { provider, signer, address: embeddedWallet.address };
  }, [embeddedWallet]);

  return {
    embeddedWallet,
    address,
    hasWallet: !!embeddedWallet,
    getProviderAndSigner,
  };
}
