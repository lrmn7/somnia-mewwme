import { useState, useEffect, useRef, useCallback } from "react";
import { MusicalNoteIcon, PlayIcon, ChevronLeftIcon, ChevronRightIcon, ArrowLeftIcon } from "@heroicons/react/24/solid";
import { api } from "@/lib/api";

interface Tag {
  name: string;
  reach: number;
}

interface TagTrack {
  title: string;
  artist: string;
  thumbnail: string | null;
  searchQuery: string;
}

interface Props {
  onAddToQueue: (uris: string[]) => Promise<void>;
}

const ITEM_WIDTH = 144;
const GAP = 16;
const SCROLL_STEP = (ITEM_WIDTH + GAP) * 3;

const TAG_COLORS = [
  "bg-pink-500/20 text-pink-300 hover:bg-pink-500/30",
  "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30",
  "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30",
  "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30",
  "bg-teal-500/20 text-teal-300 hover:bg-teal-500/30",
  "bg-green-500/20 text-green-300 hover:bg-green-500/30",
  "bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30",
  "bg-orange-500/20 text-orange-300 hover:bg-orange-500/30",
  "bg-red-500/20 text-red-300 hover:bg-red-500/30",
  "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30",
];

export default function GenreCharts({ onAddToQueue }: Props) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tracks, setTracks] = useState<TagTrack[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [addingQuery, setAddingQuery] = useState<string | null>(null);
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
    api
      .get<Tag[]>("/api/top-tags")
      .then(({ data }) => setTags(data || []))
      .catch(() => {})
      .finally(() => setLoadingTags(false));
  }, []);

  useEffect(() => {
    if (!selectedTag) return;
    setLoadingTracks(true);
    setTracks([]);
    api
      .get<TagTrack[]>("/api/tag-tracks", { params: { tag: selectedTag } })
      .then(({ data }) => setTracks(data || []))
      .catch(() => {})
      .finally(() => setLoadingTracks(false));
  }, [selectedTag]);

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

  const handlePlay = async (track: TagTrack) => {
    setAddingQuery(track.searchQuery);
    try {
      await onAddToQueue([track.searchQuery]);
    } finally {
      setAddingQuery(null);
    }
  };

  if (loadingTags) {
    return (
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-cyan-500" />
          Discover Genres
        </h3>
        <p className="text-xs text-muted-foreground mb-4 ml-3">Those who wish to sing always find a song ♪</p>
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-8 w-20 rounded-full bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (tags.length === 0) return null;

  if (!selectedTag) {
    return (
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-cyan-500" />
          Discover Genres
        </h3>
        <p className="text-xs text-muted-foreground mb-4 ml-3">Those who wish to sing always find a song ♪</p>
        <div className="flex gap-2 flex-wrap">
          {tags.map((tag, i) => (
            <button
              key={tag.name}
              onClick={() => setSelectedTag(tag.name)}
              className={
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 " +
                TAG_COLORS[i % TAG_COLORS.length]
              }
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-cyan-500" />
        <button
          onClick={() => { setSelectedTag(null); setTracks([]); }}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Discover Genres
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="capitalize">{selectedTag}</span>
        {loadingTracks && (
          <span className="w-3 h-3 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        )}
      </h3>

      {loadingTracks && tracks.length === 0 ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="shrink-0 w-36">
              <div className="w-36 h-36 rounded-xl bg-white/5 animate-pulse" />
              <div className="h-3 bg-white/5 rounded mt-2 w-24 animate-pulse" />
              <div className="h-2.5 bg-white/5 rounded mt-1 w-16 animate-pulse" />
            </div>
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <p className="text-xs text-muted-foreground">No tracks found for this genre.</p>
      ) : (
        <div className="group/genre relative">
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
      )}
    </div>
  );
}
