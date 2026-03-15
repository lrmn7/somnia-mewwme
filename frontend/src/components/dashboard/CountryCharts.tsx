import { useState, useEffect, useRef, useCallback } from "react";
import { MusicalNoteIcon, PlayIcon, ChevronLeftIcon, ChevronRightIcon, ArrowLeftIcon } from "@heroicons/react/24/solid";
import { api } from "@/lib/api";
import type { ChartTrack } from "@/types/player";

interface Props {
  onAddToQueue: (uris: string[]) => Promise<void>;
}

interface Country {
  code: string;
  name: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: "id", name: "Indonesia", flag: "🇮🇩" },
  { code: "us", name: "United States", flag: "🇺🇸" },
  { code: "gb", name: "United Kingdom", flag: "🇬🇧" },
  { code: "jp", name: "Japan", flag: "🇯🇵" },
  { code: "kr", name: "South Korea", flag: "🇰🇷" },
  { code: "ph", name: "Philippines", flag: "🇵🇭" },
  { code: "in", name: "India", flag: "🇮🇳" },
  { code: "br", name: "Brazil", flag: "🇧🇷" },
  { code: "mx", name: "Mexico", flag: "🇲🇽" },
  { code: "de", name: "Germany", flag: "🇩🇪" },
  { code: "fr", name: "France", flag: "🇫🇷" },
  { code: "es", name: "Spain", flag: "🇪🇸" },
  { code: "it", name: "Italy", flag: "🇮🇹" },
  { code: "nl", name: "Netherlands", flag: "🇳🇱" },
  { code: "au", name: "Australia", flag: "🇦🇺" },
  { code: "ca", name: "Canada", flag: "🇨🇦" },
  { code: "se", name: "Sweden", flag: "🇸🇪" },
  { code: "tr", name: "Turkey", flag: "🇹🇷" },
  { code: "ar", name: "Argentina", flag: "🇦🇷" },
];

const COUNTRY_COLORS = [
  "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30",
  "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30",
  "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30",
  "bg-pink-500/20 text-pink-300 hover:bg-pink-500/30",
  "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30",
  "bg-violet-500/20 text-violet-300 hover:bg-violet-500/30",
  "bg-orange-500/20 text-orange-300 hover:bg-orange-500/30",
  "bg-green-500/20 text-green-300 hover:bg-green-500/30",
  "bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30",
  "bg-teal-500/20 text-teal-300 hover:bg-teal-500/30",
];

const ITEM_WIDTH = 144;
const GAP = 16;
const SCROLL_STEP = (ITEM_WIDTH + GAP) * 3;

const tracksCache = new Map<string, { data: ChartTrack[]; expiresAt: number }>();
const CACHE_TTL = 30 * 60_000; // 30 minutes

export default function CountryCharts({ onAddToQueue }: Props) {
  const [selected, setSelected] = useState<Country | null>(null);
  const [tracks, setTracks] = useState<ChartTrack[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
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
    if (!selected) return;
    const cached = tracksCache.get(selected.code);
    if (cached && Date.now() < cached.expiresAt) {
      setTracks(cached.data);
      return;
    }
    setLoadingTracks(true);
    setTracks([]);
    api
      .get<ChartTrack[]>("/api/top-chart", { params: { country: selected.code } })
      .then(({ data }) => {
        const list = (data || []).slice(0, 25);
        setTracks(list);
        if (list.length > 0) {
          tracksCache.set(selected.code, { data: list, expiresAt: Date.now() + CACHE_TTL });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingTracks(false));
  }, [selected]);

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

  const handlePlay = async (track: ChartTrack) => {
    setAddingUrl(track.spotify_url);
    try {
      await onAddToQueue([track.spotify_url]);
    } finally {
      setAddingUrl(null);
    }
  };

  if (!selected) {
    return (
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-rose-500" />
          Country Top Tracks
        </h3>
        <p className="text-xs text-muted-foreground mb-4 ml-3">What's trending around the world 🌏</p>
        <div className="flex gap-2 flex-wrap">
          {COUNTRIES.map((c, i) => (
            <button
              key={c.code}
              onClick={() => setSelected(c)}
              className={
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 " +
                COUNTRY_COLORS[i % COUNTRY_COLORS.length]
              }
            >
              {c.flag} {c.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-rose-500" />
        <button
          onClick={() => { setSelected(null); setTracks([]); }}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Country Top Tracks
        </button>
        <span className="text-muted-foreground">/</span>
        <span>{selected.flag} {selected.name}</span>
        {loadingTracks && (
          <span className="w-3 h-3 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
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
        <p className="text-xs text-muted-foreground">No tracks found for this country.</p>
      ) : (
        <div className="group/country relative">
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
      )}
    </div>
  );
}
