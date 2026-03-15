import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import type { PlayerState, Track, LoopMode, LyricsData, SyncedLine } from "@/types/player";

const MotionDiv = motion.div as any;

function fmtMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

type Controls = {
  skip: () => void;
  previous: () => void;
  pause: (value: boolean) => void;
  setLoop: (mode: LoopMode) => void;
  shuffle: () => void;
  seek: (ms: number) => void;
  setVolume: (vol: number) => void;
};

interface Props {
  open: boolean;
  onClose: () => void;
  guildId: string;
  playerState: PlayerState | null;
  controls: Controls;
  likedUris: Set<string>;
  onToggleLike: (track: Track) => void;
  notInVoice?: boolean;
}

export default function LyricsView({
  open,
  onClose,
  guildId,
  playerState,
  controls,
  likedUris,
  onToggleLike,
  notInVoice = false,
}: Props) {
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastFetchedUri = useRef<string | null>(null);
  const [seekDragging, setSeekDragging] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const prevLineIndex = useRef(-1);

  const current = playerState?.current ?? null;
  const pause = playerState?.pause ?? true;
  const loop = playerState?.loop ?? "none";
  const position = playerState?.position ?? 0;
  const volume = playerState?.volume ?? 100;

  const positionAnchor = useRef<{ pos: number; at: number }>({
    pos: position,
    at: performance.now(),
  });

  useEffect(() => {
    positionAnchor.current = { pos: position, at: performance.now() };
  }, [position]);

  const [livePos, setLivePos] = useState(position);
  const rafRef = useRef<number>(0);
  const duration = current?.length ?? 1;

  useEffect(() => {
    if (!open) return;
    const tick = () => {
      if (document.visibilityState === "visible" && !pause) {
        const elapsed = performance.now() - positionAnchor.current.at;
        const interpolated = Math.min(positionAnchor.current.pos + elapsed, duration);
        setLivePos(interpolated);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [pause, duration, open]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        positionAnchor.current = { pos: position, at: performance.now() };
        setLivePos(position);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [position]);

  useEffect(() => {
    const uri = current?.uri ?? null;
    if (!open || !uri || lastFetchedUri.current === uri) return;
    lastFetchedUri.current = uri;
    setLoading(true);
    setFetchError(null);
    setLyricsData(null);

    api
      .get<LyricsData>(`/api/player/${guildId}/lyrics`)
      .then(({ data }) => {
        if (data.error) {
          setFetchError(data.error);
        } else {
          setLyricsData(data);
        }
        setLoading(false);
      })
      .catch((e: { response?: { data?: { error?: string } } }) => {
        setFetchError(e?.response?.data?.error ?? "Could not load lyrics.");
        setLoading(false);
      });
  }, [open, guildId, current?.uri]);

  useEffect(() => {
    if (!open) lastFetchedUri.current = null;
  }, [open]);

  const hasSynced = Array.isArray(lyricsData?.syncedLyrics) && lyricsData!.syncedLyrics!.length > 0;
  const syncedLines: SyncedLine[] = hasSynced ? lyricsData!.syncedLyrics! : [];

  const plainLines = (lyricsData?.plainLyrics ?? "").split("\n").map((l) => l.trim());

  const lines: string[] = hasSynced
    ? syncedLines.map((l) => l.text).filter((t) => t.length > 0)
    : plainLines.filter((l) => l.length > 0);

  let _di = -1;
  const syncedDisplayIndices: number[] = syncedLines.map((l) =>
    l.text.length > 0 ? ++_di : -1
  );

  let currentLineIndex = -1;
  if (hasSynced && syncedLines.length > 0) {
    const activeRawIdx = syncedLines.reduce(
      (best, line, i) => (line.time * 1000 <= livePos ? i : best),
      -1
    );
    if (activeRawIdx >= 0) {
      for (let i = activeRawIdx; i >= 0; i--) {
        if (syncedDisplayIndices[i] !== -1) {
          currentLineIndex = syncedDisplayIndices[i];
          break;
        }
      }
    }
  } else if (!hasSynced && lines.length > 0) {
    currentLineIndex = Math.min(
      Math.floor((livePos / duration) * lines.length),
      lines.length - 1
    );
  }

  if (hasSynced && syncedLines.length > 0 && currentLineIndex === lines.length - 1) {
    const lastRawMs = syncedLines[syncedLines.length - 1].time * 1000;
    const hiddenAfterMs = Math.min(lastRawMs + 3_000, duration);
    if (livePos >= hiddenAfterMs) currentLineIndex = lines.length;
  }

  // When switching from auto→manual, scroll to the current line once
  useEffect(() => {
    if (autoScroll) return;
    // Brief delay to let the manual-mode DOM mount
    const timer = setTimeout(() => {
      const el = lineRefs.current[currentLineIndex];
      const container = scrollContainerRef.current;
      if (el && container) {
        const elRect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const offset = elRect.top - containerRect.top + container.scrollTop - container.clientHeight / 2 + elRect.height / 2;
        container.scrollTo({ top: offset, behavior: "smooth" });
      }
    }, 50);
    return () => clearTimeout(timer);
    // Only run when autoScroll toggles off, not on every line change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScroll]);

  // Reset to auto mode when track changes or lyrics panel opens
  useEffect(() => {
    setAutoScroll(true);
    prevLineIndex.current = -1;
  }, [current?.uri, open]);

  const seekPos = seekDragging ? seekValue : livePos;
  const seekPercent = duration > 0 ? (seekPos / duration) * 100 : 0;

  const handleSeekChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSeekValue(Number(e.target.value)),
    []
  );
  const handleSeekPointerDown = useCallback(() => {
    setSeekDragging(true);
    setSeekValue(livePos);
  }, [livePos]);
  const handleSeekPointerUp = useCallback(
    (e: React.PointerEvent<HTMLInputElement>) => {
      setSeekDragging(false);
      if (!notInVoice) controls.seek(Number((e.target as HTMLInputElement).value));
    },
    [controls, notInVoice]
  );

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!notInVoice) controls.setVolume(Number(e.target.value));
    },
    [controls, notInVoice]
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const artwork = current?.thumbnail ?? null;
  const liked = current ? likedUris.has(current.uri) : false;

  function LoopIcon() {
    const active = loop !== "none";
    const color = active ? "text-green-400" : "text-white/60";
    return (
      <button
        onClick={() => {
          if (notInVoice) return;
          controls.setLoop(loop === "none" ? "song" : loop === "song" ? "queue" : "none");
        }}
        disabled={notInVoice}
        title={loop === "none" ? "Loop off" : loop === "song" ? "Loop song" : "Loop queue"}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed ${color}`}
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          {loop === "song" ? (
            <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z" />
          ) : (
            <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
          )}
        </svg>
        {loop === "queue" && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-400" />
        )}
      </button>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <MotionDiv
            key="lyrics-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="fixed inset-0 z-[9999]"
            style={{
              background: "rgba(0, 0, 0, 0.3)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
            }}
          />
          <MotionDiv
            key="lyrics-content"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-0 z-[10000] overflow-hidden"
          >
          <div className="relative flex flex-col md:flex-row h-full w-full max-w-[1400px] mx-auto overflow-hidden">
            <div className="hidden md:flex relative flex-col items-center justify-center w-full md:w-[420px] lg:w-[480px] shrink-0 px-8 py-8 lg:px-12 lg:py-10 gap-6">
              <div className="w-full max-w-[340px] md:max-w-full aspect-square rounded-3xl overflow-hidden shadow-2xl shadow-black/70 border border-white/10 bg-white/5">
                {artwork ? (
                  <img src={artwork} alt={current?.title ?? "Album art"} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="h-20 w-20 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Track meta + like */}
              <div className="flex w-full items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-extrabold text-white leading-tight">
                    {current?.title ?? "\u2014"}
                  </p>
                  <p className="truncate text-sm text-white/55 mt-1">
                    {current?.author ?? "\u2014"}
                  </p>
                </div>
                {current && (
                  <button
                    onClick={() => onToggleLike(current)}
                    title={liked ? "Unlike" : "Like"}
                    className={`shrink-0 transition-transform active:scale-90 ${liked ? "text-pink-400" : "text-white/40 hover:text-white/70"}`}
                  >
                    <svg className="h-6 w-6" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Seek bar */}
              <div className="w-full flex flex-col gap-1.5">
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={500}
                  value={seekPos}
                  disabled={notInVoice}
                  onChange={handleSeekChange}
                  onPointerDown={handleSeekPointerDown}
                  onPointerUp={handleSeekPointerUp}
                  style={{ "--seek-pct": `${seekPercent}%` } as React.CSSProperties}
                  className="lyrics-seek-bar w-full h-1 appearance-none rounded-full outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="flex justify-between">
                  <span className="text-[11px] text-white/45 tabular-nums">{fmtMs(seekPos)}</span>
                  <span className="text-[11px] text-white/45 tabular-nums">{fmtMs(duration)}</span>
                </div>
              </div>

              {/* Controls row */}
              <div className="flex items-center justify-between w-full px-2">
                {/* Shuffle */}
                <button
                  onClick={() => { if (!notInVoice) controls.shuffle(); }}
                  disabled={notInVoice}
                  title="Shuffle"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zm4.76-.99l1.65 1.65-2 2 1.41 1.41 2-2 1.65 1.65V7h-4.71zm.7 10.05l-9.17-9.17L5.41 10.5 14.58 19.67l-1.65 1.65H17v-4.71l-1.65 1.65zM19 7h-4.71l1.65 1.65-2 2 1.42 1.41 2-2 1.65 1.65V7z" />
                  </svg>
                </button>

                {/* Previous */}
                <button
                  onClick={() => { if (!notInVoice) controls.previous(); }}
                  disabled={notInVoice}
                  title="Previous"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                  </svg>
                </button>

                {/* Play / Pause */}
                <button
                  onClick={() => { if (!notInVoice) controls.pause(!pause); }}
                  disabled={notInVoice}
                  title={pause ? "Resume" : "Pause"}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-lg shadow-black/40 transition hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {pause ? (
                    <svg className="h-7 w-7 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  ) : (
                    <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  )}
                </button>

                {/* Skip */}
                <button
                  onClick={() => { if (!notInVoice) controls.skip(); }}
                  disabled={notInVoice}
                  title="Skip"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z" />
                  </svg>
                </button>

                {/* Loop */}
                <LoopIcon />
              </div>

              {/* Volume */}
              <div className="flex items-center gap-3 w-full px-1">
                <svg className="h-4 w-4 shrink-0 text-white/40" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  disabled={notInVoice}
                  onChange={handleVolumeChange}
                  className="lyrics-volume-bar flex-1 h-1 appearance-none rounded-full outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ "--vol-pct": `${volume}%` } as React.CSSProperties}
                />
                <svg className="h-5 w-5 shrink-0 text-white/40" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              </div>
            </div>
            <div className="relative flex-1 flex flex-col overflow-hidden">

              {/* ── Auto mode: current line at top, past lines hidden ── */}
              {autoScroll && (
                <div className="h-full overflow-hidden pt-40 pb-16 px-8 lg:px-16 pointer-events-none">
                  {loading && (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-white/40">
                      <svg className="h-9 w-9 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <p className="text-base">Loading lyrics...</p>
                    </div>
                  )}

                  {!loading && fetchError && (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-white/30 text-center px-6">
                      <svg className="h-12 w-12" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                      <p className="text-lg font-semibold text-white/40">No lyrics found</p>
                      <p className="text-sm text-white/25">{fetchError}</p>
                    </div>
                  )}

                  {!loading && !fetchError && lines.length === 0 && lyricsData && (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-white/30">
                      <svg className="h-12 w-12" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                      <p className="text-lg font-semibold">No lyrics available</p>
                      <p className="text-sm text-white/20 text-center max-w-xs">
                        This may be an instrumental track or the lyrics haven&apos;t been added to LRCLIB yet.
                      </p>
                    </div>
                  )}

                  {!loading && lines.length > 0 && (
                    <div className="flex flex-col items-start gap-8 pb-40">
                      {lines.map((line, i) => {
                        if (i < currentLineIndex) return null;

                        const dist = i - currentLineIndex;
                        const colourCls =
                          dist === 0
                            ? "text-white"
                            : dist === 1
                            ? "text-white/30"
                            : dist === 2
                            ? "text-white/20"
                            : "text-white/10";
                        return (
                          <p
                            key={i}
                            ref={(el) => { lineRefs.current[i] = el; }}
                            className={`text-4xl lg:text-5xl font-bold leading-tight transition-all duration-500 ease-in-out select-none ${colourCls}`}
                          >
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Manual mode: all lines visible, user scrolls freely ── */}
              {!autoScroll && (
                <div
                  ref={scrollContainerRef}
                  className="h-full px-8 lg:px-16 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  <div className="h-[40vh]" />

                  {loading && (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-white/40">
                      <svg className="h-9 w-9 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <p className="text-base">Loading lyrics...</p>
                    </div>
                  )}

                  {!loading && fetchError && (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-white/30 text-center px-6">
                      <svg className="h-12 w-12" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                      <p className="text-lg font-semibold text-white/40">No lyrics found</p>
                      <p className="text-sm text-white/25">{fetchError}</p>
                    </div>
                  )}

                  {!loading && !fetchError && lines.length === 0 && lyricsData && (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-white/30">
                      <svg className="h-12 w-12" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                      <p className="text-lg font-semibold">No lyrics available</p>
                      <p className="text-sm text-white/20 text-center max-w-xs">
                        This may be an instrumental track or the lyrics haven&apos;t been added to LRCLIB yet.
                      </p>
                    </div>
                  )}

                  {!loading && lines.length > 0 && (
                    <div className="flex flex-col items-start gap-8 pb-[50vh]">
                      {lines.map((line, i) => {
                        const isActive = i === currentLineIndex;
                        const isPast = i < currentLineIndex;
                        const dist = i - currentLineIndex;
                        const colourCls = isActive
                          ? "text-white"
                          : isPast
                          ? "text-white/15"
                          : dist === 1
                          ? "text-white/30"
                          : dist === 2
                          ? "text-white/20"
                          : "text-white/10";
                        return (
                          <p
                            key={i}
                            ref={(el) => { lineRefs.current[i] = el; }}
                            className={`text-4xl lg:text-5xl font-bold leading-tight transition-all duration-500 ease-in-out select-none ${colourCls}`}
                          >
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  )}

                  <div className="h-16" />
                </div>
              )}

              {/* Auto/Manual scroll toggle – below lyrics */}
              {hasSynced && lines.length > 0 && !loading && (
                <div className="shrink-0 flex justify-center py-3 md:-mt-14 md:py-0 px-8 relative z-10">
                  <button
                    onClick={() => setAutoScroll((v) => !v)}
                    title={autoScroll ? "Switch to manual scroll" : "Switch to auto-scroll"}
                    className="flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/20 hover:text-white transition"
                  >
                    {autoScroll ? (
                      <>
                        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                        </svg>
                        Auto
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h2c0-1.66 1.34-3 3-3s3 1.34 3 3v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z" />
                        </svg>
                        Manual
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close lyrics (Esc)"
            className="absolute top-4 right-4 z-10 flex h-[54px] w-[54px] items-center justify-center rounded-full bg-white/10 border border-white/15 text-white/70 hover:bg-white/20 hover:text-white transition backdrop-blur-sm"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Not-in-voice overlay */}
          {notInVoice && (
            <div className="absolute bottom-4 left-4 w-72 pointer-events-none">
              <div className="flex items-center gap-2 rounded-xl bg-black/40 border border-white/10 backdrop-blur-sm px-3 py-2">
                <svg className="h-3.5 w-3.5 text-white/50 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                </svg>
                <p className="text-[10px] text-white/50 leading-snug">
                  Join the bot's voice channel to control playback
                </p>
              </div>
            </div>
          )}
        </MotionDiv>
        </>
      )}
    </AnimatePresence>
  );
}
