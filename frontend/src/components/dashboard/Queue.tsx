import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Track } from "@/types/player";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";

function fmtMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

function isLive(lengthMs: number | undefined | null): boolean {
  return !lengthMs || lengthMs <= 0 || lengthMs >= 86400000;
}

interface Props {
  current: Track | null;
  queue: Track[];
  onSkipTo: (index: number) => void;
  onRemove: (index: number) => void;
  onReorder: (from: number, to: number) => void;
}

export default function Queue({ current, queue, onSkipTo, onRemove, onReorder }: Props) {
  const [removingIdx, setRemovingIdx] = useState<number | null>(null);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Optimistic local queue for instant visual feedback
  const [localQueue, setLocalQueue] = useState(queue);
  // After an optimistic reorder, ignore incoming prop updates for a short window
  // so the server refetch (GET) and WebSocket push don't clobber the local state.
  // Using a timestamp avoids the double-decrement bug of a simple counter
  // (both fetchState() and socket playerState can fire for one reorder).
  const reorderUntil = useRef(0);
  useEffect(() => {
    if (Date.now() < reorderUntil.current) return;
    setLocalQueue(queue);
  }, [queue]);

  const handleRemove = async (index: number) => {
    setRemovingIdx(index);
    try {
      await onRemove(index);
    } finally {
      setRemovingIdx(null);
    }
  };

  const handlePlayNow = async (index: number) => {
    setPlayingIdx(index);
    try {
      await onSkipTo(index);
    } finally {
      setPlayingIdx(null);
    }
  };

  // Stable sortable IDs (index-based since tracks can repeat)
  const sortableIds = localQueue.map((_, i) => `queue-item-${i}`);
  // Keep a ref so handleDragEnd never reads a stale copy
  const sortableIdsRef = useRef(sortableIds);
  sortableIdsRef.current = sortableIds;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  // Auto-scroll the queue container when the pointer is near the top/bottom edge.
  const scrollRafRef = useRef<number | null>(null);
  const scrollSpeedRef = useRef(0);

  useEffect(() => {
    // Run a rAF loop while a drag is active that scrolls the container.
    if (!activeId) {
      scrollSpeedRef.current = 0;
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
      return;
    }
    const tick = () => {
      const container = queueContainerRef.current;
      if (container && scrollSpeedRef.current !== 0) {
        container.scrollTop += scrollSpeedRef.current;
      }
      scrollRafRef.current = requestAnimationFrame(tick);
    };
    scrollRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [activeId]);

  const handleDragMove = useCallback(
    (event: { activatorEvent: Event; delta: { x: number; y: number } }) => {
      const container = queueContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      // Use the activator event's client position plus the current delta to
      // figure out where the pointer is right now relative to the container.
      const activator = event.activatorEvent as PointerEvent | TouchEvent;
      let clientY: number;
      if ("clientY" in activator) {
        clientY = (activator as PointerEvent).clientY + event.delta.y;
      } else if ("touches" in activator && activator.touches.length > 0) {
        clientY = activator.touches[0].clientY + event.delta.y;
      } else {
        return;
      }
      const EDGE = 40; // px from edge to start scrolling
      const MAX_SPEED = 12; // px per frame
      if (clientY < rect.top + EDGE) {
        // Near top edge — scroll up
        const ratio = Math.max(0, 1 - (clientY - rect.top) / EDGE);
        scrollSpeedRef.current = -Math.round(ratio * MAX_SPEED);
      } else if (clientY > rect.bottom - EDGE) {
        // Near bottom edge — scroll down
        const ratio = Math.max(0, 1 - (rect.bottom - clientY) / EDGE);
        scrollSpeedRef.current = Math.round(ratio * MAX_SPEED);
      } else {
        scrollSpeedRef.current = 0;
      }
    },
    []
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const ids = sortableIdsRef.current;
      const fromIndex = ids.indexOf(active.id as string);
      const toIndex = ids.indexOf(over.id as string);
      if (fromIndex === -1 || toIndex === -1) return;
      if (fromIndex === toIndex) return;

      // Optimistic update using dnd-kit's arrayMove
      // Guard: ignore server prop updates for 2s so they don't clobber this.
      reorderUntil.current = Date.now() + 2000;
      setLocalQueue((prev) => arrayMove(prev, fromIndex, toIndex));

      onReorder(fromIndex, toIndex);
    },
    [onReorder]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  // Ref to the scrollable queue container — used for auto-scroll during drag
  const queueContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="hidden sm:grid grid-cols-[1.5rem_2rem_minmax(0,2fr)_minmax(0,1fr)_5rem_5rem] items-center gap-3 px-4 py-2.5 border-b border-white/[0.08] bg-white/[0.03] backdrop-blur-sm">
        <span />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40 text-center">#</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Title</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Artist</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40 text-center">Time</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40 text-center">Actions</span>
      </div>

      {/* Now Playing row */}
      {current && (
        <>
          {/* Mobile now-playing */}
          <div className="flex sm:hidden items-center gap-2.5 px-3 py-2.5 border-b border-green-500/10 bg-green-500/[0.06]">
            {/* Equalizer bars */}
            <span className="flex items-end gap-[2px] h-3 shrink-0">
              <span className="w-[2.5px] bg-green-400 rounded-full animate-[barBounce_0.8s_ease-in-out_infinite]" style={{ height: "60%", animationDelay: "0s" }} />
              <span className="w-[2.5px] bg-green-400 rounded-full animate-[barBounce_0.8s_ease-in-out_infinite]" style={{ height: "100%", animationDelay: "0.2s" }} />
              <span className="w-[2.5px] bg-green-400 rounded-full animate-[barBounce_0.8s_ease-in-out_infinite]" style={{ height: "40%", animationDelay: "0.4s" }} />
            </span>

            {/* Thumbnail */}
            {current.thumbnail ? (
              <img src={current.thumbnail} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover border border-green-500/20 shadow-sm shadow-green-500/10" />
            ) : (
              <div className="h-10 w-10 shrink-0 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <svg className="h-4 w-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
            )}

            {/* Title + Artist */}
            <div className="flex-1 min-w-0">
              <p className="truncate text-[13px] font-bold text-green-300 leading-snug">{current.title}</p>
              <p className="truncate text-[11px] font-medium text-green-400/60 mt-0.5">{current.author ?? "Unknown artist"}</p>
            </div>

            {/* Duration / Live + Now Playing badge */}
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-[10px] tabular-nums font-semibold text-green-400/70 select-none">
                {isLive(current.length) ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    Live
                  </span>
                ) : (
                  fmtMs(current.length ?? 0)
                )}
              </span>
              <span className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[9px] font-bold text-green-400 whitespace-nowrap animate-[nowPlayingPulse_3s_ease-in-out_infinite]">
                Playing
              </span>
            </div>
          </div>

          {/* Desktop now-playing */}
          <div className="hidden sm:grid grid-cols-[1.5rem_2rem_minmax(0,2fr)_minmax(0,1fr)_5rem_5rem] items-center gap-3 px-4 py-3 border-b border-green-500/10 bg-green-500/[0.06]">
            <span />
            <span className="flex items-center justify-center">
              <span className="flex items-end gap-[2px] h-3.5">
                <span className="w-[3px] bg-green-400 rounded-full animate-[barBounce_0.8s_ease-in-out_infinite]" style={{ height: "60%", animationDelay: "0s" }} />
                <span className="w-[3px] bg-green-400 rounded-full animate-[barBounce_0.8s_ease-in-out_infinite]" style={{ height: "100%", animationDelay: "0.2s" }} />
                <span className="w-[3px] bg-green-400 rounded-full animate-[barBounce_0.8s_ease-in-out_infinite]" style={{ height: "40%", animationDelay: "0.4s" }} />
              </span>
            </span>

            <div className="flex items-center gap-3 min-w-0">
              {current.thumbnail ? (
                <img src={current.thumbnail} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover border border-green-500/20 shadow-md shadow-green-500/10" />
              ) : (
                <div className="h-11 w-11 shrink-0 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shadow-md">
                  <svg className="h-4 w-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-green-300 leading-snug">{current.title}</p>
              </div>
            </div>

            <p className="truncate text-sm font-medium text-green-400/60">
              {current.author ?? "Unknown"}
            </p>

            <p className="text-center text-xs tabular-nums font-semibold text-green-400/70 select-none">
              {isLive(current.length) ? (
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  Live
                </span>
              ) : (
                fmtMs(current.length ?? 0)
              )}
            </p>

            <div className="flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-[10px] font-bold text-green-400 whitespace-nowrap animate-[nowPlayingPulse_3s_ease-in-out_infinite]">
                Now Playing
              </span>
            </div>
          </div>
        </>
      )}

      {/* Queue items */}
      {localQueue.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <svg className="h-10 w-10 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
          </svg>
          <p className="text-xs text-white/40">Queue is empty — search to add more tracks.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <div ref={queueContainerRef} className="flex-1 overflow-y-auto scrollbar-none max-h-[300px] sm:max-h-none">
              {localQueue.map((track, index) => {
                const isRemoving = removingIdx === index;
                const isPlayingNow = playingIdx === index;
                const isActing = isRemoving || isPlayingNow;
                const itemId = sortableIds[index];
                return (
                  <SortableQueueRow
                    key={itemId}
                    id={itemId}
                    track={track}
                    index={index}
                    isActing={isActing}
                    isPlayingNow={isPlayingNow}
                    isRemoving={isRemoving}
                    onPlayNow={() => handlePlayNow(index)}
                    onRemove={() => handleRemove(index)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Keyframe animation for the equalizer bars */}
      <style>{`
        @keyframes barBounce {
          0%, 100% { height: 30%; }
          50% { height: 100%; }
        }
        @keyframes nowPlayingPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

/* ── Drag handle icon (decorative only — drag is on the whole row) */
function DragHandleIcon() {
  return (
    <span className="flex items-center justify-center w-6 h-6 text-white/20 group-hover:text-white/50 transition-colors pointer-events-none select-none">
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="9" cy="6" r="1.5" />
        <circle cx="15" cy="6" r="1.5" />
        <circle cx="9" cy="12" r="1.5" />
        <circle cx="15" cy="12" r="1.5" />
        <circle cx="9" cy="18" r="1.5" />
        <circle cx="15" cy="18" r="1.5" />
      </svg>
    </span>
  );
}

/* ── Sortable wrapper for each queue row ──────────────────────── */
function SortableQueueRow(props: {
  id: string;
  track: Track;
  index: number;
  isActing: boolean;
  isPlayingNow: boolean;
  isRemoving: boolean;
  onPlayNow: () => void;
  onRemove: () => void;
}) {
  const { id, ...rowProps } = props;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // Y-only transform: locks horizontal movement so the row slides
  // vertically with the cursor. Other rows animate around it via the
  // sortable strategy, naturally showing where the drop will land.
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(0, ${Math.round(transform.y)}px, 0)` : undefined,
    transition: isDragging ? "none" : transition,
    position: "relative" as const,
    zIndex: isDragging ? 50 : undefined,
  };

  // The actual row stays visible while dragging — with a subtle lift
  // effect so it's clear which track is being moved. No floating overlay.
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "group touch-none",
        isDragging
          ? "cursor-grabbing opacity-50"
          : "cursor-grab",
      ].join(" ")}
      {...listeners}
      {...attributes}
    >
      <QueueRowContent
        track={rowProps.track}
        index={rowProps.index}
        isActing={rowProps.isActing}
        isPlayingNow={rowProps.isPlayingNow}
        isRemoving={rowProps.isRemoving}
        onPlayNow={rowProps.onPlayNow}
        onRemove={rowProps.onRemove}
      />
    </div>
  );
}

/* ── Shared row content ────────────────────────────────────────── */
function QueueRowContent({
  track,
  index,
  isActing,
  isPlayingNow,
  isRemoving,
  onPlayNow,
  onRemove,
}: {
  track: Track;
  index: number;
  isActing: boolean;
  isPlayingNow: boolean;
  isRemoving: boolean;
  onPlayNow?: () => void;
  onRemove?: () => void;
}) {
  return (
    <>
      {/* Mobile row */}
      <div
        className={[
          "flex sm:hidden items-center gap-2.5 px-3 py-2.5",
          "border-b border-white/[0.04] last:border-0",
          "transition-colors duration-150",
          isActing ? "opacity-60" : "",
        ].join(" ")}
      >
        {/* Drag handle (decorative) */}
        <div className="shrink-0">
          <DragHandleIcon />
        </div>

        {/* Track number */}
        <span className="text-[11px] tabular-nums font-semibold text-white/25 select-none w-5 text-center shrink-0">
          {index + 1}
        </span>

        {/* Thumbnail */}
        {track.thumbnail ? (
          <img src={track.thumbnail} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover border border-white/10 shadow-sm" />
        ) : (
          <div className="h-10 w-10 shrink-0 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center">
            <svg className="h-4 w-4 text-white/20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}

        {/* Title + Artist + Duration */}
        <div className="flex-1 min-w-0">
          <p className="truncate text-[13px] font-bold text-white leading-snug">{track.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="truncate text-[11px] font-medium text-white/40">{track.author ?? "Unknown artist"}</p>
            <span className="text-white/15 text-[10px]">·</span>
            <span className="text-[10px] tabular-nums font-semibold text-white/30 shrink-0 select-none">
              {isLive(track.length) ? (
                <span className="inline-flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-red-500 animate-pulse" />
                  Live
                </span>
              ) : (
                fmtMs(track.length ?? 0)
              )}
            </span>
          </div>
        </div>

        {/* Three-dot menu */}
        {onPlayNow && onRemove && (
          <div className="shrink-0">
            <MobileMenu
              isActing={isActing}
              onPlayNow={onPlayNow}
              onRemove={onRemove}
            />
          </div>
        )}
      </div>

      {/* Desktop row */}
      <div
        className={[
          "hidden sm:grid grid-cols-[1.5rem_2rem_minmax(0,2fr)_minmax(0,1fr)_5rem_5rem]",
          "items-center gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0",
          "hover:bg-white/[0.04]",
          "transition-colors duration-150",
          isActing ? "opacity-60" : "",
        ].join(" ")}
      >
        {/* Drag handle (decorative) */}
        <DragHandleIcon />

        {/* # */}
        <span className="text-center text-xs tabular-nums font-semibold text-white/30 select-none">
          {index + 1}
        </span>

        {/* Thumbnail + Title */}
        <div className="flex items-center gap-3 min-w-0">
          {track.thumbnail ? (
            <img src={track.thumbnail} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover border border-white/10 shadow-md" />
          ) : (
            <div className="h-11 w-11 shrink-0 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center shadow-md">
              <svg className="h-4 w-4 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white leading-snug">{track.title}</p>
          </div>
        </div>

        {/* Artist */}
        <p className="truncate text-sm font-medium text-white/40">
          {track.author ?? "Unknown"}
        </p>

        {/* Duration */}
        <p className="text-center text-xs tabular-nums font-semibold text-white/30 select-none">
          {isLive(track.length) ? (
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              Live
            </span>
          ) : (
            fmtMs(track.length ?? 0)
          )}
        </p>

        {/* Actions */}
        {onPlayNow && onRemove ? (
          <div className="flex items-center justify-center">
            <ActionButtons
              isActing={isActing}
              isPlayingNow={isPlayingNow}
              isRemoving={isRemoving}
              onPlayNow={onPlayNow}
              onRemove={onRemove}
            />
          </div>
        ) : (
          <span />
        )}
      </div>
    </>
  );
}

/* ── Desktop action buttons ───────────────────────────────────── */
function ActionButtons({
  isActing,
  isPlayingNow,
  isRemoving,
  onPlayNow,
  onRemove,
}: {
  isActing: boolean;
  isPlayingNow: boolean;
  isRemoving: boolean;
  onPlayNow: () => void;
  onRemove: () => void;
}) {
  // Stop pointer/touch events from reaching the row's drag listeners
  const stopDrag = (e: React.PointerEvent | React.TouchEvent) => e.stopPropagation();

  return (
    <div className="flex items-center justify-center gap-2" onPointerDown={stopDrag} onTouchStart={stopDrag}>
      <button
        type="button"
        onClick={onPlayNow}
        disabled={isActing}
        title="Play this track now"
        className="inline-flex items-center justify-center rounded-lg p-2 bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 hover:border-green-500/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
      >
        {isPlayingNow ? (
          <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <button
        type="button"
        onClick={onRemove}
        disabled={isActing}
        title="Remove from queue"
        className="inline-flex items-center justify-center rounded-lg p-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
      >
        {isRemoving ? (
          <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </svg>
        )}
      </button>
    </div>
  );
}

/* ── Mobile three-dot menu ────────────────────────────────────── */
function MobileMenu({
  isActing,
  onPlayNow,
  onRemove,
}: {
  isActing: boolean;
  onPlayNow: () => void;
  onRemove: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Stop pointer/touch events from reaching the row's drag listeners
  const stopDrag = (e: React.PointerEvent | React.TouchEvent) => e.stopPropagation();

  function openMenu() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setMenuOpen((v) => !v);
  }

  useEffect(() => {
    if (!menuOpen) return;
    function onOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (
        (!btnRef.current || !btnRef.current.contains(t)) &&
        (!dropdownRef.current || !dropdownRef.current.contains(t))
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    function onScroll() { setMenuOpen(false); }
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [menuOpen]);

  return (
    <div onPointerDown={stopDrag} onTouchStart={stopDrag}>
      <button
        ref={btnRef}
        type="button"
        onClick={openMenu}
        disabled={isActing}
        className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-90 disabled:opacity-40"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
        </svg>
      </button>

      {menuOpen && menuPos && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] w-48 rounded-xl border border-white/10 bg-[#1c1c24] shadow-2xl shadow-black/70 py-1 overflow-hidden"
          style={{ top: menuPos.top, right: menuPos.right }}
        >
          <button
            type="button"
            onClick={() => { setMenuOpen(false); onPlayNow(); }}
            disabled={isActing}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-white/[0.07] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="h-3.5 w-3.5 shrink-0 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Play now
          </button>
          <div className="mx-3 h-px bg-white/[0.07]" />
          <button
            type="button"
            onClick={() => { setMenuOpen(false); onRemove(); }}
            disabled={isActing}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/[0.08] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Remove from queue
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
