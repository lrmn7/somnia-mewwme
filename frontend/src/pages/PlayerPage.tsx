import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MdLyrics } from "react-icons/md";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { usePlayer } from "@/hooks/usePlayer";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { useTrackColor } from "@/hooks/useTrackColor";
import { api } from "@/lib/api";
import type { DashboardView, BotGuild, GuildSettings } from "@/types/player";

import PlayerSidebar from "@/components/dashboard/PlayerSidebar";
import BottomPlayer from "@/components/dashboard/BottomPlayer";
import Queue from "@/components/dashboard/Queue";
import SearchBar from "@/components/dashboard/SearchBar";
import RecommendedSection from "@/components/dashboard/RecommendedSection";
import PersonalRecommendations from "@/components/dashboard/PersonalRecommendations";
import GenreCharts from "@/components/dashboard/GenreCharts";
import CountryCharts from "@/components/dashboard/CountryCharts";
import LikedSongsPanel from "@/components/dashboard/LikedSongsPanel";
import FiltersPanel from "@/components/dashboard/FiltersPanel";
import LyricsView from "@/components/dashboard/LyricsView";
import GuildStatsView from "@/components/dashboard/GuildStatsView";
import GuildSettingsView from "@/components/dashboard/GuildSettingsView";
import PlaylistsView from "@/components/dashboard/PlaylistsView";

import ContractCreation from "@/components/dashboard/ContractCreation";

import RadioView from "@/components/dashboard/RadioView";
import AiChatView from "@/components/dashboard/AiChatView";
import ListeningParty from "@/components/dashboard/ListeningParty";
import type { VoiceMember } from "@/components/dashboard/ListeningParty";

import { motion } from "framer-motion";

const MotionDiv = motion.div as any;

export default function PlayerPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const navigate = useNavigate();
  const { user, status, logout } = useAuth();
  const { socket, connected } = useSocket(guildId || "");
  const { state, controls, refetch } = usePlayer(guildId || "", socket, user?.id);
  const { liked, likedUris, toggle: toggleLike } = useLikedSongs();

  const [activeView, setActiveView] = useState<DashboardView>("player");
  const [likedPanelOpen, setLikedPanelOpen] = useState(false);
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);

  const [guildInfo, setGuildInfo] = useState<BotGuild | null>(null);
  const [inVoice, setInVoice] = useState<boolean | null>(null);
  const [connectingBot, setConnectingBot] = useState(false);
  const [guildDefaultSource, setGuildDefaultSource] = useState<string>("spotify");
  const [guildSourceAccess, setGuildSourceAccess] = useState<
    Record<string, { hasAccess: boolean; requirement: string }> | undefined
  >(undefined);
  const [guildIsPremium, setGuildIsPremium] = useState(false);
  const [voiceMembers, setVoiceMembers] = useState<VoiceMember[]>([]);

  const hasPlayer = !!state;
  const userId = user?.id;

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("dashboard-view-change", { detail: activeView }));
    return () => {
      window.dispatchEvent(new CustomEvent("dashboard-view-change", { detail: null }));
    };
  }, [activeView]);

  useEffect(() => {
    if (status === "unauthenticated") {
      navigate("/login");
    }
  }, [status, navigate]);

  useEffect(() => {
    if (!guildId || status !== "authenticated") return;
    api
      .get<BotGuild[]>("/api/guilds")
      .then(({ data }) => {
        const g = data.find((g) => g.id === guildId);
        if (g) setGuildInfo(g);
      })
      .catch(() => {});
    api
      .get<GuildSettings>(`/api/guild/${guildId}/settings`)
      .then(({ data }) => {
        if (data.defaultSource) setGuildDefaultSource(data.defaultSource);
        if (data.sourceAccess) setGuildSourceAccess(data.sourceAccess);
        if (typeof data.isPremium === "boolean") setGuildIsPremium(data.isPremium);
      })
      .catch(() => {});
  }, [guildId, status]);

  const refreshVoice = useCallback(() => {
    if (!guildId || status !== "authenticated") return;
    api
      .get<{ inVoice: boolean }>(`/api/guilds/${guildId}/voice`)
      .then(({ data }) => setInVoice(data.inVoice === true))
      .catch(() => setInVoice(false));
  }, [guildId, status]);

  useEffect(() => {
    if (state?.defaultSource) setGuildDefaultSource(state.defaultSource);
    if (state?.sourceAccess) setGuildSourceAccess(state.sourceAccess);
  }, [state?.defaultSource, state?.sourceAccess]);

  useEffect(() => {
    if (status !== "authenticated") return;
    refreshVoice();
    if (hasPlayer) return;
    const id = setInterval(refreshVoice, 3000);
    return () => clearInterval(id);
  }, [status, refreshVoice, hasPlayer]);

  // Fetch daftar member di Voice Channel bot saat ada player aktif
  useEffect(() => {
    if (!guildId || status !== "authenticated" || !hasPlayer) {
      setVoiceMembers([]);
      return;
    }
    api
      .get<{ members: VoiceMember[] }>(`/api/guilds/${guildId}/voice-members`)
      .then(({ data }) => setVoiceMembers(data.members ?? []))
      .catch(() => setVoiceMembers([]));
  }, [guildId, status, hasPlayer]);

  useEffect(() => {
    if (!socket) return;
    const onPlayerCreate = () => setInVoice(true);
    const onPlayerDestroy = () => {
      refreshVoice();
      setVoiceMembers([]);
    };
    const onMemberJoin = (msg: { userId?: string; username?: string; globalName?: string | null; avatarURL?: string | null; bot?: boolean }) => {
      if (userId && msg.userId === userId) setInVoice(true);
      // Update daftar voice member untuk Listening Party (skip bot)
      if (msg.userId && !msg.bot) {
        setVoiceMembers((prev) => {
          if (prev.some((m) => m.userId === msg.userId)) return prev;
          return [
            ...prev,
            {
              userId: msg.userId!,
              username: msg.username ?? msg.userId!,
              globalName: msg.globalName ?? null,
              avatarURL: msg.avatarURL ?? null,
            },
          ];
        });
      }
    };
    const onMemberLeave = (msg: { userId?: string }) => {
      if (userId && msg.userId === userId) setInVoice(false);
      if (msg.userId) {
        setVoiceMembers((prev) => prev.filter((m) => m.userId !== msg.userId));
      }
    };

    socket.on("playerCreate", onPlayerCreate);
    socket.on("playerDestroy", onPlayerDestroy);
    socket.on("memberJoin", onMemberJoin);
    socket.on("memberLeave", onMemberLeave);
    return () => {
      socket.off("playerCreate", onPlayerCreate);
      socket.off("playerDestroy", onPlayerDestroy);
      socket.off("memberJoin", onMemberJoin);
      socket.off("memberLeave", onMemberLeave);
    };
  }, [socket, refreshVoice, userId]);

  const handleCreatePlayer = useCallback(async () => {
    setConnectingBot(true);
    try {
      await controls.createPlayer();
      setInVoice(true);
      toast.success("Bot has joined your voice channel.");
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error ?? "Failed to connect bot.");
    } finally {
      setConnectingBot(false);
    }
  }, [controls]);

  const handleStop = useCallback(async () => {
    if (state?.member === false) {
      toast.error("Join the bot's voice channel to control the player.");
      return;
    }
    try {
      await controls.stop();
      toast.success("Music stopped. Bot disconnected.");
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error ?? "Failed to stop player.");
    }
  }, [controls, state?.member]);

  const handleSearchAdd = useCallback(
    async (uris: string[]) => {
      if (inVoice === false) {
        toast.error("Join a voice channel first to play music.");
        return;
      }
      if (state?.member === false) {
        toast.error("Join the bot's voice channel to control the player.");
        return;
      }
      if (!state) {
        try {
          await controls.createPlayer();
          setInVoice(true);
          toast.success("Bot has joined your voice channel.");
        } catch (e: unknown) {
          const err = e as { response?: { data?: { error?: string } } };
          toast.error(err?.response?.data?.error ?? "Failed to connect bot.");
          return;
        }
      }
      try {
        await controls.addToQueue(uris);
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } } };
        toast.error(err?.response?.data?.error ?? "Failed to add track to queue.");
      }
    },
    [inVoice, state, controls]
  );

  const handleQueueRemove = useCallback(
    async (index: number) => {
      if (state?.member === false) {
        toast.error("Join the bot's voice channel to control the player.");
        return;
      }
      try {
        await controls.removeFromQueue(index);
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } } };
        toast.error(err?.response?.data?.error ?? "Failed to remove track.");
      }
    },
    [controls, state?.member]
  );

  const handleQueuePlayNow = useCallback(
    async (index: number) => {
      if (state?.member === false) {
        toast.error("Join the bot's voice channel to control the player.");
        return;
      }
      try {
        await controls.skipToIndex(index);
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } } };
        toast.error(err?.response?.data?.error ?? "Failed to play track.");
      }
    },
    [controls, state?.member]
  );

  const handleQueueReorder = useCallback(
    async (from: number, to: number) => {
      if (state?.member === false) {
        toast.error("Join the bot's voice channel to control the player.");
        return;
      }
      try {
        await controls.moveInQueue(from, to);
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } } };
        toast.error(err?.response?.data?.error ?? "Failed to reorder queue.");
      }
    },
    [controls, state?.member]
  );

  const currentTrack = state?.current;
  const thumb = currentTrack?.thumbnail;
  const trackColor = useTrackColor(thumb);

  useEffect(() => {
    document.documentElement.style.setProperty("--track-color", trackColor);
    return () => { document.documentElement.style.removeProperty("--track-color"); };
  }, [trackColor]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  const notInVoice = state?.member === false;
  const isCurrentLiked = currentTrack ? likedUris.has(currentTrack.uri) : false;

  const guildIconUrl = guildInfo?.iconUrl
    ? guildInfo.iconUrl
    : guildInfo?.icon
    ? `https://cdn.discordapp.com/icons/${guildInfo.id}/${guildInfo.icon}.webp?size=128`
    : null;

  const renderActiveView = () => {
    switch (activeView) {
      case "guild-stats":
        return <GuildStatsView guildId={guildId || ""} />;
      case "settings":
        return (
          <div className="flex flex-col gap-6">
            <GuildSettingsView guildId={guildId || ""} />
            <div className="px-4 sm:px-6 space-y-4">
              <h2 className="text-lg font-bold text-white">Web3 Settings</h2>
              <ContractCreation guildId={guildId || ""} />
            </div>
          </div>
        );
      case "playlists":
        return <PlaylistsView guildId={guildId || ""} onPlayStarted={() => setActiveView("player")} />;
      case "radio":
        return (
          <RadioView
            guildId={guildId || ""}
            hasPlayer={hasPlayer}
            inVoice={inVoice}
          />
        );
      case "ai-chat":
        return (
          <AiChatView
            guildId={guildId || ""}
            onAddToQueue={handleSearchAdd}
            hasPlayer={hasPlayer}
            inVoice={inVoice}
          />
        );
      case "player":
      default:
        return (
          <div className={`flex flex-col ${state ? "pb-28" : ""}`}>
            {!state ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-6 py-32 px-4">
                <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-white/[0.03] border border-white/[0.08] text-5xl backdrop-blur-sm">
                  🎵
                </div>
                <div className="text-center max-w-sm">
                  <p className="text-xl font-bold text-white">Nothing playing</p>
                  <p className="mt-2 text-sm text-white/40">
                    {inVoice === false
                      ? `Join a voice channel in ${guildInfo?.name ?? "this server"} to get started.`
                      : inVoice === true
                      ? "Connect the bot to your voice channel to begin."
                      : "Search for a song or pick from the charts to get started."}
                  </p>
                </div>

                {/* Connect Bot button shown when user is in voice but no player */}
                {inVoice === true && (
                  <button
                    onClick={handleCreatePlayer}
                    disabled={connectingBot}
                    className="flex items-center gap-2.5 rounded-full bg-green-500 px-8 py-3 text-sm font-bold text-black hover:bg-green-400 transition-all active:scale-95 shadow-lg shadow-green-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {connectingBot ? (
                      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3C6.48 3 2 7.48 2 13c0 2.94 1.29 5.58 3.33 7.39L4 22l2.5-1.01C8.28 22.26 10.07 23 12 23c5.52 0 10-4.48 10-10S17.52 3 12 3zm-1 14h-2v-2h2v2zm0-4h-2V7h2v6z" />
                      </svg>
                    )}
                    {connectingBot ? "Connecting…" : "Connect Bot"}
                  </button>
                )}

                {/* Not in voice */}
                {inVoice === false && (
                  <div className="flex items-center gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/[0.08] px-4 py-2.5 text-xs text-yellow-400">
                    <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Please join a voice channel to play tracks.
                  </div>
                )}

                {/* Checking voice status */}
                {inVoice === null && (
                  <p className="text-xs text-white/40 animate-pulse">Checking voice status…</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col p-4 sm:p-6 gap-6 sm:gap-8">
                {/* Recommended Chart */}
                <RecommendedSection
                  onAddToQueue={async (uris) => {
                    await handleSearchAdd(uris);
                  }}
                />

                {/* Genre Charts */}
                <GenreCharts
                  onAddToQueue={async (uris) => {
                    await handleSearchAdd(uris);
                  }}
                />

                {/* Country Top Tracks */}
                <CountryCharts
                  onAddToQueue={async (uris) => {
                    await handleSearchAdd(uris);
                  }}
                />

                {/* Personal Recommendations */}
                <PersonalRecommendations
                  currentTrack={currentTrack ? { title: currentTrack.title, author: currentTrack.author, uri: currentTrack.uri } : null}
                  onAddToQueue={async (uris) => {
                    await handleSearchAdd(uris);
                  }}
                />

                {/* Queue section */}
                {(state.queue?.length > 0 || currentTrack) && (
                  <section className="flex flex-col gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-0.5 h-5 rounded-full bg-rose-500 shrink-0" />
                      <h2 className="text-xl sm:text-2xl font-extrabold text-white">Up Next</h2>
                      {state.queue.length > 0 && (
                        <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/40">
                          {state.queue.length} {state.queue.length === 1 ? "track" : "tracks"}
                        </span>
                      )}
                      <div className="ml-auto">
                        <ListeningParty members={voiceMembers} />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden backdrop-blur-sm flex flex-col sm:max-h-[60vh]">
                      <Queue
                        current={currentTrack || null}
                        queue={state?.queue || []}
                        onSkipTo={handleQueuePlayNow}
                        onRemove={handleQueueRemove}
                        onReorder={handleQueueReorder}
                      />
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen text-white">
      {thumb && (
        <div
          className="pointer-events-none fixed inset-0 z-0 opacity-15 transition-all duration-1000"
          style={{
            backgroundImage: `url(${thumb})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(100px) saturate(2.5)",
          }}
        />
      )}

      {/* Sidebar */}
      <PlayerSidebar
        activeView={activeView}
        onViewChange={setActiveView}
        onLikedSongsOpen={() => setLikedPanelOpen(true)}
        likedCount={liked.length}

        user={user}
        onLogout={logout}
        guildName={guildInfo?.name}
        guildIcon={guildIconUrl}
        connected={connected}
        isPremium={state?.isPremium === true || guildIsPremium}
      />
      <header className="fixed top-3 left-3 right-3 sm:left-auto z-30 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-end gap-2 px-4 py-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md">
        {/* Row 1 on mobile: searchbar full width; inline on desktop */}
        <div className="w-full sm:w-auto sm:flex-none sm:w-64 md:w-80">
          <SearchBar
            onAddToQueue={handleSearchAdd}
            disabled={inVoice === false || !state || state?.member === false}
            defaultSource={guildDefaultSource}
            sourceAccess={guildSourceAccess}
            guildId={guildId}
          />
        </div>

        {/* Row 2 on mobile: action buttons right-aligned; inline on desktop */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Connection status */}
          <div className="flex shrink-0 items-center gap-1.5 text-xs font-bold">
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-400" : "bg-red-500"}`} />
            <span className={connected ? "text-green-400 hidden sm:inline" : "text-red-400 hidden sm:inline"}>
              {connected ? "Connected" : "Connecting…"}
            </span>
          </div>

          {/* Voice warning: user not in ANY voice channel */}
          {inVoice === false && (
            <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-yellow-500/20 bg-yellow-500/[0.08] px-2 py-1.5 text-[10px] text-yellow-400">
              <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Join voice first</span>
            </div>
          )}

          {/* Voice warning: user in voice but NOT in bot's channel */}
          {inVoice === true && state?.member === false && (
            <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-orange-500/20 bg-orange-500/[0.08] px-2 py-1.5 text-[10px] text-orange-400">
              <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Bot in different channel</span>
            </div>
          )}

          {/* Lyrics button */}
          <button
            onClick={() => setLyricsOpen(true)}
            disabled={!currentTrack}
            title={currentTrack ? "Open live lyrics" : "No track playing"}
            className="btn-glow relative flex shrink-0 items-center gap-1.5 overflow-hidden rounded-xl border border-white/10 bg-white/[0.08] backdrop-blur-md px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/[0.15] hover:border-white/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="btn-shimmer pointer-events-none absolute inset-0 w-2/5 bg-gradient-to-r from-transparent via-white/45 to-transparent" />
            <MdLyrics className="h-4 w-4 relative z-10" />
            <span className="relative z-10">Live Lyrics</span>
          </button>

          {/* Stop button */}
          {state && (
            <button
              onClick={handleStop}
              disabled={state?.member === false}
              title={state?.member === false ? "Join the bot's voice channel to stop the player" : "Stop player & disconnect bot"}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-bold text-white transition ${
                state?.member === false
                  ? "border-red-600/40 bg-red-600/40 opacity-50 cursor-not-allowed"
                  : "border-red-600 bg-red-600 hover:bg-red-700 hover:border-red-700"
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z" />
              </svg>
              <span className="hidden sm:inline">Stop Player</span>
            </button>
          )}
        </div>
      </header>
      <main className="relative z-10 flex-1 pt-24 sm:pt-20 md:pl-16 lg:pl-60 flex flex-col">
        <MotionDiv
          key={activeView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col flex-1 min-h-0"
        >
          {renderActiveView()}
        </MotionDiv>
      </main>

      {/* Bottom player bar */}
      {activeView === "player" && state && (
        <BottomPlayer
          playerState={state}
          onPause={controls.pause}
          onSkip={controls.skip}
          onPrevious={controls.previous}
          onSeek={controls.seek}
          onVolumeChange={controls.setVolume}
          onFiltersOpen={() => setFiltersPanelOpen(true)}
          onLyricsOpen={() => setLyricsOpen(true)}
          onShuffle={controls.shuffle}
          onLoop={controls.setLoop}
          onAutoplay={controls.toggleAutoplay}
          isLiked={isCurrentLiked}
          onToggleLike={() => {
            if (currentTrack) {
              toggleLike({
                title: currentTrack.title,
                uri: currentTrack.uri,
                author: currentTrack.author,
                thumbnail: currentTrack.thumbnail,
                length: currentTrack.length,
              });
            }
          }}
          activeFilter={state?.filter || null}
          notInVoice={notInVoice ?? undefined}
        />
      )}

      {/* Liked Songs Panel */}
      <LikedSongsPanel
        open={likedPanelOpen}
        onClose={() => setLikedPanelOpen(false)}
        liked={liked}
        likedUris={likedUris}
        onToggleLike={(track) => toggleLike(track)}
        onPlay={(uri) => handleSearchAdd([uri])}
        onPlayAll={() => {
          if (liked.length > 0) {
            handleSearchAdd(liked.map((t) => t.uri));
          }
        }}
      />

      {/* Filters Panel */}
      <FiltersPanel
        open={filtersPanelOpen}
        onClose={() => setFiltersPanelOpen(false)}
        activeFilter={state?.filter || null}
        hasAccess={state?.hasFilterAccess !== false}
        requirement={state?.filterRequirement}
        voteUrl={state?.voteUrl}
        onApply={async (preset) => {
          await controls.setFilter(preset);
        }}
        onClear={async () => {
          await controls.clearFilter();
        }}
      />

      {/* Lyrics View */}
      <LyricsView
        open={lyricsOpen}
        onClose={() => setLyricsOpen(false)}
        guildId={guildId || ""}
        playerState={state}
        controls={{
          skip: controls.skip,
          previous: controls.previous,
          pause: controls.pause,
          setLoop: controls.setLoop,
          shuffle: controls.shuffle,
          seek: controls.seek,
          setVolume: controls.setVolume,
        }}
        likedUris={likedUris}
        onToggleLike={(track) => toggleLike({
          title: track.title,
          uri: track.uri,
          author: track.author,
          thumbnail: track.thumbnail,
          length: track.length,
        })}
        notInVoice={notInVoice ?? undefined}
      />
    </div>
  );
}
