import { useState, useEffect, useRef, useCallback } from "react";
import { MusicalNoteIcon, PlayIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { api } from "@/lib/api";
import type { ChartTrack } from "@/types/player";

interface Props {
  onAddToQueue: (uris: string[]) => Promise<void>;
}

const ITEM_WIDTH = 144; // w-36 = 9rem = 144px
const GAP = 16; // gap-4 = 1rem = 16px
const SCROLL_STEP = (ITEM_WIDTH + GAP) * 3;

export default function RecommendedSection({ onAddToQueue }: Props) {
  const [charts, setCharts] = useState<ChartTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingUrl, setAddingUrl] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const country = Intl.DateTimeFormat().resolvedOptions().timeZone?.split("/")[0] || "US";
    api
      .get<ChartTrack[]>("/api/top-chart", { params: { country } })
      .then(({ data }) => {
        const seen = new Set<string>();
        const unique = (data || []).filter((t) => {
          if (seen.has(t.spotify_url)) return false;
          seen.add(t.spotify_url);
          return true;
        });
        setCharts(unique.slice(0, 50));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Update button visibility on content load, scroll, and resize
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || charts.length === 0) return;

    updateScrollButtons();
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    window.addEventListener("resize", updateScrollButtons);
    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [charts, updateScrollButtons]);

  // Capture mouse wheel on the chart area and translate to horizontal scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      const atStart = el.scrollLeft <= 0;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1;
      if ((e.deltaY < 0 && atStart) || (e.deltaY > 0 && atEnd)) return;

      e.preventDefault();
      // 3× multiplier for faster wheel-driven scrolling while staying smooth
      el.scrollBy({ left: e.deltaY * 3, behavior: "smooth" });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [charts]);

  const scroll = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -SCROLL_STEP : SCROLL_STEP,
      behavior: "smooth",
    });
  };

  const handlePlay = async (track: ChartTrack) => {
    setAddingUrl(track.spotify_url);
    try {
      await onAddToQueue([track.spotify_url]);
    } finally {
      setAddingUrl(null);
    }
  };

  if (loading) {
    return (
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-foreground mb-4">Top Tracks Today ♪</h3>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="shrink-0 w-36">
              <div className="w-36 h-36 rounded-xl bg-white/5 animate-pulse" />
              <div className="h-3 bg-white/5 rounded mt-2 w-24 animate-pulse" />
              <div className="h-2.5 bg-white/5 rounded mt-1 w-16 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (charts.length === 0) return null;

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-foreground mb-4">Top Tracks Today ♪</h3>

      {/* Wrapper with relative positioning for the overlay nav buttons */}
      <div className="group/chart relative">
        {/* Left fade overlay — wider gradient with an opaque start for a stronger effect */}
        {canScrollLeft && (
          <div
            className="absolute left-0 top-0 bottom-0 w-20 z-[5] pointer-events-none bg-gradient-to-r from-background via-background/70 to-transparent"
          />
        )}

        {/* Right fade overlay */}
        {canScrollRight && (
          <div
            className="absolute right-0 top-0 bottom-0 w-20 z-[5] pointer-events-none bg-gradient-to-l from-background via-background/70 to-transparent"
          />
        )}

        {/* Previous button – vertically centred on the left edge */}
        <button
          aria-label="Scroll left"
          disabled={!canScrollLeft}
          onClick={() => scroll("left")}
          className={
            "absolute left-0 top-1/2 -translate-y-1/2 z-10 " +
            "flex items-center justify-center w-8 h-8 rounded-full " +
            "bg-black/60 text-white backdrop-blur-sm shadow-lg " +
            "hover:bg-black/80 transition-all duration-200 " +
            "disabled:hidden"
          }
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>

        {/* Next button – vertically centred on the right edge */}
        <button
          aria-label="Scroll right"
          disabled={!canScrollRight}
          onClick={() => scroll("right")}
          className={
            "absolute right-0 top-1/2 -translate-y-1/2 z-10 " +
            "flex items-center justify-center w-8 h-8 rounded-full " +
            "bg-black/60 text-white backdrop-blur-sm shadow-lg " +
            "hover:bg-black/80 transition-all duration-200 " +
            "disabled:hidden"
          }
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>

        {/* Scrollable track list – scrollbar hidden, scroll via buttons & wheel only */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {charts.map((track) => (
            <div
              key={track.spotify_url}
              className="shrink-0 w-36 group cursor-pointer"
              onClick={() => handlePlay(track)}
            >
              <div className="relative w-36 h-36 rounded-xl overflow-hidden">
                {track.cover ? (
                  <img src={track.cover} alt="" className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center">
                    <MusicalNoteIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {addingUrl === track.spotify_url ? (
                    <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <PlayIcon className="w-10 h-10 text-white" />
                  )}
                </div>
                <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-md font-bold">
                  #{track.rank}
                </span>
              </div>
              <p className="text-xs text-foreground truncate mt-2 font-medium">{track.title}</p>
              <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
