import { useState, useEffect, useRef, useCallback } from "react";
import { MusicalNoteIcon, PlayIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { api } from "@/lib/api";

interface RecommendedTrack {
  title: string;
  artist: string;
  thumbnail: string | null;
  searchQuery: string;
}

interface Props {
  currentTrack: { title: string; author: string; uri: string } | null;
  onAddToQueue: (uris: string[]) => Promise<void>;
}

const ITEM_WIDTH = 144;
const GAP = 16;
const SCROLL_STEP = (ITEM_WIDTH + GAP) * 3;

export default function PersonalRecommendations({ currentTrack, onAddToQueue }: Props) {
  const [tracks, setTracks] = useState<RecommendedTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingQuery, setAddingQuery] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [lastFetched, setLastFetched] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    if (!currentTrack?.title || !currentTrack?.author) return;

    const isYouTube = /youtu\.?be|youtube\.com/i.test(currentTrack.uri || "");

    let cleanTitle = currentTrack.title;
    let cleanArtist = currentTrack.author;

    if (isYouTube) {
      const dashMatch = currentTrack.title.match(/^(.+?)\s*[-–—]\s*(.+)$/);
      if (dashMatch) {
        cleanArtist = dashMatch[1].trim();
        cleanTitle = dashMatch[2].trim();
      }
    }

    // Clean title: remove (Official Video), [Lyrics], (Audio), etc.
    cleanTitle = cleanTitle
      .replace(/\s*[\(\[][^)\]]*(?:official|video|audio|lyric|mv|music\s*video|visualizer|hd|hq|remaster|live|remix).*?[\)\]]/gi, "")
      .replace(/\s*[\(\[].*?[\)\]]\s*$/g, "")
      .trim() || currentTrack.title;

    // Clean artist: remove "feat.", "ft.", "- Topic", "VEVO", etc.
    cleanArtist = cleanArtist
      .replace(/\s*-\s*Topic$/i, "")
      .replace(/VEVO$/i, "")
      .split(/[,&]|feat\.|ft\./i)[0]
      .trim();

    const key = `${cleanTitle}::${cleanArtist}`;
    if (key === lastFetched) return;

    setLoading(true);
    setLastFetched(key);

    api
      .get<RecommendedTrack[]>("/api/recommendations", {
        params: { track: cleanTitle, artist: cleanArtist },
      })
      .then(({ data }) => {
        if (data && data.length > 0) setTracks(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentTrack?.title, currentTrack?.author, lastFetched]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || tracks.length === 0) return;
    updateScrollButtons();
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    window.addEventListener("resize", updateScrollButtons);
    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [tracks, updateScrollButtons]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      const atStart = el.scrollLeft <= 0;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1;
      if ((e.deltaY < 0 && atStart) || (e.deltaY > 0 && atEnd)) return;
      e.preventDefault();
      el.scrollBy({ left: e.deltaY * 3, behavior: "smooth" });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [tracks]);

  const scroll = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -SCROLL_STEP : SCROLL_STEP,
      behavior: "smooth",
    });
  };

  const handlePlay = async (track: RecommendedTrack) => {
    setAddingQuery(track.searchQuery);
    try {
      await onAddToQueue([track.searchQuery]);
    } finally {
      setAddingQuery(null);
    }
  };

  if (loading && tracks.length === 0) {
    return (
      <div className="mb-8">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-purple-500" />
            Picked For You
          </h3>
          <p className="text-xs text-muted-foreground mt-1 ml-3">Based on what you're currently listening to</p>
        </div>
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

  if (tracks.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-purple-500" />
          Picked For You
          {loading && (
            <span className="w-3 h-3 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          )}
        </h3>
        <p className="text-xs text-muted-foreground mt-1 ml-3">Based on what you're currently listening to</p>
      </div>

      <div className="group/recs relative">
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-20 z-[5] pointer-events-none bg-gradient-to-r from-background via-background/70 to-transparent" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-20 z-[5] pointer-events-none bg-gradient-to-l from-background via-background/70 to-transparent" />
        )}

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

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tracks.map((track) => (
            <div
              key={track.searchQuery}
              className="shrink-0 w-36 group cursor-pointer"
              onClick={() => handlePlay(track)}
            >
              <div className="relative w-36 h-36 rounded-xl overflow-hidden">
                {track.thumbnail ? (
                  <img src={track.thumbnail} alt="" className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center">
                    <MusicalNoteIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {addingQuery === track.searchQuery ? (
                    <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <PlayIcon className="w-10 h-10 text-white" />
                  )}
                </div>
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
