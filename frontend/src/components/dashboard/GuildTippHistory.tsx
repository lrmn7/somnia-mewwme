import { useEffect, useState } from "react";
import { createPublicClient, http, formatEther, parseAbiItem } from "viem";
import { getExplorerTxUrl, somniaTestnet } from "@/lib/web3";
import { api } from "@/lib/api";
import { FiExternalLink, FiClock, FiInbox, FiHeart } from "react-icons/fi";

const publicClient = createPublicClient({
  chain: somniaTestnet,
  transport: http("https://dream-rpc.somnia.network"),
});

const DONATED_EVENT = parseAbiItem(
  "event Donated(address indexed sender, uint256 amount, uint256 fee, string message, uint256 timestamp)"
);

interface Props {
  guildId: string;
  contractAddress: string;
}

interface DonationTx {
  sender: string;
  senderDiscordId?: string | null;
  displayName?: string | null;
  avatarURL?: string | null;
  amount: string;
  message: string;
  timestamp: number;
  txHash: string;
}

async function fetchOnChainHistory(contractAddress: string): Promise<DonationTx[]> {
  try {
    const logs = await publicClient.getLogs({
      address: contractAddress as `0x${string}`,
      event: DONATED_EVENT,
      fromBlock: 0n,
      toBlock: "latest",
    });
    return logs
      .map((log) => ({
        sender: log.args.sender ?? "",
        amount: formatEther(log.args.amount ?? 0n),
        message: log.args.message ?? "",
        timestamp: Number(log.args.timestamp ?? 0n),
        txHash: log.transactionHash ?? "",
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);
  } catch {
    return [];
  }
}

async function fetchApiHistory(guildId: string): Promise<DonationTx[]> {
  try {
    const { data } = await api.get(`/api/community/guild/${guildId}/history`);
    return Array.isArray(data) ? data.slice(0, 10) : [];
  } catch {
    return [];
  }
}

function shortAddress(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function relativeTime(ts: number) {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function GuildTippHistory({ guildId, contractAddress }: Props) {
  const [donations, setDonations] = useState<DonationTx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contractAddress) return;
    setLoading(true);
    (async () => {
      let results = await fetchOnChainHistory(contractAddress);
      if (results.length === 0) {
        results = await fetchApiHistory(guildId);
      } else {
        // Merge on-chain data with API data to get display names / avatars
        try {
          const apiResults = await fetchApiHistory(guildId);
          const apiMap = new Map(apiResults.map(r => [r.txHash, r]));
          results = results.map(r => {
            const apiEntry = apiMap.get(r.txHash);
            if (apiEntry) {
              return {
                ...r,
                senderDiscordId: apiEntry.senderDiscordId,
                displayName: apiEntry.displayName,
                avatarURL: apiEntry.avatarURL,
              };
            }
            return r;
          });
        } catch { /* ignore merge failures */ }
      }
      setDonations(results);
      setLoading(false);
    })();
  }, [guildId, contractAddress]);

  const formatAmount = (raw: string) => {
    try {
      const num = parseFloat(raw);
      if (!isNaN(num)) {
        return num.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        }) + " STT";
      }
      return raw + " STT";
    } catch {
      return raw + " STT";
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-0.5 h-5 rounded-full bg-pink-500 shrink-0" />
        <h3 className="text-lg font-bold text-white">History</h3>
        {donations.length > 0 && (
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/40">
            {donations.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
        </div>
      ) : donations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-white/30">
          <FiInbox className="h-10 w-10 mb-3" />
          <p className="text-sm font-medium">no donations yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {donations.map((tx, i) => (
            <div
              key={tx.txHash || i}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm px-4 py-3.5 hover:bg-white/[0.04] transition-colors"
            >
              {/* Top: avatar + name + wallet */}
              <div className="flex items-center gap-3 mb-2">
                {tx.avatarURL ? (
                  <img
                    src={tx.avatarURL}
                    alt=""
                    className="h-8 w-8 rounded-full shrink-0 ring-1 ring-white/10"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-pink-500/15 flex items-center justify-center shrink-0 ring-1 ring-white/10">
                    <FiHeart className="h-3.5 w-3.5 text-pink-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {tx.displayName || shortAddress(tx.sender)}
                  </p>
                  {tx.displayName && (
                    <p className="text-[10px] font-mono text-white/30 truncate">
                      {shortAddress(tx.sender)}
                    </p>
                  )}
                </div>
              </div>

              {/* Message (only if present) */}
              {tx.message && (
                <p className="text-xs text-white/50 leading-relaxed mb-2.5 pl-11">
                  {tx.message}
                </p>
              )}

              {/* Bottom: amount + time + tx link */}
              <div className="flex items-center justify-between pl-11">
                <span className="text-sm font-bold text-pink-400">
                  {formatAmount(tx.amount)}
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[11px] text-white/35">
                    <FiClock className="h-3 w-3" />
                    {relativeTime(tx.timestamp)}
                  </div>
                  {tx.txHash && (
                    <a
                      href={getExplorerTxUrl(tx.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-pink-400/70 hover:text-pink-400 transition-colors"
                    >
                      Tx
                      <FiExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
