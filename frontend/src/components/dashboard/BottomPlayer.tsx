import type { LoopMode, PlayerState } from "@/types/player";
import Controls from "./Controls";
import ProgressBar from "./ProgressBar";
import VolumeControl from "./VolumeControl";
import LikeButton from "./LikeButton";

interface Props {
  playerState: PlayerState | null;
  onPause: (value: boolean) => void;
  onSkip: () => void;
  onPrevious: () => void;
  onSeek: (ms: number) => void;
  onVolumeChange: (vol: number) => void;
  onFiltersOpen: () => void;
  onLyricsOpen: () => void;
  onShuffle: () => void;
  onLoop: (mode: LoopMode) => void;
  onAutoplay: () => void;
  isLiked: boolean;
  onToggleLike: () => void;
  activeFilter: string | null;
  notInVoice?: boolean;
}

export default function BottomPlayer({
  playerState,
  onPause,
  onSkip,
  onPrevious,
  onSeek,
  onVolumeChange,
  onFiltersOpen,
  onShuffle,
  onLoop,
  onAutoplay,
  isLiked,
  onToggleLike,
  activeFilter,
  notInVoice = false,
}: Props) {
  const track = playerState?.current;
  const paused = playerState?.pause ?? true;
  const volume = playerState?.volume ?? 80;
  const loop = playerState?.loop ?? "none";
  const autoplay = playerState?.autoplay ?? false;
  const position = playerState?.position ?? 0;

  return (
    <div className="fixed bottom-2 left-2 right-2 z-40 md:left-[4.5rem] lg:left-[15.5rem] rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl overflow-hidden">
      {/* Voice-channel guard overlay */}
      {notInVoice && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl backdrop-blur-[3px] bg-black/50">
          <div className="flex items-center gap-3 px-5 text-center">
            <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 border border-white/20">
              <svg className="h-3.5 w-3.5 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
              </svg>
            </span>
            <p className="text-[11px] sm:text-xs font-semibold text-white/90 leading-snug max-w-xs sm:max-w-sm">
              You must be in the same voice channel as the bot to control the player
            </p>
          </div>
        </div>
      )}

      {/* MOBILE BAR */}
      <div className="flex sm:hidden flex-col">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10 shadow-md">
            {track?.thumbnail ? (
              <img src={track.thumbnail} alt={track.title} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-white/5 flex items-center justify-center text-base">🎵</div>
            )}
          </div>

          <div className="flex-1 min-w-0 overflow-hidden">
            {track ? (
              <>
                <p className="truncate text-[13px] font-semibold text-white leading-snug">{track.title}</p>
                <p className="truncate text-[11px] text-white/40 mt-0.5">{track.author}</p>
              </>
            ) : (
              <p className="text-xs text-white/40">Nothing playing</p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {track && <LikeButton liked={isLiked} onToggle={onToggleLike} size="sm" />}
            <button
              onClick={() => onPause(!paused)}
              disabled={!track || notInVoice}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-md transition active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {paused ? (
                <svg className="h-5 w-5 translate-x-px" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              )}
            </button>
            <button
              onClick={onFiltersOpen}
              disabled={!track || notInVoice}
              title={activeFilter ? `Filter: ${activeFilter}` : "Audio Filters"}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-90 ${
                activeFilter
                  ? "text-purple-400 bg-purple-500/15 border border-purple-500/40"
                  : "text-white/50 bg-white/[0.06] border border-white/10"
              } disabled:opacity-40`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
          </div>
        </div>
        <div className="w-full h-0.5">
          <ProgressBar
            position={position}
            duration={track?.length ?? 0}
            paused={paused}
            onSeek={onSeek}
            compact
            trackUri={track?.uri}
          />
        </div>
      </div>

      {/* DESKTOP / TABLET BAR */}
      <div className="hidden sm:flex items-center gap-2 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3 basis-0 sm:basis-[30%]">
          <div className="hidden sm:block h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 shadow-lg">
            {track?.thumbnail ? (
              <img src={track.thumbnail} alt={track?.title} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-white/5 flex items-center justify-center text-xl">🎵</div>
            )}
          </div>
          <div className="min-w-0">
            {track ? (
              <>
                <a
                  href={track.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-xs font-semibold text-white hover:underline leading-snug"
                  title={track.title}
                >
                  {track.title}
                </a>
                <p className="truncate text-[10px] text-white/40 mt-0.5">{track.author}</p>
              </>
            ) : (
              <p className="text-xs text-white/40">Nothing playing</p>
            )}
          </div>
          {track && <LikeButton liked={isLiked} onToggle={onToggleLike} size="sm" />}
        </div>

        {/* CENTER: Controls + Progress */}
        <div className="flex flex-1 flex-col items-center gap-1.5 min-w-0 basis-auto sm:basis-[40%]">
          <Controls
            paused={paused}
            loop={loop}
            autoplay={autoplay}
            disabled={!track || notInVoice}
            hasAutoplayAccess={playerState?.hasAutoplayAccess !== false}
            autoplayEnabled={playerState?.autoplayEnabled !== false}
            autoplayRequirement={playerState?.autoplayRequirement}
            onSkip={onSkip}
            onPrevious={onPrevious}
            onPause={onPause}
            onLoop={onLoop}
            onShuffle={onShuffle}
            onAutoplay={onAutoplay}
          />
          <div className={`hidden sm:block w-full max-w-md${notInVoice ? " pointer-events-none" : ""}`}>
            <ProgressBar
              position={position}
              duration={track?.length ?? 0}
              paused={paused}
              onSeek={onSeek}
              trackUri={track?.uri}
            />
          </div>
        </div>

        {/* RIGHT: Filters + Volume */}
        <div className="hidden sm:flex items-center justify-end gap-2 flex-1 basis-[30%]">
          <button
            onClick={onFiltersOpen}
            disabled={!track || notInVoice}
            title={activeFilter ? `Filter: ${activeFilter}` : "Audio Filters"}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed ${
              activeFilter
                ? "text-purple-400 bg-purple-500/15 border border-purple-500/40"
                : "text-white/50 hover:text-white"
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
          <div className={notInVoice ? "pointer-events-none" : ""}>
            <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />
          </div>
        </div>
      </div>
    </div>
  );
}
