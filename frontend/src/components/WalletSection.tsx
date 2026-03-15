import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useEmbeddedWallet } from "@/hooks/useEmbeddedWallet";
import { shortenAddress } from "@/lib/web3";
import { PRIVY_APP_ID } from "@/lib/config";
import { toast } from "sonner";

export function WalletSection() {
  const { wallet, loading: backendLoading, refreshWallet } = useWallet();
  const { address: embeddedAddress } = useEmbeddedWallet();
  const [copied, setCopied] = useState(false);

  if (!PRIVY_APP_ID) return null;

  // Prefer embedded wallet address (real-time from Privy), fallback to backend
  const displayAddress = embeddedAddress || wallet.walletAddress;

  // When embedded wallet appears but backend doesn't know about it yet, sync it
  useEffect(() => {
    if (embeddedAddress && !wallet.walletAddress && !backendLoading) {
      refreshWallet();
    }
  }, [embeddedAddress, wallet.walletAddress, backendLoading, refreshWallet]);

  const handleCopy = useCallback(() => {
    if (!displayAddress) return;
    navigator.clipboard.writeText(displayAddress);
    setCopied(true);
    toast.success("Address copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [displayAddress]);

  if (backendLoading && !embeddedAddress) {
    return (
      <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">
            <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-white">Web3 Wallet</h3>
            <p className="text-[11px] text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4 transition-all duration-300 ease-out hover:scale-[1.01] hover:border-white/[0.15] hover:bg-white/[0.04] overflow-hidden">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">
          <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-white">Web3 Wallet</h3>
          <p className="text-[11px] text-muted-foreground">Embedded wallet on Somnia Network</p>
        </div>
        {displayAddress && (
          <span className="flex items-center gap-1.5 rounded-full bg-green-500/15 px-2.5 py-1 text-[10px] font-semibold text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            Connected
          </span>
        )}
      </div>

      {displayAddress ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-purple-500/[0.06] border border-purple-500/20 px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-xs font-semibold text-purple-400">Embedded Wallet</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Address:</span>
              <button
                onClick={handleCopy}
                className="text-sm font-mono font-bold text-white hover:text-purple-400 transition flex items-center gap-1"
              >
                {shortenAddress(displayAddress)}
                {copied ? (
                  <svg className="h-3.5 w-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground/70">Network: Somnia &middot; Linked to your Discord account</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg bg-white/[0.04] border border-white/10 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Wallet will be created automatically when you log in. If it didn't connect, click the button below.
            </p>
          </div>
          <button
            onClick={() => {
              window.location.reload();
            }}
            className="rounded-lg bg-purple-500/20 border border-purple-500/30 px-4 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/30 transition"
          >
            Retry Wallet Setup
          </button>
        </div>
      )}
    </div>
  );
}
