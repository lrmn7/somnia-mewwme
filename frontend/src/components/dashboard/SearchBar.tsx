import { useState, useRef, useEffect, useCallback } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { PlusIcon, MusicalNoteIcon } from "@heroicons/react/24/solid";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { SearchResult, SearchTrack } from "@/types/player";

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Detect which music source a direct URL belongs to. Returns source id or null.
function detectUrlSource(query: string): string | null {
  try {
    if (!/^https?:\/\//i.test(query.trim())) return null;
    const url = new URL(query.trim());
    const host = url.hostname.toLowerCase();
    if (host.includes("spotify.com") || host.includes("spotify.link")) return "spotify";
    if (host.includes("music.apple.com")) return "apple";
    if (host.includes("soundcloud.com")) return "soundcloud";
    if (host.includes("deezer.com") || host.includes("deezer.page.link")) return "deezer";
    if (host.includes("tidal.com") || host.includes("listen.tidal.com")) return "tidal";
    if (host.includes("music.youtube.com")) return "youtube_music";
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    return null;
  } catch {
    return null;
  }
}

const SOURCE_DISPLAY_NAMES: Record<string, string> = {
  spotify: "Spotify",
  apple: "Apple Music",
  soundcloud: "SoundCloud",
  deezer: "Deezer",
  tidal: "Tidal",
  youtube: "YouTube",
  youtube_music: "YouTube Music",
};

interface Props {
  onAddToQueue: (uris: string[]) => Promise<void>;
  disabled?: boolean;
  defaultSource?: string;
  sourceAccess?: Record<string, { hasAccess: boolean; requirement: string }>;
  guildId?: string;
}

export default function SearchBar({ onAddToQueue, disabled, defaultSource = "spotify", sourceAccess, guildId }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [addingUri, setAddingUri] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const checkUrlBlocked = useCallback((q: string): string | null => {
    if (!sourceAccess) return null;
    const urlSource = detectUrlSource(q);
    if (!urlSource) return null;
    const access = sourceAccess[urlSource];
    if (access && !access.hasAccess) {
      const name = SOURCE_DISPLAY_NAMES[urlSource] ?? urlSource;
      const reqLabel =
        access.requirement.toLowerCase() === "voter"
          ? "a Top.gg vote"
          : `${access.requirement} access`;
      return `${name} links are not allowed in this server. This source requires ${reqLabel}.`;
    }
    return null;
  }, [sourceAccess]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    if (checkUrlBlocked(q)) {
      setResults([]);
      setShowResults(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const { data } = await api.get<SearchResult>("/api/search", {
        params: { identifier: q, source: defaultSource, guildId: guildId ?? "" },
        signal: controller.signal,
      });

      const seen = new Set<string>();
      const unique = (data.tracks || []).filter((t) => {
        if (seen.has(t.uri)) return false;
        seen.add(t.uri);
        return true;
      });

      setResults(unique.slice(0, 5));
      setShowResults(true);
    } catch (err: any) {
      if (err?.name !== "CanceledError") {
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, [defaultSource, checkUrlBlocked, guildId]);

  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const handleChange = (value: string) => {
    setQuery(value);
    clearTimeout(timerRef.current);

    if (value.trim()) {
      const blockMsg = checkUrlBlocked(value);
      if (blockMsg) {
        toast.error(blockMsg);
        setResults([]);
        setShowResults(false);
        return;
      }
    }

    timerRef.current = setTimeout(() => search(value), 400);
  };

  const handleAdd = async (track: SearchTrack) => {
    setAddingUri(track.uri);
    try {
      await onAddToQueue([track.uri]);
      toast.success(`Added to queue: ${track.title}`);
    } catch {
      toast.error("Failed to add track to queue.");
    } finally {
      setAddingUri(null);
    }
  };

  const sourceName = SOURCE_DISPLAY_NAMES[defaultSource] ?? defaultSource;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={`Search ${sourceName}…`}
          disabled={disabled}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:border-pink-500/50 focus:bg-white/[0.07] transition-all disabled:opacity-50"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-xl backdrop-blur-2xl border border-white/[0.08] shadow-2xl z-50 max-h-[60vh] sm:max-h-none overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-1.5 sm:p-0 space-y-1.5 sm:space-y-0 transition-colors duration-500 ease-in-out"
          style={{ backgroundColor: `rgba(var(--track-color, 15,15,20), 0.92)` }}
        >
          {results.map((track) => (
            <div
              key={track.uri}
              className="flex items-center gap-3 p-3.5 sm:p-3 hover:bg-white/10 active:bg-white/15 sm:active:bg-transparent transition-colors rounded-lg sm:rounded-none bg-white/[0.04] sm:bg-transparent min-h-[56px] sm:min-h-0"
            >
              {track.thumbnail ? (
                <img
                  src={track.thumbnail}
                  alt=""
                  className="w-11 h-11 sm:w-10 sm:h-10 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <MusicalNoteIcon className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[0.8125rem] sm:text-sm leading-5 text-foreground truncate">
                  {track.title}
                </p>
                <p className="text-xs leading-4 text-muted-foreground truncate mt-0.5">
                  {track.author} · {formatDuration(track.length)}
                </p>
              </div>
              <button
                onClick={() => handleAdd(track)}
                disabled={addingUri === track.uri || disabled}
                className="shrink-0 p-2.5 sm:p-2 rounded-lg bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 active:bg-pink-500/40 transition-colors disabled:opacity-50"
              >
                {addingUri === track.uri ? (
                  <div className="w-4 h-4 border-2 border-pink-400/30 border-t-pink-400 rounded-full animate-spin" />
                ) : (
                  <PlusIcon className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
