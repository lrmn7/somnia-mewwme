import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { usePlayer } from "@/hooks/usePlayer";
import { api } from "@/lib/api";
import type { PlayerState, LoopMode } from "@/types/player";

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

function formatTime(ms: number) {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function isLive(lengthMs: number) {
  return !lengthMs || lengthMs <= 0 || lengthMs >= 86400000;
}

const LOOP_CYCLE: Record<LoopMode, LoopMode> = {
  none: "song",
  song: "queue",
  queue: "none",
};

const LOOP_ICON: Record<LoopMode, string> = {
  none: "Loop Off",
  song: "Loop Track",
  queue: "Loop Queue",
};

export default function BackgroundMusicPlayer() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, status } = useAuth();
  const isPlayerPage = /^\/player\//.test(pathname);
  const [dashboardView, setDashboardView] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeGuildId, setActiveGuildId] = useState<string | null>(null);
  const [side, setSide] = useState<"left" | "right">(() => {
    try { return (localStorage.getItem("bgplayer-side") as "left" | "right") || "right"; } catch { return "right"; }
  });
  const { socket } = useSocket(activeGuildId ?? "");
  const { state: playerState, controls } = usePlayer(
    activeGuildId ?? "",
    socket,
    user?.id
  );

  const toggleSide = useCallback(() => {
    setSide((prev) => {
      const next = prev === "right" ? "left" : "right";
      try { localStorage.setItem("bgplayer-side", next); } catch {}
      return next;
    });
  }, []);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const handler = (e: Event) => setDashboardView((e as CustomEvent).detail);
    window.addEventListener("dashboard-view-change", handler);
    return () => window.removeEventListener("dashboard-view-change", handler);
  }, []);

  const discover = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const res = await api.get("/api/player/active");
      if (res.status === 204 || !res.data?.guildId) {
        setActiveGuildId(null);
      } else {
        setActiveGuildId(res.data.guildId);
      }
    } catch {
      setActiveGuildId(null);
    }
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    discover();

    const interval = activeGuildId ? 15_000 : 5_000;
    pollRef.current = setInterval(discover, interval);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status, activeGuildId, discover]);

  useEffect(() => {
    if (activeGuildId && playerState === null) {
      const t = setTimeout(discover, 1500);
      return () => clearTimeout(t);
    }
  }, [playerState, activeGuildId, discover]);

  useEffect(() => {
    if (activeGuildId && playerState && !playerState.current) {
      const t = setTimeout(discover, 2000);
      return () => clearTimeout(t);
    }
  }, [playerState?.current, activeGuildId, discover]);

  const [displayPos, setDisplayPos] = useState(0);
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef(Date.now());
  const prevTrackUriRef = useRef<string | undefined>(undefined);
  const track = playerState?.current ?? null;
  const paused = playerState?.pause ?? true;
  const duration = track?.length ?? 0;
  const position = playerState?.position ?? 0;

  useEffect(() => {
    const uri = track?.uri;
    if (uri !== prevTrackUriRef.current) {
      prevTrackUriRef.current = uri;
      setDisplayPos(0);
      lastTickRef.current = Date.now();
    }
  }, [track?.uri]);

  useEffect(() => {
    setDisplayPos(position);
    lastTickRef.current = Date.now();
  }, [position]);

  useEffect(() => {
    if (paused || isLive(duration)) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    lastTickRef.current = Date.now();
    const tick = () => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      setDisplayPos((prev) => {
        const next = prev + delta;
        return next > duration ? duration : next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [paused, duration, track?.uri]);

  const pct = duration > 0 ? Math.min((displayPos / duration) * 100, 100) : 0;
  const volume = playerState?.volume ?? 80;
  const hasPlayer = !!playerState && !!track;
  const shouldShow = hasPlayer && (!isPlayerPage || (dashboardView != null && dashboardView !== "player"));

  useEffect(() => {
    if (!shouldShow && isOpen) setIsOpen(false);
  }, [shouldShow, isOpen]);

  if (!shouldShow) return null;

  const loop = playerState?.loop ?? "none";
  const queue = playerState?.queue ?? [];

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <MotionButton
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className={`fixed bottom-20 z-50 flex items-center gap-2.5 rounded-full bg-gradient-to-r from-rose-500/90 to-pink-500/90 pr-4 pl-1.5 py-1.5 shadow-2xl shadow-rose-500/30 backdrop-blur-xl border border-white/10 sm:bottom-6 ${
              side === "right" ? "right-4 sm:right-6" : "left-4 sm:left-6"
            }`}
          >
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/20">
              {track.thumbnail ? (
                <img src={track.thumbnail} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-white/10 flex items-center justify-center text-sm">
                  <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="min-w-0 max-w-[120px] sm:max-w-[160px]">
              <p className="truncate text-xs font-semibold text-white leading-tight">{track.title}</p>
              <p className="truncate text-[10px] text-white/60">{track.author}</p>
            </div>
            {!paused && (
              <div className="flex items-end gap-[2px] h-3.5 ml-1">
                {[0, 1, 2].map((i) => (
                  <MotionDiv
                    key={i}
                    animate={{ height: ["4px", "14px", "4px"] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                    className="w-[3px] rounded-full bg-white/80"
                  />
                ))}
              </div>
            )}
          </MotionButton>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <MotionDiv
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className={`fixed bottom-0 left-0 right-0 z-50 w-full sm:w-[380px] sm:rounded-2xl rounded-t-2xl border-t sm:border border-white/[0.08] bg-[#0f0f14]/95 backdrop-blur-2xl shadow-2xl overflow-hidden sm:bottom-4 ${
              side === "right" ? "sm:left-auto sm:right-4" : "sm:right-auto sm:left-4"
            }`}
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-2 sm:pt-4 sm:pb-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (activeGuildId) navigate(`/player/${activeGuildId}`);
                }}
                className="text-[10px] font-medium text-white/40 hover:text-white/70 transition uppercase tracking-wider"
              >
                Open Full Player
              </button>
              <div className="flex items-center gap-1">
                {/* Toggle side — desktop only */}
                <button
                  onClick={toggleSide}
                  title={side === "right" ? "Move to left" : "Move to right"}
                  className="hidden sm:flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/10 transition"
                >
                  <svg className={`h-3.5 w-3.5 text-white/60 transition-transform ${side === "right" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/10 transition"
                >
                  <svg className="h-4 w-4 text-white/60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-white/10 sm:hidden" />

            <div className="flex items-center gap-3 px-4 pb-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-lg">
                {track.thumbnail ? (
                  <img src={track.thumbnail} alt={track.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-white/5 flex items-center justify-center">
                    <svg className="h-6 w-6 text-white/30" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <a
                  href={track.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-sm font-semibold text-white hover:underline leading-snug"
                  title={track.title}
                >
                  {track.title}
                </a>
                <p className="truncate text-xs text-white/40 mt-0.5">{track.author}</p>
              </div>
            </div>
            <div className="px-4 mb-3">
              {isLive(duration) ? (
                <div className="flex items-center justify-center gap-2 py-1">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-semibold text-red-400">Live</span>
                </div>
              ) : (
                <>
                  <div className="relative group">
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 to-pink-400 rounded-full"
                        style={{ width: `${pct}%`, transition: paused ? "width 0.15s ease" : "none" }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.1"
                      value={pct}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        const seekMs = Math.round((val / 100) * duration);
                        setDisplayPos(seekMs);
                        lastTickRef.current = Date.now();
                        controls.seek(seekMs);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] tabular-nums text-white/30 select-none">
                    <span>{formatTime(displayPos)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center justify-center gap-3 px-4 pb-3">
              <button
                onClick={() => controls.shuffle()}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 hover:text-white transition"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h5v5M4 20l16-16M15 20h5v-5M4 4l7 7" />
                </svg>
              </button>
              <button
                onClick={() => controls.previous()}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:text-white transition active:scale-90"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
                </svg>
              </button>
              <button
                onClick={() => controls.pause(!paused)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-lg shadow-white/10 transition active:scale-90 hover:scale-105"
              >
                {paused ? (
                  <svg className="h-5 w-5 translate-x-[1px]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                )}
              </button>

              {/* next */}
              <button
                onClick={() => controls.skip()}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:text-white transition active:scale-90"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>

              {/* loop */}
              <button
                onClick={() => controls.setLoop(LOOP_CYCLE[loop])}
                title={LOOP_ICON[loop]}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                  loop !== "none" ? "text-green-400" : "text-white/40 hover:text-white"
                }`}
              >
                {loop === "song" ? (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                  </svg>
                )}
              </button>
            </div>

            {/* volume */}
            <div className="flex items-center gap-2 px-4 pb-3">
              <svg className="h-4 w-4 text-white/30 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
              <div className="flex-1 relative">
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/40 rounded-full"
                    style={{ width: `${volume}%` }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => controls.setVolume(parseInt(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <span className="text-[10px] text-white/30 w-7 text-right tabular-nums">{volume}%</span>
            </div>

            {/* queue preview */}
            {queue.length > 0 && (
              <div className="border-t border-white/[0.05] px-4 pt-2 pb-3">
                <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-1.5">
                  Up Next ({queue.length})
                </p>
                <div className="space-y-1 max-h-[140px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {queue.slice(0, 5).map((t, i) => (
                    <button
                      key={i}
                      onClick={() => controls.skipToIndex(i)}
                      className="flex items-center gap-2 w-full rounded-lg px-2 py-1.5 hover:bg-white/[0.04] transition group text-left"
                    >
                      <span className="text-[10px] text-white/20 w-4 shrink-0 text-center">{i + 1}</span>
                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded border border-white/[0.06]">
                        {t.thumbnail ? (
                          <img src={t.thumbnail} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-white/5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] text-white/70 group-hover:text-white/90 leading-tight">{t.title}</p>
                        <p className="truncate text-[10px] text-white/30">{t.author}</p>
                      </div>
                      <span className="text-[10px] text-white/20 shrink-0 tabular-nums">
                        {isLive(t.length) ? "Live" : formatTime(t.length)}
                      </span>
                    </button>
                  ))}
                  {queue.length > 5 && (
                    <p className="text-[10px] text-white/20 text-center pt-1">
                      +{queue.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* stop button */}
            <div className="border-t border-white/[0.05] px-4 py-2.5">
              <button
                onClick={() => {
                  controls.stop();
                  setIsOpen(false);
                }}
                className="flex items-center justify-center gap-1.5 w-full rounded-lg py-2 text-[11px] font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition"
              >
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h12v12H6z" />
                </svg>
                Disconnect Bot
              </button>
            </div>
            <div className="h-4 sm:hidden" />
          </MotionDiv>
        )}
      </AnimatePresence>
    </>
  );
}
