import { useEffect, useState, useCallback, useMemo } from "react";
import { FiRadio, FiChevronLeft, FiSearch, FiPlay, FiSquare, FiStar } from "react-icons/fi";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { RadioCountry, RadioStation } from "@/types/player";

interface Props {
  guildId: string;
  hasPlayer?: boolean;
  inVoice?: boolean | null;
  onRadioPlay?: () => void;
}

function CountryFlag({ code, size = 24, className = "" }: { code: string; size?: number; className?: string }) {
  if (!code || code.length !== 2) {
    return <FiRadio className={`text-white/30 ${className}`} style={{ width: size * 0.6, height: size * 0.6 }} />;
  }
  return (
    <img
      src={`https://flagcdn.com/w80/${code.toLowerCase()}.png`}
      alt={code}
      width={size}
      height={Math.round(size * 0.75)}
      className={`object-cover rounded-sm ${className}`}
      onError={(e) => {
        const el = e.target as HTMLImageElement;
        el.style.display = "none";
        if (el.parentElement) {
          const span = document.createElement("span");
          span.textContent = code.toUpperCase();
          span.className = "text-[10px] font-bold text-white/40";
          el.parentElement.appendChild(span);
        }
      }}
    />
  );
}

function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}

export default function RadioView({ guildId, inVoice, onRadioPlay }: Props) {
  const [countries, setCountries] = useState<RadioCountry[]>([]);
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<RadioCountry | null>(null);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStations, setLoadingStations] = useState(false);
  const [playingStationId, setPlayingStationId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stationSearch, setStationSearch] = useState("");

  useEffect(() => {
    setLoadingCountries(true);
    api
      .get<RadioCountry[]>("/api/radio/countries")
      .then(({ data }) => setCountries(data))
      .catch(() => toast.error("Failed to load radio countries."))
      .finally(() => setLoadingCountries(false));
  }, []);

  const handleSelectCountry = useCallback((country: RadioCountry) => {
    setSelectedCountry(country);
    setStations([]);
    setStationSearch("");
    setLoadingStations(true);
    api
      .get<RadioStation[]>("/api/radio/stations", { params: { country: country.name } })
      .then(({ data }) => setStations(data))
      .catch(() => toast.error("Failed to load radio stations."))
      .finally(() => setLoadingStations(false));
  }, []);

  const handlePlay = useCallback(
    async (station: RadioStation) => {
      if (inVoice === false) {
        toast.warning("Join a voice channel first to play radio.");
        return;
      }
      setPlayingStationId(station.id);
      try {
        await api.post("/api/radio/play", {
          guildId,
          stationUrl: station.url,
          stationName: station.name,
        });
        toast.success(`Now playing: ${station.name}`);
        onRadioPlay?.();
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } } };
        toast.error(err?.response?.data?.error ?? "Failed to play radio station.");
        setPlayingStationId(null);
      }
    },
    [guildId, inVoice, onRadioPlay]
  );

  const handleStopRadio = useCallback(async () => {
    try {
      await api.post("/api/radio/stop", { guildId });
      setPlayingStationId(null);
      toast.success("Radio stopped.");
    } catch {
      toast.error("Failed to stop radio.");
    }
  }, [guildId]);

  const filteredCountries = useMemo(
    () =>
      countries.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.toLowerCase().includes(search.toLowerCase())
      ),
    [countries, search]
  );

  const filteredStations = useMemo(
    () =>
      stations.filter(
        (s) =>
          s.name.toLowerCase().includes(stationSearch.toLowerCase()) ||
          s.tags.toLowerCase().includes(stationSearch.toLowerCase())
      ),
    [stations, stationSearch]
  );

  const countryRank = useMemo(() => {
    if (!selectedCountry) return 0;
    const sorted = [...countries].sort((a, b) => b.stationcount - a.stationcount);
    return sorted.findIndex((c) => c.code === selectedCountry.code) + 1;
  }, [countries, selectedCountry]);

  if (!selectedCountry) {
    return (
      <div className="flex flex-col flex-1 min-h-0 p-3 sm:p-6 gap-4 sm:gap-5">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-2.5 mb-1">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <FiRadio className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl font-extrabold text-white leading-tight">Radio Explorer</h1>
              </div>
            </div>
            <p className="text-[11px] sm:text-xs text-white/40 mt-1">
              Broadcast live from <span className="text-white/70 font-semibold">{countries.length}+</span> countries globally
            </p>
          </div>
          <div className="flex items-center">
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Direct Frequencies
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            type="text"
            placeholder="Find country by name or code"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:max-w-md rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/25 outline-none transition focus:border-emerald-500/40 focus:bg-white/[0.05]"
          />
        </div>

        {/* Country grid */}
        {loadingCountries ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-emerald-500" />
              <p className="text-xs text-white/40">Scanning frequencies...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 sm:gap-2 overflow-y-auto scrollbar-none flex-1 min-h-0 content-start">
            {filteredCountries.map((country) => (
              <button
                key={country.code || country.name}
                onClick={() => handleSelectCountry(country)}
                className="group flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left transition-all hover:bg-white/[0.06] hover:border-white/[0.12] active:scale-[0.98]"
              >
                {/* Flag */}
                <div className="flex h-7 w-9 shrink-0 items-center justify-center rounded overflow-hidden bg-white/[0.06]">
                  <CountryFlag code={country.code} size={36} className="h-full w-full" />
                </div>
                {/* Name + count */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate leading-tight">{country.name}</p>
                  <p className="text-[10px] text-emerald-400/70 font-medium mt-0.5">
                    # {fmtNum(country.stationcount)}
                  </p>
                </div>
                {/* Code */}
                <span className="text-[10px] font-bold text-white/20 shrink-0 uppercase">
                  {country.code}
                </span>
              </button>
            ))}
            {filteredCountries.length === 0 && (
              <div className="col-span-full flex flex-col items-center gap-3 py-16">
                <FiSearch className="h-8 w-8 text-white/15" />
                <p className="text-xs text-white/40">
                  No countries found matching &quot;{search}&quot;
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-0">
      {/* Sidebar */}
      <div className="shrink-0 lg:w-72 xl:w-80 border-b lg:border-b-0 lg:border-r border-white/[0.06] bg-white/[0.015]">
        <div className="p-3 sm:p-6 flex flex-col gap-3 sm:gap-5">
          {/* Back button */}
          <button
            onClick={() => { setSelectedCountry(null); setStations([]); setStationSearch(""); }}
            className="flex items-center gap-2 text-xs font-medium text-white/50 transition hover:text-white group w-fit"
          >
            <FiChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back to Countries
          </button>

          {/* Country info */}
          <div className="flex items-center gap-3 lg:flex-col lg:items-center lg:text-center lg:gap-3">
            {/* Flag */}
            <div className="flex h-12 w-16 sm:h-14 sm:w-20 lg:h-20 lg:w-28 shrink-0 items-center justify-center rounded-xl lg:rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
              <CountryFlag code={selectedCountry.code} size={80} className="h-full w-full object-cover" />
            </div>
            {/* Name + badge + stats */}
            <div className="flex-1 min-w-0 lg:flex lg:flex-col lg:items-center lg:gap-2">
              <div className="flex items-center gap-2 lg:flex-col lg:gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white leading-tight truncate">{selectedCountry.name}</h2>
                <span className="hidden lg:inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  {selectedCountry.code}
                </span>
              </div>
              {/* Compact stats */}
              <div className="flex items-center gap-3 mt-1 lg:hidden">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-semibold text-white/70">
                  <FiRadio className="h-2.5 w-2.5 text-emerald-400" />
                  {fmtNum(selectedCountry.stationcount)} stations
                </span>
                {countryRank > 0 && (
                  <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    #{countryRank}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Detailed stats */}
          <div className="hidden lg:flex flex-col gap-3">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Total Stations</p>
              <p className="text-2xl font-extrabold text-white mt-1">{fmtNum(selectedCountry.stationcount)}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Global Rank</p>
              <p className="text-lg font-bold text-white mt-1">
                {countryRank > 0 ? `#${countryRank}` : "\u2014"}
                <span className="text-xs font-medium text-white/40 ml-2">Region Active</span>
              </p>
            </div>
          </div>

          {/* Search + stop */}
          <div className="flex gap-2 lg:flex-col lg:gap-3">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
              <input
                type="text"
                placeholder="Search stations..."
                value={stationSearch}
                onChange={(e) => setStationSearch(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-4 text-xs text-white placeholder-white/25 outline-none transition focus:border-emerald-500/40 focus:bg-white/[0.05]"
              />
            </div>
            {playingStationId && (
              <button
                onClick={handleStopRadio}
                className="flex items-center justify-center gap-2 shrink-0 lg:w-full rounded-xl border border-red-500/30 bg-red-500/10 px-3 lg:px-4 py-2 lg:py-2.5 text-xs font-bold text-red-400 uppercase tracking-wider transition hover:bg-red-500/20 active:scale-[0.98]"
              >
                <FiSquare className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Stop Radio</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Station list */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <div className="shrink-0 px-3 sm:px-5 pt-3 sm:pt-5 pb-2 sm:pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/50">Available Frequencies</h3>
          </div>
          <span className="text-[10px] font-medium text-white/40">
            {filteredStations.length} result{filteredStations.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loadingStations ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-emerald-500" />
              <p className="text-xs text-white/40">Tuning in...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto scrollbar-none px-2 sm:px-3 pb-4">
            <div className="flex flex-col gap-1 sm:gap-1.5">
              {filteredStations.map((station) => {
                const isPlaying = playingStationId === station.id;
                const qualityLabel =
                  station.codec && station.bitrate > 0
                    ? `${station.codec} \u00b7 ${station.bitrate}kbps`
                    : station.codec || (station.bitrate > 0 ? `${station.bitrate}kbps` : null);

                return (
                  <div
                    key={station.id}
                    className={`group flex items-center gap-2 sm:gap-3 rounded-xl px-2.5 sm:px-3.5 py-2.5 sm:py-3 transition-all ${
                      isPlaying
                        ? "bg-emerald-500/[0.08] border border-emerald-500/20"
                        : "border border-transparent hover:bg-white/[0.04] hover:border-white/[0.06]"
                    }`}
                  >
                    <div className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl overflow-hidden ${
                      isPlaying ? "bg-emerald-500/15 border border-emerald-500/20" : "bg-white/[0.05] border border-white/[0.06]"
                    }`}>
                      {station.favicon ? (
                        <img
                          src={station.favicon}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const el = e.target as HTMLImageElement;
                            el.style.display = "none";
                          }}
                        />
                      ) : (
                        <FiRadio className={`h-4 w-4 ${isPlaying ? "text-emerald-400" : "text-white/30"}`} />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <p className={`text-[13px] sm:text-sm font-semibold truncate ${isPlaying ? "text-emerald-400" : "text-white"}`}>
                          {station.name}
                        </p>
                        {isPlaying && (
                          <span className="flex items-center gap-1 shrink-0">
                            <span className="flex gap-[2px] items-end h-3">
                              <span className="w-[3px] rounded-full bg-emerald-400 animate-pulse" style={{ height: "40%", animationDelay: "0ms" }} />
                              <span className="w-[3px] rounded-full bg-emerald-400 animate-pulse" style={{ height: "80%", animationDelay: "150ms" }} />
                              <span className="w-[3px] rounded-full bg-emerald-400 animate-pulse" style={{ height: "55%", animationDelay: "300ms" }} />
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {qualityLabel && (
                          <span className="text-[10px] text-white/40">{qualityLabel}</span>
                        )}
                        {station.votes > 0 && (
                          <>
                            {qualityLabel && <span className="text-white/10">&middot;</span>}
                            <span className="flex items-center gap-0.5 text-[10px] text-amber-400/70">
                              <FiStar className="h-2.5 w-2.5" />
                              {fmtNum(station.votes)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* LIVE badge */}
                    <div className="hidden sm:flex items-center shrink-0">
                      <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        isPlaying
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-white/[0.04] text-white/30 border border-white/[0.06]"
                      }`}>
                        Live
                      </span>
                    </div>

                    {/* Play / Stop button */}
                    <div className="shrink-0">
                      {isPlaying ? (
                        <button
                          onClick={handleStopRadio}
                          className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 transition hover:bg-red-500/20 active:scale-90"
                        >
                          <FiSquare className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePlay(station)}
                          className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/50 transition hover:bg-emerald-500/15 hover:text-emerald-400 hover:border-emerald-500/30 active:scale-90"
                        >
                          <FiPlay className="h-3 w-3 sm:h-3.5 sm:w-3.5 ml-0.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredStations.length === 0 && !loadingStations && (
                <div className="flex flex-col items-center gap-3 py-16">
                  <FiRadio className="h-8 w-8 text-white/15" />
                  <p className="text-xs text-white/40">
                    {stationSearch
                      ? `No stations found matching "${stationSearch}"`
                      : "No stations available for this country."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
