import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";

import Footer from "@/components/Footer";

type ShardInfo = {
  shardId: number;
  clusterId: number;
  status: "connecting" | "connected" | "disconnected" | "reconnecting" | "ready";
  guilds: number;
  users: number;
  ping: number;
  updatedAt: number;
};

type ClusterInfo = {
  id: number;
  guilds: number;
  users: number;
  channels: number;
  memoryUsage: number;
  streams: number;
  status: "healthy" | "stale" | "restarting" | "inactive";
  shards: ShardInfo[];
  updatedAt: number;
};

type SystemStatusData = {
  mode: "clustered" | "single";
  totalShards: number;
  totalClusters: number;
  totalGuilds: number;
  totalUsers: number;
  totalStreams: number;
  totalMemory: number;
  uptime: number;
  clusters: ClusterInfo[];
};

type ShardStatusFilter = "all" | "online" | "connecting" | "offline";

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

function isOnline(status: string) {
  return status === "ready" || status === "connected" || status === "healthy";
}

function isConnecting(status: string) {
  return status === "connecting" || status === "reconnecting" || status === "stale" || status === "restarting";
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

/* ─── Shard Card ─── */

function ShardCard({ shard, cluster }: { shard: ShardInfo; cluster: ClusterInfo }) {
  const [hovered, setHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<"top" | "bottom">("top");
  const cardRef = useRef<HTMLDivElement>(null);

  const online = isOnline(shard.status);
  const connecting = isConnecting(shard.status);

  const bg = online
    ? "bg-white/5 backdrop-blur-xl border-green-400/30 shadow-[0_0_10px_rgba(34,197,94,0.3)] hover:border-green-400/50 hover:shadow-[0_0_18px_rgba(34,197,94,0.45)]"
    : connecting
      ? "bg-white/5 backdrop-blur-xl border-yellow-400/30 shadow-[0_0_10px_rgba(234,179,8,0.25)] hover:border-yellow-400/50 hover:shadow-[0_0_18px_rgba(234,179,8,0.4)]"
      : "bg-white/5 backdrop-blur-xl border-red-400/30 shadow-[0_0_10px_rgba(239,68,68,0.3)] hover:border-red-400/50 hover:shadow-[0_0_18px_rgba(239,68,68,0.45)]";

  const numColor = online ? "text-emerald-400" : connecting ? "text-amber-400" : "text-red-400";
  const dotColor = online ? "bg-emerald-500" : connecting ? "bg-amber-500" : "bg-red-500";

  const handleMouseEnter = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setTooltipPos(rect.top < 280 ? "bottom" : "top");
    }
    setHovered(true);
  };

  return (
    <div
      ref={cardRef}
      className={`relative group flex flex-col items-center justify-center rounded-xl border ${bg} w-full aspect-square cursor-default transition-all duration-300 hover:scale-105`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setHovered(false)}
    >
      <span className={`text-xs font-bold font-mono ${numColor}`}>{shard.shardId}</span>

      {/* Tooltip */}
      {hovered && (
        <div
          className={`absolute ${tooltipPos === "top" ? "bottom-full mb-2.5" : "top-full mt-2.5"} left-1/2 -translate-x-1/2 z-50 w-56 rounded-lg border border-white/10 bg-black/30 backdrop-blur-xl shadow-2xl p-3.5 animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white">Shard #{shard.shardId}</span>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${dotColor} ${online ? "animate-pulse" : ""}`} />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${numColor}`}>
                {online ? "Online" : connecting ? "Connecting" : "Offline"}
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            {[
              { label: "Cluster", value: `#${shard.clusterId}` },
              { label: "Guilds", value: formatNumber(shard.guilds) },
              { label: "Users", value: formatNumber(shard.users) },
              { label: "Ping", value: shard.ping >= 0 ? `${shard.ping}ms` : "—" },
              { label: "Node", value: isOnline(cluster.status) ? "Healthy" : cluster.status },
              { label: "Memory", value: `${cluster.memoryUsage} MB` },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-[10px] text-white/30">{row.label}</span>
                <span className="text-[11px] font-semibold text-white/70">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─── */

export default function SystemStatus() {
  const [data, setData] = useState<SystemStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [filter, setFilter] = useState<ShardStatusFilter>("all");
  const [guildSearch, setGuildSearch] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get("/api/system-status");
      setData(res.data);
      setError(null);
    } catch {
      setError("Failed to fetch system status");
    } finally {
      setLoading(false);
      setCountdown(30);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    const timer = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 30)), 1000);
    return () => clearInterval(timer);
  }, []);

  const allShards: { shard: ShardInfo; cluster: ClusterInfo }[] = [];
  if (data) {
    for (const cluster of data.clusters) {
      for (const shard of cluster.shards) {
        allShards.push({ shard, cluster });
      }
    }
    allShards.sort((a, b) => a.shard.shardId - b.shard.shardId);
  }

  const problemCount = allShards.filter(({ shard }) => !isOnline(shard.status)).length;

  const filteredShards = allShards.filter(({ shard }) => {
    if (filter === "online") return isOnline(shard.status);
    if (filter === "connecting") return isConnecting(shard.status);
    if (filter === "offline") return !isOnline(shard.status) && !isConnecting(shard.status);
    return true;
  });

  const searchedShardId =
    guildSearch.trim().length > 0 && data
      ? (() => {
          try {
            return Number((BigInt(guildSearch.trim()) >> 22n) % BigInt(data.totalShards || 1));
          } catch {
            return null;
          }
        })()
      : null;

  return (
    <div className="min-h-screen flex flex-col relative text-foreground">
      <Navbar />
      <div className="h-20 lg:h-24" />

      <main className="flex-1">
        <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">Bot Status</h1>
          <div className="flex items-center justify-center gap-5 text-xs text-white/40">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] inline-block" /> Online
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b] inline-block" /> Connecting
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ef4444] inline-block" /> Offline
            </span>
          </div>
        </div>

        {loading && !data && (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        )}

        {error && !data && (
          <div className="text-center py-32">
            <p className="text-rose-400 text-sm">{error}</p>
            <button onClick={fetchStatus} className="mt-4 text-xs text-white/40 hover:text-white underline">Try again</button>
          </div>
        )}

        {data && (
          <div className="space-y-8">
            {/* Summary */}
            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-lg p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-2xl font-black text-white">
                    {data.totalShards} <span className="text-base font-semibold text-white/40">shards</span>
                  </p>
                  <p className="text-sm mt-1">
                    {problemCount === 0 ? (
                      <span className="text-[#22c55e] font-semibold">All shards operational</span>
                    ) : (
                      <span className="text-[#ef4444] font-semibold">
                        {problemCount}/{data.totalShards} shard{problemCount !== 1 ? "s" : ""} have a problem
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-4 sm:gap-6">
                  {[
                    { label: "Clusters", value: data.totalClusters },
                    { label: "Guilds", value: formatNumber(data.totalGuilds) },
                    { label: "Users", value: formatNumber(data.totalUsers) },
                    { label: "RAM", value: `${data.totalMemory} MB` },
                    { label: "Uptime", value: formatUptime(data.uptime) },
                  ].map((s) => (
                    <div key={s.label} className="text-center hidden sm:block">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">{s.label}</p>
                      <p className="text-sm font-bold text-white/70 mt-0.5">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4 sm:hidden">
                {[
                  { label: "Clusters", value: data.totalClusters },
                  { label: "Guilds", value: formatNumber(data.totalGuilds) },
                  { label: "Users", value: formatNumber(data.totalUsers) },
                ].map((s) => (
                  <div key={s.label} className="text-center rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg py-2">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/20">{s.label}</p>
                    <p className="text-sm font-bold text-white/70">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Filter + Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {(["all", "online", "connecting", "offline"] as ShardStatusFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all duration-300 ${
                      filter === f
                        ? "bg-white/10 backdrop-blur-xl text-white border border-white/15 shadow-lg"
                        : "text-white/30 hover:text-white/50 hover:bg-white/5 hover:backdrop-blur-xl border border-transparent"
                    }`}
                  >
                    {f === "all" ? `All (${allShards.length})` : f}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={guildSearch}
                    onChange={(e) => setGuildSearch(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Guild ID"
                    className="w-44 h-8 pl-3 pr-8 rounded-lg bg-white/5 backdrop-blur-xl border border-white/10 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/20 shadow-lg transition-all duration-300"
                  />
                  <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {searchedShardId !== null && (
                  <span className="text-[11px] text-white/40">
                    → Shard <span className="text-emerald-400 font-bold">#{searchedShardId}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Shard Grid */}
            <div className="grid grid-cols-6 xs:grid-cols-8 sm:grid-cols-10 lg:grid-cols-14 xl:grid-cols-17 gap-2">
              {filteredShards.map(({ shard, cluster }) => (
                <ShardCard key={shard.shardId} shard={shard} cluster={cluster} />
              ))}
            </div>

            {filteredShards.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm text-white/30">No shards match the current filter.</p>
              </div>
            )}

            {/* Auto-refresh indicator */}
            <div className="flex items-center justify-center gap-2 pt-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]" />
              </span>
              <span className="text-[11px] text-white/25">
                Auto-refresh in <span className="text-white/40 font-mono font-bold">{countdown}s</span>
              </span>
            </div>
          </div>
        )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
