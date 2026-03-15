import clsx from "clsx";
import type { LoopMode } from "@/types/player";

interface Props {
  paused: boolean;
  loop: LoopMode;
  autoplay: boolean;
  disabled?: boolean;
  hasAutoplayAccess?: boolean;
  autoplayEnabled?: boolean;
  autoplayRequirement?: string;
  onSkip: () => void;
  onPrevious: () => void;
  onPause: (value: boolean) => void;
  onLoop: (mode: LoopMode) => void;
  onShuffle: () => void;
  onAutoplay: () => void;
}

const LOOP_CYCLE: Record<LoopMode, LoopMode> = {
  none: "song",
  song: "queue",
  queue: "none",
};

const LOOP_LABEL: Record<LoopMode, string> = {
  none: "Loop Off",
  song: "Loop Track",
  queue: "Loop Queue",
};

function IconBtn({
  onClick,
  label,
  active = false,
  large = false,
  disabled = false,
  children,
}: {
  onClick: () => void;
  label: string;
  active?: boolean;
  large?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={clsx(
        "flex items-center justify-center rounded-full transition-all",
        disabled ? "opacity-30 cursor-not-allowed" : "active:scale-90",
        large ? "h-11 w-11" : "h-9 w-9",
        large && !disabled && "bg-rose-500 text-white hover:bg-rose-400 hover:scale-105 shadow-lg shadow-rose-500/30",
        large && disabled && "bg-rose-500/40 text-white/50",
        active && !large && !disabled && "text-green-400",
        !active && !large && !disabled && "text-white/50 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

export default function Controls({
  paused,
  loop,
  autoplay,
  disabled = false,
  hasAutoplayAccess = true,
  autoplayEnabled = true,
  autoplayRequirement,
  onSkip,
  onPrevious,
  onPause,
  onLoop,
  onShuffle,
  onAutoplay,
}: Props) {
  return (
    <div className="flex items-center gap-3">
      {/* Shuffle */}
      <IconBtn onClick={onShuffle} label="Shuffle queue" disabled={disabled}>
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h5v5M4 20l16-16M15 20h5v-5M4 4l7 7" />
        </svg>
      </IconBtn>

      {/* Previous */}
      <IconBtn onClick={onPrevious} label="Previous" disabled={disabled}>
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
        </svg>
      </IconBtn>

      {/* Play / Pause */}
      <IconBtn onClick={() => onPause(!paused)} label={paused ? "Resume" : "Pause"} large disabled={disabled}>
        {paused ? (
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        )}
      </IconBtn>

      {/* Next / Skip */}
      <IconBtn onClick={onSkip} label="Next" disabled={disabled}>
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
        </svg>
      </IconBtn>

      {/* Loop */}
      <button
        onClick={() => onLoop(LOOP_CYCLE[loop])}
        aria-label={LOOP_LABEL[loop]}
        title={LOOP_LABEL[loop]}
        disabled={disabled}
        className={clsx(
          "flex h-9 w-9 items-center justify-center rounded-full transition-all",
          disabled ? "opacity-30 cursor-not-allowed" : "active:scale-90",
          !disabled && loop !== "none" ? "text-green-400" : !disabled ? "text-white/50 hover:text-white" : ""
        )}
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

      {/* Autoplay */}
      <button
        onClick={hasAutoplayAccess ? onAutoplay : undefined}
        title={
          !autoplayEnabled
            ? "Autoplay Disabled"
            : !hasAutoplayAccess
            ? autoplayRequirement === "Voter"
              ? "Vote Required"
              : "Premium Required"
            : autoplay
            ? "Autoplay On"
            : "Autoplay Off"
        }
        aria-label="Toggle autoplay"
        disabled={disabled || !hasAutoplayAccess}
        className={clsx(
          "flex h-9 w-9 items-center justify-center rounded-full transition-all",
          (disabled || !hasAutoplayAccess) ? "opacity-30 cursor-not-allowed" : "active:scale-90",
          !disabled && hasAutoplayAccess && autoplay ? "text-green-400" : !disabled && hasAutoplayAccess ? "text-white/50 hover:text-white" : ""
        )}
      >
        {!hasAutoplayAccess && autoplayEnabled !== false ? (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3C6.48 3 2 7.48 2 13c0 2.94 1.26 5.59 3.27 7.46L4 22l2.54-1.27A9.9 9.9 0 0 0 12 23c5.52 0 10-4.48 10-10S17.52 3 12 3z" />
          </svg>
        )}
      </button>
    </div>
  );
}
