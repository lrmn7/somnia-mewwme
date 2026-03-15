import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { GuildStatsData, GuildTopTrack, GuildTopArtist } from "@/types/player";
import { formatSTT, shortenAddress, GUILD_TIP_ABI } from "@/lib/web3";
import { useEmbeddedWallet } from "@/hooks/useEmbeddedWallet";
import { GuildTipButton } from "@/components/dashboard/GuildTipButton";
import { useSocket } from "@/hooks/useSocket";

interface Props {
  guildId: string;
}

interface GuildWeb3Overview {
  guildId: string;
  name: string;
  icon: string | null;
  memberCount: number;
  ownerId: string;
  isGuildOwner: boolean;
  contractAddress: string | null;
  hasPremium: boolean;
  premiumPlan: string | null;
  premiumExpiresAt: number | "lifetime" | null;
  premiumRedeemedBy: string | null;
  totalTips: string;
  tipCount: number;
  recentTips: {
    senderWallet: string;
    amount: string;
    txHash: string;
    timestamp: number;
    message?: string;
  }[];
}

interface TipHistoryResponse {
  guildId: string;
  totalTips: string;
  tipCount: number;
  tips: {
    id: string;
    guildId: string;
    senderWallet: string;
    amount: string;
    txHash: string;
    timestamp: number;
    message?: string;
  }[];
}

function formatListenTime(ms: number): string {
  if (ms <= 0) return "0m";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(" ");
}

function StatCard({
  label,
  value,
  icon,
  color = "rose",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: "rose" | "purple" | "green" | "amber";
}) {
  const colorMap = {
    rose: "bg-rose-500/20 text-rose-400",
    purple: "bg-purple-500/20 text-purple-400",
    green: "bg-green-500/20 text-green-400",
    amber: "bg-amber-500/20 text-amber-400",
  };
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] text-white/40">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

function Thumbnail({
  src,
  name,
  isArtist,
}: {
  src?: string | null;
  name: string;
  isArtist?: boolean;
}) {
  const [imgErr, setImgErr] = useState(false);
  if (src && !imgErr) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgErr(true)}
        className={`h-9 w-9 shrink-0 object-cover ${isArtist ? "rounded-full" : "rounded-md"}`}
      />
    );
  }
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center bg-white/[0.06] text-[10px] font-bold text-white/40 ${
        isArtist ? "rounded-full" : "rounded-md"
      }`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function TopList({
  title,
  items,
  isArtist,
}: {
  title: string;
  items: (GuildTopTrack | GuildTopArtist)[];
  isArtist?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
        <h3 className="mb-3 text-sm font-bold text-white">{title}</h3>
        <p className="text-xs text-white/40">No data yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
      <h3 className="mb-3 text-sm font-bold text-white">{title}</h3>
      <ul className="space-y-1">
        {items.map((item, idx) => {
          const url = isArtist
            ? (item as GuildTopArtist).artistUrl
            : (item as GuildTopTrack).trackUrl;
          const nameEl = url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-xs font-semibold text-white/80 transition-colors group-hover:text-green-400"
            >
              {item.name}
            </a>
          ) : (
            <span className="truncate text-xs font-semibold text-white/80 transition-colors group-hover:text-green-400">
              {item.name}
            </span>
          );
          return (
            <li
              key={
                isArtist
                  ? (item as GuildTopArtist).artistId
                  : (item as GuildTopTrack).trackId
              }
              className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5"
            >
              <span className="w-4 shrink-0 text-right text-[10px] font-bold text-white/30">
                {idx + 1}
              </span>
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md">
                <Thumbnail
                  src={item.artworkUrl}
                  name={item.name}
                  isArtist={isArtist}
                />
              </div>
              <div className="min-w-0 flex-1">{nameEl}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function GuildStatsView({ guildId }: Props) {
  const [stats, setStats] = useState<GuildStatsData | null>(null);
  const [web3, setWeb3] = useState<GuildWeb3Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [pendingBalance, setPendingBalance] = useState<string | null>(null);
  const [onChainTotalTips, setOnChainTotalTips] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"music" | "tips">("music");
  const [tipHistory, setTipHistory] = useState<TipHistoryResponse | null>(null);
  const [tipHistoryLoading, setTipHistoryLoading] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const { hasWallet, getProviderAndSigner } = useEmbeddedWallet();
  const { socket } = useSocket(guildId);

  // Reset tip history to force re-fetch from chain
  const refreshTipHistory = useCallback(() => {
    setTipHistory(null);
    setRefreshCounter((c) => c + 1);
  }, []);

  // Listen for real-time tip events via Socket.IO (from Somnia Reactivity)
  useEffect(() => {
    if (!socket) return;
    const handler = (data: any) => {
      const newTip = {
        id: `rt-${Date.now()}`,
        guildId,
        senderWallet: data.sender ?? "",
        amount: data.amount ?? "0",
        txHash: data.txHash ?? "",
        timestamp: data.timestamp ?? Date.now(),
        message: data.message ?? "",
      };

      // Append new tip to history immediately (real-time)
      setTipHistory((prev) => {
        if (!prev) return prev;
        // Avoid duplicate
        if (prev.tips.some((t) => t.senderWallet === newTip.senderWallet && t.amount === newTip.amount && Math.abs(t.timestamp - newTip.timestamp) < 5000)) {
          return prev;
        }
        const newTotal = (BigInt(prev.totalTips) + BigInt(newTip.amount)).toString();
        return {
          ...prev,
          totalTips: newTotal,
          tipCount: prev.tipCount + 1,
          tips: [newTip, ...prev.tips].slice(0, 10),
        };
      });

      // Sync new tip to localStorage cache
      if (web3?.contractAddress) {
        try {
          const cacheKey = `tipHistory:v2:${web3.contractAddress}`;
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            const tips = parsed.tips ?? [];
            if (!tips.some((t: any) => t.txHash === newTip.txHash && newTip.txHash)) {
              tips.unshift(newTip);
              localStorage.setItem(cacheKey, JSON.stringify({ ...parsed, tips }));
            }
          }
        } catch { /* ignore */ }
      }

      // Refresh on-chain balance
      setRefreshCounter((c) => c + 1);
    };
    socket.on("tipReceived", handler);
    return () => { socket.off("tipReceived", handler); };
  }, [socket, guildId, web3?.contractAddress]);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<GuildStatsData>(`/api/guild/${guildId}/stats`).catch(() => ({ data: null })),
      api.get<GuildWeb3Overview>(`/api/web3/guild/${guildId}/overview`).catch(() => ({ data: null })),
    ]).then(([statsRes, web3Res]) => {
      setStats(statsRes.data);
      setWeb3(web3Res.data);
    }).finally(() => setLoading(false));
  }, [guildId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Read pending balance and totalTips from contract on-chain
  useEffect(() => {
    if (!web3?.contractAddress || !hasWallet) return;
    (async () => {
      try {
        const { Contract } = await import("ethers");
        const { provider } = await getProviderAndSigner();
        const contract = new Contract(web3.contractAddress!, GUILD_TIP_ABI, provider);
        const [balance, total]: [bigint, bigint] = await Promise.all([
          contract.getBalance(),
          contract.totalTips(),
        ]);
        setPendingBalance(balance.toString());
        setOnChainTotalTips(total.toString());
      } catch {
        // wallet not connected or RPC error, ignore
      }
    })();
  }, [web3?.contractAddress, hasWallet, getProviderAndSigner, refreshCounter]);

  // Lazy-load full tip history when Tip Stats tab is selected
  // Uses localStorage cache + incremental on-chain scan for speed
  useEffect(() => {
    if (activeTab !== "tips" || !web3?.contractAddress || tipHistory) return;
    setTipHistoryLoading(true);

    const cacheKey = `tipHistory:v2:${web3.contractAddress}`;

    (async () => {
      try {
        const { Contract, JsonRpcProvider } = await import("ethers");
        const provider = new JsonRpcProvider("https://dream-rpc.somnia.network");
        const contract = new Contract(web3.contractAddress!, GUILD_TIP_ABI, provider);

        // Load cache from localStorage
        let cachedTips: any[] = [];
        let lastScannedBlock = 0;
        try {
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            cachedTips = parsed.tips ?? [];
            lastScannedBlock = parsed.lastBlock ?? 0;
          }
          // Clean old cache keys
          localStorage.removeItem(`tipHistory:${web3.contractAddress}`);
        } catch { /* corrupted cache, ignore */ }

        const currentBlock = await provider.getBlockNumber();

        // If cache is fresh (scanned up to current block), use it directly
        if (lastScannedBlock >= currentBlock && cachedTips.length > 0) {
          const totalAmount = cachedTips.reduce(
            (acc: bigint, t: any) => acc + BigInt(t.amount), BigInt(0)
          );
          setTipHistory({
            guildId,
            totalTips: totalAmount.toString(),
            tipCount: cachedTips.length,
            tips: cachedTips.slice(0, 10),
          });
          return;
        }

        // Only scan blocks AFTER the last cached block
        const CHUNK = 999;
        const PARALLEL = 5;
        const MIN_TIPS = 10;
        const MAX_ROUNDS = 100; // 100 rounds × 5 = 500 chunks (~500k blocks, ~2.5 days on Somnia)
        const filter = contract.filters.TipReceived();
        const newEvents: any[] = [];

        const hasCache = lastScannedBlock > 0;

        if (hasCache) {
          // Incremental: scan forward from cache to current block
          const startBlock = lastScannedBlock + 1;
          const blocksToScan = currentBlock - startBlock;
          if (blocksToScan > 0) {
            const totalChunks = Math.ceil(blocksToScan / CHUNK);
            let scanned = 0;
            while (scanned < totalChunks) {
              const promises: Promise<any[]>[] = [];
              for (let j = 0; j < PARALLEL && scanned + j < totalChunks; j++) {
                const idx = scanned + j;
                const from = startBlock + idx * CHUNK;
                const to = Math.min(from + CHUNK - 1, currentBlock);
                promises.push(contract.queryFilter(filter, from, to).catch(() => [] as any[]));
              }
              if (promises.length === 0) break;
              const results = await Promise.all(promises);
              for (const ev of results) newEvents.push(...ev);
              scanned += promises.length;
            }
          }
        } else {
          // Cold start: scan BACKWARDS from current block, stop when >= 10 tips found
          let cursor = currentBlock;
          for (let round = 0; round < MAX_ROUNDS; round++) {
            const promises: Promise<any[]>[] = [];
            for (let j = 0; j < PARALLEL; j++) {
              const toBlock = cursor - j * CHUNK;
              const fromBlock = Math.max(0, toBlock - CHUNK + 1);
              if (toBlock < 0) break;
              promises.push(contract.queryFilter(filter, fromBlock, toBlock).catch(() => [] as any[]));
              if (fromBlock === 0) break;
            }
            if (promises.length === 0) break;
            const results = await Promise.all(promises);
            for (const ev of results) newEvents.push(...ev);
            cursor -= PARALLEL * CHUNK;
            // Stop early: found enough tips or reached block 0
            if (newEvents.length >= MIN_TIPS || cursor <= 0) break;
          }
        }

        // Merge new events with cached tips
        const newTips = newEvents.map((e: any) => ({
          id: e.transactionHash,
          guildId: guildId,
          senderWallet: e.args?.sender ?? "",
          amount: (e.args?.amount ?? BigInt(0)).toString(),
          txHash: e.transactionHash,
          timestamp: Number(e.args?.timestamp ?? 0) * 1000,
          message: e.args?.message ?? "",
        }));

        const allTips = [...cachedTips, ...newTips]
          .filter((t, i, arr) => arr.findIndex((x) => x.txHash === t.txHash) === i) // dedupe
          .sort((a, b) => b.timestamp - a.timestamp);

        // Save to localStorage cache
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            tips: allTips,
            lastBlock: currentBlock,
          }));
        } catch { /* storage full, ignore */ }

        const totalAmount = allTips.reduce(
          (acc: bigint, t: any) => acc + BigInt(t.amount), BigInt(0)
        );

        setTipHistory({
          guildId,
          totalTips: totalAmount.toString(),
          tipCount: allTips.length,
          tips: allTips.slice(0, 10),
        });
      } catch (err) {
        console.error("[TipHistory] Failed to read on-chain events:", err);
        setTipHistory({ guildId, totalTips: "0", tipCount: 0, tips: [] });
      } finally {
        setTipHistoryLoading(false);
      }
    })();
  }, [activeTab, guildId, web3?.contractAddress, tipHistory]);

  const copyAddress = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleClaim = useCallback(async () => {
    if (!web3?.contractAddress) return;
    setClaiming(true);
    try {
      const { Contract } = await import("ethers");
      const { signer } = await getProviderAndSigner();
      const contract = new Contract(web3.contractAddress, GUILD_TIP_ABI, signer);
      const tx = await contract.claim();
      toast.info("Claiming tips... waiting for confirmation");
      await tx.wait();
      toast.success("Tips claimed successfully!");
      setPendingBalance("0");
    } catch (err: any) {
      if (err?.code === "ACTION_REJECTED" || err?.code === 4001) {
        toast.error("Transaction rejected");
      } else {
        toast.error(err?.message?.slice(0, 100) ?? "Claim failed");
      }
    } finally {
      setClaiming(false);
    }
  }, [web3?.contractAddress, getProviderAndSigner]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate claimed vs pending for display (prefer on-chain data)
  const totalTipsBig = BigInt(onChainTotalTips ?? web3?.totalTips ?? "0");
  const pendingBig = BigInt(pendingBalance ?? "0");
  const claimedBig = totalTipsBig > pendingBig ? totalTipsBig - pendingBig : BigInt(0);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* ── Server Info Card ── */}
      {web3 && (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {web3.icon ? (
              <img
                src={web3.icon}
                alt={web3.name}
                className="w-16 h-16 rounded-2xl object-cover shrink-0 ring-2 ring-white/10"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/[0.06] flex items-center justify-center text-2xl font-bold text-white/40 shrink-0">
                {web3.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h1 className="text-xl font-extrabold text-white truncate">{web3.name}</h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-1.5">
                <span className="text-xs text-white/40">
                  {(web3.memberCount ?? 0).toLocaleString()} members
                </span>
                {web3.hasPremium && (
                  <span className="flex items-center gap-1 rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold text-purple-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
                    Premium
                    {web3.premiumExpiresAt && web3.premiumExpiresAt !== "lifetime" && (
                      <span className="text-white/30 font-normal ml-1">
                        &middot; Expires: {new Date(web3.premiumExpiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </span>
                )}
              </div>
              {/* Contract Address */}
              {web3.contractAddress && (
                <div className="mt-2 flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-[10px] text-white/30">Tip Contract:</span>
                  <button
                    onClick={() => copyAddress(web3.contractAddress!)}
                    className="font-mono text-[11px] text-purple-400 hover:text-purple-300 transition flex items-center gap-1"
                  >
                    {shortenAddress(web3.contractAddress)}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {copied ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      )}
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Bar ── */}
      <div className="flex items-center gap-1 rounded-xl bg-white/[0.03] border border-white/[0.08] p-1 w-fit">
        <button
          onClick={() => setActiveTab("music")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "music"
              ? "bg-white/10 text-white shadow-sm"
              : "text-muted-foreground hover:text-white hover:bg-white/5"
          }`}
        >
          <svg className="h-3.5 w-3.5 text-rose-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
          Music Stats
        </button>
        {web3?.contractAddress && (
          <button
            onClick={() => setActiveTab("tips")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "tips"
                ? "bg-white/10 text-white shadow-sm"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            }`}
          >
            <svg className="h-3.5 w-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Tip Stats
          </button>
        )}
      </div>

      {/* ── Music Stats Tab ── */}
      {activeTab === "music" && (
        <>
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white/30">
            <span className="w-0.5 h-4 rounded-full bg-rose-500" />
            Music Statistics
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Tracks Played"
              value={(stats?.tracksPlayed ?? 0).toLocaleString()}
              icon={
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              }
            />
            <StatCard
              label="Listen Time"
              value={formatListenTime(stats?.listenTimeMs ?? 0)}
              icon={
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                </svg>
              }
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <TopList title="Top Tracks" items={stats?.topTracks ?? []} />
            <TopList
              title="Top Artists"
              items={stats?.topArtists ?? []}
              isArtist
            />
          </div>
        </>
      )}

      {/* ── Tip Stats Tab ── */}
      {activeTab === "tips" && web3?.contractAddress && (
        <>
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white/30">
            <span className="w-0.5 h-4 rounded-full bg-green-500" />
            Tip Statistics
          </h2>

          {/* Tip Server Button */}
          <GuildTipButton guildId={guildId} onTipSent={refreshTipHistory} />

          {/* Stat Cards: Total Tips + Claimed + Contract Balance (with Claim button) */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Total Tips (Lifetime)"
              value={onChainTotalTips !== null ? `${formatSTT(onChainTotalTips)} STT` : "..."}
              color="green"
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label="Claimed"
              value={pendingBalance !== null ? `${formatSTT(claimedBig.toString())} STT` : "..."}
              color="purple"
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            {/* Contract Balance card with Claim button */}
            <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] text-white/40">Contract Balance</p>
                <p className="mt-0.5 text-xl font-bold text-white">
                  {pendingBalance !== null ? `${formatSTT(pendingBalance)} STT` : "..."}
                </p>
              </div>
              {web3.isGuildOwner && pendingBalance !== null && BigInt(pendingBalance) > BigInt(0) && (
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="mt-auto px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-xs font-semibold text-amber-400 hover:bg-amber-500/30 disabled:opacity-40 transition"
                >
                  {claiming ? "Claiming..." : "Claim Tips"}
                </button>
              )}
            </div>
          </div>

          {/* Tip Transaction History */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">Tip History</h3>
              {tipHistory && (
                <span className="text-[10px] text-white/30">{tipHistory.tipCount} tip{tipHistory.tipCount !== 1 ? "s" : ""}</span>
              )}
            </div>
            {tipHistoryLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
              </div>
            ) : (tipHistory?.tips?.length ?? 0) === 0 ? (
              <p className="text-xs text-white/40 py-4 text-center">No tips yet.</p>
            ) : (
              <ul className="space-y-1">
                {tipHistory!.tips.map((tip) => (
                  <li key={tip.txHash} className="flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-white/5 transition">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{formatSTT(tip.amount)} STT</span>
                        <span className="text-[10px] text-white/30">from {shortenAddress(tip.senderWallet)}</span>
                      </div>
                      {tip.message && (
                        <p className="text-[11px] text-white/50 mt-0.5 italic">"{tip.message}"</p>
                      )}
                      <p className="text-[10px] text-white/20 mt-0.5">
                        {new Date(tip.timestamp).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <a
                      href={`https://somnia.w3us.site/tx/${tip.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-purple-400 hover:text-purple-300 transition shrink-0 mt-1"
                    >
                      View Tx
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
