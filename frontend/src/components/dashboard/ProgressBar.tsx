import { useEffect, useRef, useState, useCallback } from "react";

interface Props {
  position: number;
  duration: number;
  paused: boolean;
  onSeek: (posMs: number) => void;
  compact?: boolean;
  trackUri?: string;
  trackKey?: number;
}

function formatTime(ms: number) {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function isLiveStream(durationMs: number): boolean {
  return durationMs > 0 && durationMs >= 86400000;
}

export default function ProgressBar({
  position,
  duration,
  paused,
  onSeek,
  compact,
  trackUri,
  trackKey,
}: Props) {
  const [displayPos, setDisplayPos] = useState(position);
  const [dragging, setDragging] = useState(false);
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef(Date.now());
  const prevTrackRef = useRef(trackUri);
  const prevKeyRef = useRef(trackKey);

  useEffect(() => {
    if (trackKey !== prevKeyRef.current || trackUri !== prevTrackRef.current) {
      prevTrackRef.current = trackUri;
      prevKeyRef.current = trackKey;
      setDisplayPos(0);
      lastTickRef.current = Date.now();
    }
  }, [trackUri, trackKey]);

  useEffect(() => {
    if (!dragging) {
      setDisplayPos(position);
      lastTickRef.current = Date.now();
    }
  }, [position, dragging]);

  useEffect(() => {
    if (paused || dragging || isLiveStream(duration)) {
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
  }, [paused, dragging, duration, trackUri, trackKey]);

  const pct = duration > 0 ? Math.min((displayPos / duration) * 100, 100) : 0;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setDisplayPos((val / 100) * duration);
    },
    [duration]
  );

  const handleMouseDown = () => setDragging(true);
  const handleCommit = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    setDragging(false);
    const target = e.target as HTMLInputElement;
    const val = parseFloat(target.value);
    const seekMs = Math.round((val / 100) * duration);
    setDisplayPos(seekMs);
    lastTickRef.current = Date.now();
    onSeek(seekMs);
  };

  if (compact) {
    if (isLiveStream(duration)) {
      return (
        <div className="w-full h-1 bg-red-500/30 rounded-full overflow-hidden">
          <div className="h-full w-full bg-red-500 animate-pulse" />
        </div>
      );
    }
    return (
      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-white/60 rounded-full"
          style={{
            width: `${pct}%`,
            transition: paused ? "width 0.15s ease" : "none",
          }}
        />
      </div>
    );
  }

  if (isLiveStream(duration)) {
    return (
      <div className="w-full">
        <div className="w-full h-1.5 bg-red-500/20 rounded-full overflow-hidden">
          <div className="h-full w-full bg-red-500/60 animate-pulse" />
        </div>
        <div className="flex justify-center mt-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            Live
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative group">
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pink-500 to-pink-400 rounded-full"
            style={{
              width: `${pct}%`,
              transition: dragging || !paused ? "none" : "width 0.15s ease",
            }}
          />
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={pct}
          onChange={handleChange}
          onMouseDown={handleMouseDown}
          onMouseUp={handleCommit}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleCommit as any}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <div className="flex justify-between mt-1.5 text-xs tabular-nums text-muted-foreground select-none">
        <span>{formatTime(displayPos)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
