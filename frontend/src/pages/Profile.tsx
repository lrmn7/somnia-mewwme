import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { FiLock, FiMusic, FiUsers, FiHeart, FiDisc, FiServer, FiZap, FiX, FiCopy } from "react-icons/fi";
import { Wallet } from "lucide-react";
import type { UserStats, Playlist, LikedTrack } from "@/types/player";
import Navbar from "@/components/Navbar";

import Footer from "@/components/Footer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWallet } from "@/hooks/useWallet";
import { truncateAddress } from "@/lib/web3";

interface LastfmStatus {
  connected: boolean;
  username: string | null;
  enabled: boolean;
}



interface PremiumStatus {
  isPremium: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  hasAccess: boolean;
  voteUrl?: string | null;
  access?: {
    filters?: boolean;
    twentyFourSeven?: boolean;
    autoplay?: boolean;
    lastfm?: boolean;
    spotify?: boolean;
  };
  requirements?: {
    filters?: string;
    twentyFourSeven?: string;
    autoplay?: string;
    lastfm?: string;
    spotify?: string;
  };
}

interface LastfmProfileItem {
  name: string;
  artist?: string;
  playcount: number;
  url: string | null;
  image: string | null;
}

interface SubscriptionRecord {
  userId: string;
  txHash: string;
  walletAddress: string;
  tier: string;
  quotaValue: number;
  amount: string;
  startTime: number;
  expiredAt: number;
  status: "active" | "expired";
}

interface PremiumPlatformData {
  computedQuota: number;
  usedQuota: number;
  redeemedGuilds: string[];
  subscriptions: SubscriptionRecord[];
}

interface MutualGuild {
  id: string;
  name: string;
  icon: string | null;
}

interface RedeemedGuildInfo {
  id: string;
  name: string;
  platform: string;
}

interface PremiumUserStatus {
  success: boolean;
  web3: PremiumPlatformData | null;
  mutualGuilds: MutualGuild[];
  redeemedGuilds: RedeemedGuildInfo[];
}

interface LastfmProfile {
  username: string;
  realname: string | null;
  url: string;
  image: string | null;
  registeredAt: string | null;
  playcount: number;
  artistCount: number;
  trackCount: number;
  albumCount: number;
  lovedCount: number;
  topArtists: LastfmProfileItem[];
  topAlbums: LastfmProfileItem[];
  topTracks: LastfmProfileItem[];
}

function formatListenTime(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(" ");
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
  const [error, setError] = useState(false);
  const isPlaceholder = src?.includes("2a96cbd8b46e442fc41c2b86b821562f");
  if (!src || error || isPlaceholder) {
    return (
      <div
        className={`w-10 h-10 ${isArtist ? "rounded-full" : "rounded-lg"} bg-white/10 flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0`}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      className={`w-10 h-10 ${isArtist ? "rounded-full" : "rounded-lg"} object-cover shrink-0`}
      onError={() => setError(true)}
    />
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, status } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [liked, setLiked] = useState<LikedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Connection state
  const [lastfm, setLastfm] = useState<LastfmStatus | null>(null);
  const [lastfmProfile, setLastfmProfile] = useState<LastfmProfile | null>(null);
  const [lastfmProfileLoading, setLastfmProfileLoading] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);

  // Premium management state
  const [premiumUserStatus, setPremiumUserStatus] = useState<PremiumUserStatus | null>(null);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [claimingGuild, setClaimingGuild] = useState<string | null>(null);
  const [unclaimingGuild, setUnclaimingGuild] = useState<string | null>(null);
  const selectedPlatform = "web3" as const;

  // Connection action state
  const [lastfmLoggingIn, setLastfmLoggingIn] = useState(false);
  const [lastfmLoggingOut, setLastfmLoggingOut] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<"overview" | "lastfm" | "premium" | "wallet">("overview");

  useEffect(() => {
    if (status === "unauthenticated") {
      navigate("/login");
    }
  }, [status, navigate]);

  // Handle OAuth callback toasts
  useEffect(() => {
    const lastfmParam = searchParams.get("lastfm");

    if (lastfmParam === "connected") {
      toast.success("Last.fm connected! Your tracks will now be scrobbled.");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const fetchConnectionStatus = useCallback(async () => {
    const [lfm, prem] = await Promise.all([
      api.get<LastfmStatus>("/api/user/lastfm").catch(() => ({ data: null })),
      api.get<PremiumStatus>("/api/user/premium").catch(() => ({ data: null })),
    ]);
    setLastfm(lfm.data);
    setPremiumStatus(prem.data);
  }, []);

  const fetchPremiumUserStatus = useCallback(async () => {
    setPremiumLoading(true);
    try {
      const { data } = await api.get<PremiumUserStatus>("/api/premium/status");
      setPremiumUserStatus(data);
    } catch {
      setPremiumUserStatus(null);
    } finally {
      setPremiumLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    Promise.all([
      api.get<UserStats>("/api/stats").then(({ data }) => setStats(data)).catch(() => {}),
      api.get<Playlist[]>("/api/playlists").then(({ data }) => setPlaylists(data || [])).catch(() => {}),
      api.get<LikedTrack[]>("/api/liked").then(({ data }) => setLiked(data || [])).catch(() => {}),
      fetchConnectionStatus(),
      fetchPremiumUserStatus(),
    ])
      .catch(() => setError("Failed to load profile data"))
      .finally(() => setLoading(false));
  }, [status, fetchConnectionStatus]);

  // Fetch Last.fm profile when connected
  useEffect(() => {
    if (!lastfm?.connected) { setLastfmProfile(null); return; }
    setLastfmProfileLoading(true);
    api.get<LastfmProfile>("/api/user/lastfm/profile")
      .then(({ data }) => setLastfmProfile(data))
      .catch(() => setLastfmProfile(null))
      .finally(() => setLastfmProfileLoading(false));
  }, [lastfm?.connected]);

  // Auto-refresh connections on window focus
  useEffect(() => {
    if (status !== "authenticated") return;
    function onFocus() { fetchConnectionStatus(); }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [status, fetchConnectionStatus]);

  // Connection handlers
  async function lastfmLogin() {
    setLastfmLoggingIn(true);
    try {
      const { data } = await api.get<{ url: string }>("/api/user/lastfm/login-url");
      window.open(data.url, "_blank", "noopener,noreferrer");
      toast.info("Complete the Last.fm authorization in the new tab. Your status will update automatically when you return.");
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e?.response?.data?.error ?? "Failed to generate Last.fm login URL");
    } finally {
      setLastfmLoggingIn(false);
    }
  }

  async function lastfmLogout() {
    setLastfmLoggingOut(true);
    try {
      await api.delete("/api/user/lastfm");
      toast.success("Last.fm disconnected");
      await fetchConnectionStatus();
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e?.response?.data?.error ?? "Failed to disconnect Last.fm");
    } finally {
      setLastfmLoggingOut(false);
    }
  }

  // Confirmation dialog state for claim/unclaim
  const [confirmAction, setConfirmAction] = useState<{
    type: "claim" | "unclaim";
    guildId: string;
    guildName?: string;
    platform?: string;
  } | null>(null);

  function requestClaim(guildId: string, guildName?: string) {
    setConfirmAction({ type: "claim", guildId, guildName });
  }

  function requestUnclaim(guildId: string, guildName?: string, platform?: string) {
    setConfirmAction({ type: "unclaim", guildId, guildName, platform });
  }

  async function handleClaim(guildId: string) {
    setClaimingGuild(guildId);
    try {
      const { data } = await api.post("/api/premium/web3/claim", { guildId });
      toast.success(data.message?.replace(/\*\*/g, "") ?? "Premium claimed successfully!");
      await fetchPremiumUserStatus();
      await fetchConnectionStatus();
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e?.response?.data?.error ?? "Failed to claim premium.");
    } finally {
      setClaimingGuild(null);
    }
  }

  async function handleUnclaim(guildId: string, _platform: string) {
    setUnclaimingGuild(guildId);
    try {
      const { data } = await api.post("/api/premium/web3/unclaim", { guildId });
      toast.success(data.message?.replace(/\*\*/g, "") ?? "Premium unclaimed successfully!");
      await fetchPremiumUserStatus();
      await fetchConnectionStatus();
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e?.response?.data?.error ?? "Failed to unclaim premium.");
    } finally {
      setUnclaimingGuild(null);
    }
  }


  const isPremium = premiumStatus?.isPremium ?? false;
  const hasLastfmAccess = premiumStatus?.access?.lastfm ?? premiumStatus?.hasAccess === true;
  const lastfmReq = premiumStatus?.requirements?.lastfm ?? "Premium";
  const isLastfmVoter = lastfmReq === "Voter";
  const voteUrl = premiumStatus?.voteUrl ?? "/topgg";

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex flex-col relative text-foreground">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator || "0") % 5}.png`;

  return (
    <div className="min-h-screen flex flex-col relative text-foreground">
      <Navbar />

      <main className="flex-1">
        <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-32 sm:pt-36 pb-20">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* User header card */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="relative">
              <img
                src={avatarUrl}
                alt={user.username}
                className="w-20 h-20 rounded-full ring-2 ring-pink-500/40"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center border border-pink-500/30">
                <svg className="w-3 h-3 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-bold text-foreground">
                {user.global_name || user.username}
              </h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                {premiumStatus?.isOwner && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-500/15 text-yellow-400 text-xs font-medium border border-yellow-500/25">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.5 19h19l-1.5-9-5.5 5-3-7.5-3 7.5L3.5 10 2.5 19zm0 0" />
                      <path d="M5 21h14v1H5z" />
                    </svg>
                    Bot Owner
                  </span>
                )}
                {premiumStatus?.isAdmin && !premiumStatus?.isOwner && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 text-xs font-medium border border-blue-500/25">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                    </svg>
                    Bot Admin
                  </span>
                )}
                {isPremium ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 text-xs font-medium">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    Premium
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 text-muted-foreground text-xs font-medium">
                    Free
                  </span>
                )}
              </div>
              {stats?.firstLogin && (
                <p className="text-xs text-muted-foreground mt-2">
                  Member since {new Date(stats.firstLogin).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-8 rounded-xl bg-white/[0.03] border border-white/[0.08] p-1 w-fit">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "overview"
                ? "bg-white/10 text-white shadow-sm"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            }`}
          >
            Overview
          </button>
          {lastfm?.connected && (
            <button
              onClick={() => setActiveTab("lastfm")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "lastfm"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              }`}
            >
              <svg className="h-3.5 w-3.5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10.584 17.21l-.88-2.392s-1.43 1.594-3.573 1.594c-1.897 0-3.244-1.649-3.244-4.288 0-3.382 1.704-4.591 3.381-4.591 2.42 0 3.189 1.567 3.849 3.574l.88 2.749c.88 2.666 2.529 4.81 7.284 4.81 3.409 0 5.718-1.044 5.718-3.793 0-2.227-1.265-3.381-3.63-3.932l-1.758-.385c-1.21-.275-1.567-.77-1.567-1.594 0-.935.742-1.484 1.952-1.484 1.32 0 2.034.495 2.144 1.677l2.749-.33c-.22-2.474-1.924-3.492-4.729-3.492-2.474 0-4.893.935-4.893 3.932 0 1.87.907 3.051 3.189 3.602l1.87.44c1.402.33 1.87.825 1.87 1.677 0 .99-.907 1.402-2.612 1.402-2.529 0-3.574-1.32-4.178-3.134l-.907-2.803c-1.154-3.574-3.024-4.976-6.76-4.976C1.704 5.874 0 8.354 0 12.142c0 3.574 1.814 5.857 5.118 5.857 2.997 0 4.646-1.265 5.466-2.42v1.631z"/>
              </svg>
              Last.fm
            </button>
          )}
          <button
            onClick={() => setActiveTab("premium")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "premium"
                ? "bg-white/10 text-white shadow-sm"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            }`}
          >
            <FiZap className="h-3.5 w-3.5 text-yellow-400" />
            Premium
          </button>
          <button
            onClick={() => setActiveTab("wallet")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "wallet"
                ? "bg-white/10 text-white shadow-sm"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            }`}
          >
            <Wallet className="h-3.5 w-3.5 text-emerald-400" />
            Wallet
          </button>
        </div>

        {activeTab === "overview" && (
          <>
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
              </svg>
            }
            label="Tracks Played"
            value={(stats?.totalSongsPlayed ?? 0).toLocaleString()}
          />
          <StatCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            label="Listen Time"
            value={formatListenTime(stats?.listenTimeMs ?? 0)}
          />
          <StatCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
              </svg>
            }
            label="Total Playlists"
            value={playlists.length.toString()}
          />
          <StatCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            }
            label="Liked Songs"
            value={liked.length.toString()}
          />
        </div>

        {/* Top Tracks & Artists */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <TopList
            title="Top Tracks"
            items={(stats?.topTracks ?? []).slice(0, 10).map((t) => ({
              name: t.name,
              count: t.count,
              artworkUrl: t.artworkUrl,
              url: t.trackUrl,
              isArtist: false,
            }))}
          />
          <TopList
            title="Top Artists"
            items={(stats?.topArtists ?? []).slice(0, 10).map((a) => ({
              name: a.name,
              count: a.count,
              artworkUrl: a.artworkUrl,
              url: a.artistUrl,
              isArtist: true,
            }))}
          />
        </div>

        {/* User Connections */}
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
            <span className="w-0.5 h-4 rounded-full bg-green-500" />
            Connected Services
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {/* Last.fm Card */}
            <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4 transition-all duration-300 ease-out hover:scale-[1.01] hover:border-white/[0.15] hover:bg-white/[0.04] overflow-hidden">
              {!hasLastfmAccess && (() => {
                const isAdminReq = lastfmReq === "Admin" || lastfmReq === "Owner";
                return (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 bg-black/40 backdrop-blur-[1px] rounded-2xl pointer-events-auto">
                    <FiLock className="h-5 w-5 text-white/70" />
                    <h3 className="text-sm font-bold text-white">
                      {isAdminReq ? "This Feature is Under Maintenance" : isLastfmVoter ? "Vote Required" : "Premium Plan Required"}
                    </h3>
                    {isAdminReq ? (
                      <p className="text-xs text-white/50 text-center px-4">This feature is currently unavailable. Please try again later.</p>
                    ) : (
                      <a
                        href={isLastfmVoter ? voteUrl : "/premium"}
                        target={isLastfmVoter ? "_blank" : undefined}
                        rel={isLastfmVoter ? "noopener noreferrer" : undefined}
                        className="relative flex items-center gap-1 overflow-hidden rounded-lg border border-white/10 bg-white/[0.08] backdrop-blur-md px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/[0.15] hover:border-white/25 active:scale-95"
                      >
                        <span className="relative z-10">{isLastfmVoter ? "Vote on Top.gg" : "Get Premium"}</span>
                      </a>
                    )}
                  </div>
                );
              })()}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10.584 17.21l-.88-2.392s-1.43 1.594-3.573 1.594c-1.897 0-3.244-1.649-3.244-4.288 0-3.382 1.704-4.591 3.381-4.591 2.42 0 3.189 1.567 3.849 3.574l.88 2.749c.88 2.666 2.529 4.81 7.284 4.81 3.409 0 5.718-1.044 5.718-3.793 0-2.227-1.265-3.381-3.63-3.932l-1.758-.385c-1.21-.275-1.567-.77-1.567-1.594 0-.935.742-1.484 1.952-1.484 1.32 0 2.034.495 2.144 1.677l2.749-.33c-.22-2.474-1.924-3.492-4.729-3.492-2.474 0-4.893.935-4.893 3.932 0 1.87.907 3.051 3.189 3.602l1.87.44c1.402.33 1.87.825 1.87 1.677 0 .99-.907 1.402-2.612 1.402-2.529 0-3.574-1.32-4.178-3.134l-.907-2.803c-1.154-3.574-3.024-4.976-6.76-4.976C1.704 5.874 0 8.354 0 12.142c0 3.574 1.814 5.857 5.118 5.857 2.997 0 4.646-1.265 5.466-2.42v1.631z"/>
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-white">Last.fm</h3>
                  <p className="text-[11px] text-muted-foreground">Scrobble your tracks automatically</p>
                </div>
                {lastfm?.connected && (
                  <span className="flex items-center gap-1.5 rounded-full bg-green-500/15 px-2.5 py-1 text-[10px] font-semibold text-green-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    Connected
                  </span>
                )}
              </div>

              {!lastfm?.enabled ? (
                <p className="text-xs text-muted-foreground/70 italic">Last.fm scrobbling is disabled in the bot configuration.</p>
              ) : lastfm?.connected ? (
                <div className="space-y-3">
                  <div className="rounded-lg bg-green-500/[0.06] border border-green-500/20 px-4 py-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-xs font-semibold text-green-400">Scrobbling Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Linked as:</span>
                      <a
                        href={`https://www.last.fm/user/${lastfm.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-bold text-white hover:text-red-400 transition"
                      >
                        {lastfm.username}
                        <svg className="inline-block ml-1 h-3 w-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                    <p className="text-[11px] text-muted-foreground/70">Tracks you listen to will automatically be scrobbled to your Last.fm profile.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button disabled className="rounded-lg bg-red-500/20 border border-red-500/30 px-4 py-1.5 text-xs font-semibold text-red-300 opacity-40 cursor-not-allowed transition">
                      Connect Last.fm
                    </button>
                    <button
                      onClick={lastfmLogout}
                      disabled={lastfmLoggingOut}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition"
                    >
                      {lastfmLoggingOut ? "Disconnecting..." : "Disconnect"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Connect your Last.fm account to automatically scrobble tracks you listen to.</p>
                  <button
                    onClick={lastfmLogin}
                    disabled={lastfmLoggingIn}
                    className="rounded-lg bg-red-500/20 border border-red-500/30 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/30 hover:scale-105 hover:shadow-md disabled:opacity-40 disabled:hover:scale-100 transition-all duration-300 ease-out"
                  >
                    {lastfmLoggingIn ? "Opening..." : "Connect Last.fm"}
                  </button>
                </div>
              )}
            </div>

            </div>
          </div>
          </>
        )}

        {activeTab === "lastfm" && lastfm?.connected && (
          <div className="space-y-5">
            {lastfmProfileLoading ? (
              <div className="glass-card rounded-2xl p-8 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
              </div>
            ) : lastfmProfile ? (
              <>
                {/* Profile header */}
                <div className="glass-card rounded-2xl p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    {lastfmProfile.image ? (
                      <img
                        src={lastfmProfile.image}
                        alt={lastfmProfile.username}
                        className="w-16 h-16 rounded-full ring-2 ring-red-500/30 object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-xl font-bold text-red-400 shrink-0">
                        {lastfmProfile.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="text-center sm:text-left flex-1 min-w-0">
                      <a
                        href={lastfmProfile.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-bold text-white hover:text-red-400 transition"
                      >
                        {lastfmProfile.username}
                        <svg className="inline-block ml-1.5 h-3.5 w-3.5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                      {lastfmProfile.realname && (
                        <p className="text-xs text-muted-foreground mt-0.5">{lastfmProfile.realname}</p>
                      )}
                      {lastfmProfile.registeredAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Scrobbling since {new Date(lastfmProfile.registeredAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Last.fm stat cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="glass-card rounded-xl p-3.5">
                    <div className="flex items-center gap-1.5">
                      <FiMusic className="w-3 h-3 text-muted-foreground/60" />
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Scrobbles</p>
                    </div>
                    <p className="text-lg font-bold text-foreground mt-0.5">{lastfmProfile.playcount.toLocaleString()}</p>
                  </div>
                  <div className="glass-card rounded-xl p-3.5">
                    <div className="flex items-center gap-1.5">
                      <FiUsers className="w-3 h-3 text-muted-foreground/60" />
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Artists</p>
                    </div>
                    <p className="text-lg font-bold text-foreground mt-0.5">{lastfmProfile.artistCount.toLocaleString()}</p>
                  </div>
                  <div className="glass-card rounded-xl p-3.5">
                    <div className="flex items-center gap-1.5">
                      <FiHeart className="w-3 h-3 text-muted-foreground/60" />
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Loved Tracks</p>
                    </div>
                    <p className="text-lg font-bold text-foreground mt-0.5">{lastfmProfile.lovedCount.toLocaleString()}</p>
                  </div>
                  <div className="glass-card rounded-xl p-3.5">
                    <div className="flex items-center gap-1.5">
                      <FiDisc className="w-3 h-3 text-muted-foreground/60" />
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Albums</p>
                    </div>
                    <p className="text-lg font-bold text-foreground mt-0.5">{lastfmProfile.albumCount.toLocaleString()}</p>
                  </div>
                </div>

                {/* Top Artists / Albums / Tracks (last 7 days) */}
                <div className="grid md:grid-cols-3 gap-4">
                  <LastfmTopList title="Top Artists (7d)" items={lastfmProfile.topArtists} isArtist />
                  <LastfmTopList title="Top Albums (7d)" items={lastfmProfile.topAlbums} />
                  <LastfmTopList title="Top Tracks (7d)" items={lastfmProfile.topTracks} />
                </div>
              </>
            ) : (
              <div className="glass-card rounded-2xl p-6 text-center">
                <p className="text-sm text-muted-foreground">Unable to load Last.fm profile data.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "premium" && (
          <div className="space-y-5">
            {premiumLoading ? (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-12 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : !premiumUserStatus?.web3 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="h-14 w-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
                    <FiZap className="h-7 w-7 text-yellow-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">No Premium Subscription</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
                    Purchase premium via Web3 on the <a href="/premium" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors">Premium page</a> to unlock features for your servers.
                  </p>
                </div>
              </div>
            ) : (() => {
              const web3 = premiumUserStatus.web3;
              const totalQuota = web3.computedQuota;
              const usedQuota = web3.usedQuota;
              const availableQuota = totalQuota - usedQuota;
              const redeemedIds = new Set(premiumUserStatus.redeemedGuilds.map((g) => g.id));
              const availableGuilds = (premiumUserStatus?.mutualGuilds ?? []).filter((g) => !redeemedIds.has(g.id));
              const activeSubs = web3.subscriptions.filter(s => s.status === "active");
              const expiredSubs = web3.subscriptions.filter(s => s.status === "expired");

              return (
                <>
                  {/* Quota Overview */}
                  <div className="rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.06] to-transparent p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Web3 Premium</h3>
                        <p className="text-xs text-muted-foreground">
                          {activeSubs.length} active subscription{activeSubs.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 text-center">
                        <p className="text-lg font-bold text-white">{totalQuota}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Total</p>
                      </div>
                      <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 text-center">
                        <p className="text-lg font-bold text-emerald-400">{usedQuota}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Used</p>
                      </div>
                      <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 text-center">
                        <p className={`text-lg font-bold ${availableQuota > 0 ? "text-white" : "text-red-400"}`}>{availableQuota}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Available</p>
                      </div>
                    </div>

                    <div className="w-full h-2 rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                        style={{ width: `${totalQuota > 0 ? Math.min(100, (usedQuota / totalQuota) * 100) : 0}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-muted-foreground mt-3">
                      <span className="text-emerald-400/70">Quota</span> = number of servers you can activate premium on. Claim a server to use a slot, unclaim to free it up.
                    </p>
                  </div>

                  {/* Active Subscriptions */}
                  {activeSubs.length > 0 && (
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Active Subscriptions</h4>
                      <div className="space-y-2">
                        {activeSubs.map((sub) => (
                          <div key={sub.txHash} className="flex items-center justify-between rounded-xl bg-emerald-500/[0.04] border border-emerald-500/15 px-4 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                                <FiZap className="h-4 w-4 text-emerald-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-white">
                                  {sub.tier.replace("guild_", "").replace(/^\w/, c => c.toUpperCase())}
                                  <span className="text-emerald-400 ml-1.5">+{sub.quotaValue} server{sub.quotaValue !== 1 ? "s" : ""}</span>
                                </p>
                                <p className="text-[10px] text-muted-foreground">Expires {new Date(sub.expiredAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 shrink-0">Active</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expired Subscriptions */}
                  {expiredSubs.length > 0 && (
                    <details className="group">
                      <summary className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 cursor-pointer select-none flex items-center gap-1.5 hover:text-muted-foreground/80 transition-colors">
                        <svg className="h-3.5 w-3.5 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        Expired Subscriptions ({expiredSubs.length})
                      </summary>
                      <div className="space-y-2 mt-2.5">
                        {expiredSubs.map((sub) => (
                          <div key={sub.txHash} className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/[0.06] px-4 py-3 opacity-50">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-8 w-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
                                <FiZap className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-white">
                                  {sub.tier.replace("guild_", "").replace(/^\w/, c => c.toUpperCase())}
                                  <span className="text-muted-foreground ml-1.5">+{sub.quotaValue} server{sub.quotaValue !== 1 ? "s" : ""}</span>
                                </p>
                                <p className="text-[10px] text-muted-foreground">Expired {new Date(sub.expiredAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 shrink-0">Expired</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Your Servers */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Servers</h4>
                      <span className="text-[11px] text-muted-foreground">
                        {premiumUserStatus.redeemedGuilds.length + availableGuilds.length} server{(premiumUserStatus.redeemedGuilds.length + availableGuilds.length) !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {premiumUserStatus.redeemedGuilds.length === 0 && availableGuilds.length === 0 ? (
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
                        <FiServer className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No mutual servers found.</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Add the bot to a server first.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {premiumUserStatus.redeemedGuilds.map((g) => {
                          const mutual = premiumUserStatus.mutualGuilds.find(m => m.id === g.id);
                          return (
                            <div
                              key={g.id}
                              className="group relative flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3 transition-all hover:bg-emerald-500/[0.07]"
                            >
                              {mutual?.icon ? (
                                <img src={mutual.icon} alt={g.name} className="h-9 w-9 rounded-full shrink-0" />
                              ) : (
                                <div className="h-9 w-9 rounded-full bg-emerald-500/15 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
                                  {g.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-white truncate">{g.name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                                    <FiZap className="h-2.5 w-2.5" /> Premium Active
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => requestUnclaim(g.id, g.name, g.platform)}
                                disabled={unclaimingGuild === g.id}
                                className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition shrink-0"
                              >
                                {unclaimingGuild === g.id ? (
                                  <div className="w-3 h-3 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                                ) : (
                                  <FiX className="h-3 w-3" />
                                )}
                                Unclaim
                              </button>
                            </div>
                          );
                        })}

                        {availableGuilds.map((g) => (
                          <div
                            key={g.id}
                            className="group relative flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-all hover:bg-white/[0.04]"
                          >
                            {g.icon ? (
                              <img src={g.icon} alt={g.name} className="h-9 w-9 rounded-full shrink-0" />
                            ) : (
                              <div className="h-9 w-9 rounded-full bg-white/[0.08] flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                                {g.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-white truncate">{g.name}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">No premium</p>
                            </div>
                            <button
                              onClick={() => requestClaim(g.id, g.name)}
                              disabled={availableQuota <= 0 || claimingGuild === g.id}
                              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 transition shrink-0"
                            >
                              {claimingGuild === g.id ? (
                                <div className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                              ) : (
                                <FiZap className="h-3 w-3" />
                              )}
                              Claim
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {availableQuota <= 0 && availableGuilds.length > 0 && (
                      <p className="text-xs text-amber-400/80 px-1">
                        No quota available. Unclaim a server or <a href="/premium" className="underline underline-offset-2 hover:text-amber-300 transition-colors">upgrade your plan</a> to claim more.
                      </p>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {activeTab === "wallet" && (
          <WalletSection />
        )}

        </section>
      </main>

      {/* Confirmation Dialog for Claim/Unclaim */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent className="border-white/10 bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "claim" ? "Claim Premium" : "Unclaim Premium"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "claim"
                ? `Are you sure you want to activate premium on "${confirmAction?.guildName || confirmAction?.guildId}"? This will use 1 of your available server slots.`
                : `Are you sure you want to remove premium from "${confirmAction?.guildName || confirmAction?.guildId}"? The server will lose premium features.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirmAction?.type === "claim"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"}
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.type === "claim") {
                  handleClaim(confirmAction.guildId);
                } else {
                  handleUnclaim(confirmAction.guildId, confirmAction.platform || "web3");
                }
                setConfirmAction(null);
              }}
            >
              {confirmAction?.type === "claim" ? "Yes, Claim" : "Yes, Unclaim"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}

function WalletSection() {
  const {
    address,
    isConnected,
    isBound,
    boundAddress,
    isCorrectChain,
    isBinding,
    isLoadingBinding,
    isCooldownActive,
    walletChangeAvailableAt,
    connectWallet,
    switchToSomnia,
    bindWallet,
    unbindCurrentWallet,
    loadBinding,
  } = useWallet();

  const [showChangeConfirm, setShowChangeConfirm] = useState(false);
  const [cooldownText, setCooldownText] = useState("");

  const copyAddress = () => {
    if (boundAddress) {
      navigator.clipboard.writeText(boundAddress);
      toast.success("Wallet address copied!");
    }
  };

  // Cooldown countdown timer
  useEffect(() => {
    if (!walletChangeAvailableAt || walletChangeAvailableAt <= Date.now()) {
      setCooldownText("");
      return;
    }
    const update = () => {
      const remaining = walletChangeAvailableAt - Date.now();
      if (remaining <= 0) { setCooldownText(""); return; }
      const days = Math.floor(remaining / 86400000);
      const hours = Math.floor((remaining % 86400000) / 3600000);
      const mins = Math.floor((remaining % 3600000) / 60000);
      if (days > 0) setCooldownText(`${days}d ${hours}h`);
      else if (hours > 0) setCooldownText(`${hours}h ${mins}m`);
      else setCooldownText(`${mins}m`);
    };
    update();
    const iv = setInterval(update, 60000);
    return () => clearInterval(iv);
  }, [walletChangeAvailableAt]);

  // After user confirms change: unbind and reset to initial state
  const handleConfirmChange = async () => {
    setShowChangeConfirm(false);
    await unbindCurrentWallet();
  };

  // Loading state
  if (isLoadingBinding) {
    return (
      <div className="space-y-6">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  // ── ALREADY BOUND: Show address + copy + Change Wallet ──
  if (isBound && boundAddress) {
    return (
      <div className="space-y-6">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-400" />
            Wallet
          </h3>
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground mb-0.5">Bound Wallet</p>
              <p className="text-sm font-mono text-emerald-400 truncate">{boundAddress}</p>
            </div>
            <button
              onClick={copyAddress}
              className="shrink-0 ml-3 h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
              title="Copy address"
            >
              <FiCopy className="h-3.5 w-3.5" />
              Copy
            </button>
          </div>

          {/* Change Wallet */}
          <div className="mt-4">
            <button
              onClick={() => setShowChangeConfirm(true)}
              disabled={isCooldownActive || isBinding}
              className="text-xs text-muted-foreground hover:text-pink-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Change Wallet
            </button>
            {isCooldownActive && cooldownText && (
              <p className="text-[11px] text-white/25 mt-1">
                You can change wallet in {cooldownText}
              </p>
            )}
          </div>
        </div>

        {/* Change Wallet Confirmation Dialog */}
        {showChangeConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="glass-card rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold text-foreground mb-3">Change Wallet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to change your wallet? You will not be able to change again for <span className="text-pink-400 font-semibold">7 days</span>.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowChangeConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-white/60 hover:bg-white/[0.06] transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmChange}
                  disabled={isBinding}
                  className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-sm font-semibold text-white transition disabled:opacity-50"
                >
                  {isBinding ? "Unbinding..." : "Yes, Change"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── NOT BOUND: Connect + Bind flow ──
  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Wallet className="h-8 w-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">Connect Wallet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Connect and sign to bind your EVM wallet to your Discord account. This is a one-time setup.
          </p>

          {!isConnected ? (
            <button
              onClick={connectWallet}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition"
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </button>
          ) : !isCorrectChain ? (
            <button
              onClick={switchToSomnia}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white font-semibold transition"
            >
              Switch to Somnia Testnet
            </button>
          ) : (
            <button
              onClick={bindWallet}
              disabled={isBinding}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold transition disabled:opacity-50"
            >
              {isBinding ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  <FiLock className="h-4 w-4" />
                  Sign &amp; Bind Wallet
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Why bind your wallet?</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <FiZap className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
            Purchase premium subscriptions on-chain with STT tokens
          </li>
          <li className="flex items-start gap-2">
            <FiHeart className="h-4 w-4 text-pink-400 mt-0.5 shrink-0" />
            Send tips to your favorite Discord servers
          </li>
          <li className="flex items-start gap-2">
            <FiServer className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
            Create tipping contracts for servers you manage
          </li>
        </ul>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="glass-card rounded-xl p-4 hover:scale-[1.02] transition-transform">
      <div className="text-pink-400 mb-2">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function TopList({
  title,
  items,
}: {
  title: string;
  items: {
    name: string;
    count: number;
    artworkUrl?: string | null;
    url?: string | null;
    isArtist: boolean;
  }[];
}) {
  if (items.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">{title}</h3>
        <p className="text-sm text-muted-foreground text-center py-6">No data yet</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-bold text-foreground mb-4">{title}</h3>
      <div className="space-y-1">
        {items.map((item, i) => {
          const content = (
            <>
              <span
                className={`text-xs font-bold w-5 text-right shrink-0 ${
                  i === 0 ? "text-pink-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-500" : "text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <Thumbnail src={item.artworkUrl} name={item.name} isArtist={item.isArtist} />
              <span className="text-sm font-medium text-foreground truncate flex-1 min-w-0">
                {item.name}
              </span>
            </>
          );

          if (item.url) {
            return (
              <a
                key={`${item.name}-${i}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors group"
              >
                {content}
              </a>
            );
          }

          return (
            <div key={`${item.name}-${i}`} className="flex items-center gap-3 p-2.5 rounded-lg">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LastfmTopList({
  title,
  items,
  isArtist,
}: {
  title: string;
  items: LastfmProfileItem[];
  isArtist?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-foreground mb-3">{title}</h3>
        <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-sm font-bold text-foreground mb-3">{title}</h3>
      <div className="space-y-0.5">
        {items.map((item, i) => {
          const inner = (
            <>
              <span
                className={`text-[10px] font-bold w-4 text-right shrink-0 ${
                  i === 0 ? "text-red-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-500" : "text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <Thumbnail src={item.image} name={item.name} isArtist={isArtist} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                {item.artist && (
                  <p className="text-[10px] text-muted-foreground truncate">{item.artist}</p>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground/80 shrink-0 bg-white/5 rounded-md px-1.5 py-0.5">
                {item.playcount.toLocaleString()} <span className="text-muted-foreground/50">plays</span>
              </span>
            </>
          );

          return item.url ? (
            <a
              key={`${item.name}-${i}`}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              {inner}
            </a>
          ) : (
            <div key={`${item.name}-${i}`} className="flex items-center gap-2.5 p-2 rounded-lg">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
