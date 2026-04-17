import { useEffect } from "react";
import { useClaimTips } from "@/hooks/useContract";
import { useReadContract } from "wagmi";
import { GUILD_TIP_ABI, somniaTestnet } from "@/lib/web3";
import { formatEther } from "viem";
import { toast } from "sonner";
import { FiX, FiArrowDownCircle, FiAlertTriangle } from "react-icons/fi";

interface Props {
  open: boolean;
  onClose: () => void;
  guildId: string;
  contractAddress: string;
  onSuccess?: () => void;
}

export default function ClaimModal({ open, onClose, guildId, contractAddress, onSuccess }: Props) {
  const { claimTips, isPending } = useClaimTips(contractAddress);
  const { data: balance } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: GUILD_TIP_ABI,
    functionName: "getBalance",
    chainId: somniaTestnet.id,
    query: { enabled: !!contractAddress },
  });

  const balanceNum = balance ? parseFloat(formatEther(balance as bigint)) : 0;
  const formattedBalance = balanceNum.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  async function handleClaim() {
    const tx = await claimTips();
    if (tx) {
      onClose();
      onSuccess?.();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0f0f1a]/95 backdrop-blur-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <FiArrowDownCircle className="h-4 w-4 text-emerald-400" />
            </div>
            <h2 className="text-base font-bold text-white">Claim Tips</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-xl border border-yellow-500/15 bg-yellow-500/[0.05] p-3.5">
            <FiAlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-sm text-white/70 leading-relaxed">
              Are you sure you want to claim <span className="font-bold text-emerald-400">{formattedBalance} SOM</span>?
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2.5 justify-end pt-1">
            <button
              type="button"
              className="px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/60 text-sm font-medium hover:bg-white/[0.06] transition-all"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              onClick={handleClaim}
              disabled={isPending || balanceNum === 0}
              title={balanceNum === 0 ? "No balance to claim" : undefined}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                isPending || balanceNum === 0
                  ? "bg-emerald-500/20 text-emerald-400/40 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] shadow-lg shadow-emerald-500/20"
              }`}
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Claiming...
                </span>
              ) : (
                "Claim"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
