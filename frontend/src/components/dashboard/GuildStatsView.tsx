import { useState, useEffect, useCallback } from "react";
import { useAccount, useReadContract } from "wagmi";
import { api } from "@/lib/api";
import { GUILD_TIP_ABI, somniaTestnet } from "@/lib/web3";
import type { GuildStatsData, GuildTopTrack, GuildTopArtist } from "@/types/player";
import GuildTippTab from "./GuildTippTab";

interface Props {
  guildId: string;
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
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stats" | "tipp">("stats");

  // Fetch guild contract address for Guild Tipp tab
  const [contractAddress, setContractAddress] = useState("");
  const { address: walletAddress } = useAccount();

  // Read contract owner
  const { data: contractOwner } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: GUILD_TIP_ABI,
    functionName: "owner",
    chainId: somniaTestnet.id,
    query: { enabled: !!contractAddress },
  });
  const isOwner = !!(walletAddress && contractOwner && walletAddress.toLowerCase() === (contractOwner as string).toLowerCase());

  useEffect(() => {
    setLoading(true);
    api
      .get<GuildStatsData>(`/api/guild/${guildId}/stats`)
      .then(({ data }) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));

    // Check if this guild has a tip jar contract
    api
      .get(`/api/guild/${guildId}/contract`)
      .then(({ data }) => {
        if (data?.contractAddress) setContractAddress(data.contractAddress);
      })
      .catch(() => setContractAddress(""));

    // Also try community endpoint
    api
      .get(`/api/community/guild/${guildId}`)
      .then(({ data }) => {
        if (data?.contractAddress && !contractAddress) setContractAddress(data.contractAddress);
      })
      .catch(() => {});
  }, [guildId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white">Guild Stats</h1>
        <p className="mt-1 text-sm text-white/40">
          Server-wide music statistics.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-white/[0.06]">
        <button
          onClick={() => setActiveTab("stats")}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all ${
            activeTab === "stats"
              ? "bg-white/[0.06] text-white border-b-2 border-pink-500"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          Guild Stats
        </button>
        <button
          onClick={() => setActiveTab("tipp")}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all ${
            activeTab === "tipp"
              ? "bg-white/[0.06] text-white border-b-2 border-pink-500"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          Guild Tipp
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "stats" ? (
        <div className="space-y-6">
          {/* Stat cards */}
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

          {/* Top lists */}
          <div className="grid gap-6 md:grid-cols-2">
            <TopList title="Top Tracks" items={stats?.topTracks ?? []} />
            <TopList
              title="Top Artists"
              items={stats?.topArtists ?? []}
              isArtist
            />
          </div>
        </div>
      ) : (
        /* Guild Tipp Tab */
        <GuildTippTab
          guildId={guildId}
          contractAddress={contractAddress}
          isOwner={isOwner}
        />
      )}
    </div>
  );
}
