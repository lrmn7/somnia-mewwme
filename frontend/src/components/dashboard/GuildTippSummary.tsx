import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import { GUILD_TIP_ABI, somniaTestnet } from "@/lib/web3";
import { FiDollarSign, FiBox, FiHeart, FiArrowDownCircle } from "react-icons/fi";

interface Props {
  guildId: string;
  contractAddress: string;
  isOwner: boolean;
  hideClaim?: boolean;
  onDonate: () => void;
  onClaim: () => void;
}

export default function GuildTippSummary({ guildId, contractAddress, isOwner, hideClaim, onDonate, onClaim }: Props) {
  const { data: totalDonations, isLoading: loadingTotal } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: GUILD_TIP_ABI,
    functionName: "totalDonations",
    chainId: somniaTestnet.id,
    query: { enabled: !!contractAddress },
  });
  const { data: balance, isLoading: loadingBalance } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: GUILD_TIP_ABI,
    functionName: "getBalance",
    chainId: somniaTestnet.id,
    query: { enabled: !!contractAddress },
  });

  const totalNum = totalDonations ? parseFloat(formatEther(totalDonations as bigint)) : 0;
  const balanceNum = balance ? parseFloat(formatEther(balance as bigint)) : 0;

  const formattedTotal = loadingTotal
    ? "..."
    : `${totalNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} STT`;
  const formattedBalance = loadingBalance
    ? "..."
    : `${balanceNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} STT`;

  const claimDisabled = !isOwner || balanceNum === 0;
  const claimTooltip = !isOwner
    ? "Only server owner can claim"
    : balanceNum === 0
    ? "No balance to claim"
    : "Claim funds";

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md p-5 flex items-start gap-4">
          <div className="shrink-0 h-11 w-11 rounded-xl bg-pink-500/10 flex items-center justify-center">
            <FiDollarSign className="h-5 w-5 text-pink-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white/40 mb-1">Total Donate</p>
            <p className="text-xl font-bold text-pink-400 truncate">{formattedTotal}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md p-5 flex items-start gap-4">
          <div className="shrink-0 h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <FiBox className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white/40 mb-1">Current Balance</p>
            <p className="text-xl font-bold text-emerald-400 truncate">{formattedBalance}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onDonate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500/20 to-rose-500/20 border border-pink-500/20 text-pink-400 font-semibold text-sm hover:from-pink-500/30 hover:to-rose-500/30 hover:border-pink-500/30 transition-all active:scale-[0.98]"
        >
          <FiHeart className="h-4 w-4" />
          Support this Server
        </button>

        {!hideClaim && (
          <button
            onClick={onClaim}
            disabled={claimDisabled}
            title={claimTooltip}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border font-semibold text-sm transition-all active:scale-[0.98] ${
              claimDisabled
                ? "bg-white/[0.03] border-white/[0.06] text-white/25 cursor-not-allowed"
                : "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-emerald-500/20 text-emerald-400 hover:from-emerald-500/30 hover:to-teal-500/30 hover:border-emerald-500/30"
            }`}
          >
            <FiArrowDownCircle className="h-4 w-4" />
            Claim
          </button>
        )}
      </div>
    </div>
  );
}
