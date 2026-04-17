import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Coins, ExternalLink, AlertTriangle } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useClaimTips } from "@/hooks/useContract";
import WalletConnect from "@/components/WalletConnect";
import { getExplorerAddressUrl, truncateAddress } from "@/lib/web3";
import { api } from "@/lib/api";

interface Props {
  guildId: string;
}

export default function ClaimTips({ guildId }: Props) {
  const { address, isConnected } = useAccount();
  const { isCorrectChain, switchToSomnia } = useWallet();
  const [contractAddress, setContractAddress] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const {
    claimTips,
    isPending,
    claimableBalance,
    refetchBalance,
  } = useClaimTips(contractAddress);

  useEffect(() => {
    api
      .get(`/api/guild/${guildId}/contract`)
      .then(({ data }) => {
        if (data?.contractAddress) setContractAddress(data.contractAddress);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guildId]);

  // Refresh balance periodically
  useEffect(() => {
    if (!contractAddress) return;
    const interval = setInterval(() => refetchBalance(), 30_000);
    return () => clearInterval(interval);
  }, [contractAddress, refetchBalance]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
        <div className="animate-pulse flex gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 bg-white/10 rounded" />
            <div className="h-3 w-36 bg-white/10 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // No contract deployed
  if (!contractAddress) return null;

  const hasBalance = parseFloat(claimableBalance) > 0;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
          <Coins className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-white mb-1">Claim Tips</h3>
          <p className="text-xs text-white/40 mb-3">
            Withdraw accumulated donations from your guild's tip jar. Fee (1.5%) was already deducted at donation time.
          </p>

          {/* Balance info */}
          <div className="mb-4">
            <div className="rounded-lg bg-white/[0.04] p-3">
              <p className="text-[10px] text-white/40">Available to Claim</p>
              <p className="text-lg font-bold text-emerald-400">{claimableBalance} STT</p>
            </div>
          </div>

          {/* Contract link */}
          <div className="mb-4">
            <a
              href={getExplorerAddressUrl(contractAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-emerald-400 transition"
            >
              Contract: {truncateAddress(contractAddress)}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          {/* Actions */}
          {!isConnected ? (
            <WalletConnect compact />
          ) : !isCorrectChain ? (
            <button
              onClick={switchToSomnia}
              className="flex items-center gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 text-xs font-semibold text-yellow-400 hover:bg-yellow-500/20 transition"
            >
              Switch to Somnia
            </button>
          ) : !hasBalance ? (
            <div className="flex items-center gap-2 text-xs text-white/40">
              <AlertTriangle className="w-3.5 h-3.5" />
              No tips to claim yet.
            </div>
          ) : (
            <button
              onClick={claimTips}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <div className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <Coins className="w-3.5 h-3.5" />
                  Claim {claimableBalance} STT
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
