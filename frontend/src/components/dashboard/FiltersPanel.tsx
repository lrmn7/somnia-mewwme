import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import type { FilterPreset } from "@/types/player";
import {
  PiMoonStarsFill,
  PiSunHorizonFill,
  PiLightningFill,
  PiHourglassFill,
  PiFastForwardFill,
  PiSpeakerHighFill,
  PiSlidersHorizontalFill,
  PiMicrophoneStageFill,
  PiHeadphonesFill,
  PiCloudFill,
  PiWaveSineFill,
  PiMusicNoteFill,
  PiWavesLight,
  PiSpeakerLowFill,
  PiEqualizerFill,
  PiMusicNotesFill,
  PiVinylRecordFill,
  PiRadioFill,
  PiConfettiFill,
  PiChartBarFill,
  PiFireFill,
  PiFlagBannerFill,
  PiTreeFill,
  PiSkullFill,
} from "react-icons/pi";

const FILTER_PRESETS: FilterPreset[] = [
  // Speed
  { key: "nightcore", label: "Nightcore", icon: PiMoonStarsFill, description: "Fast, high-pitched anime style", category: "Speed" },
  { key: "daycore", label: "Daycore", icon: PiSunHorizonFill, description: "Slow, dreamy low-pitch", category: "Speed" },
  { key: "speed", label: "Speed", icon: PiLightningFill, description: "Sped-up playback", category: "Speed" },
  { key: "slow", label: "Slow", icon: PiHourglassFill, description: "Slowed-down playback", category: "Speed" },
  { key: "doubletime", label: "Double Time", icon: PiFastForwardFill, description: "1.16x speed boost", category: "Speed" },
  { key: "pitch", label: "High Pitch", icon: PiSpeakerHighFill, description: "Triple pitch, chipmunk-like", category: "Speed" },
  { key: "rate", label: "Fast Rate", icon: PiSlidersHorizontalFill, description: "Double playback rate", category: "Speed" },
  // Vocal
  { key: "karaoke", label: "Karaoke", icon: PiMicrophoneStageFill, description: "Suppress vocals, keep instrumentals", category: "Vocal" },
  { key: "eightD", label: "8D Audio", icon: PiHeadphonesFill, description: "Audio rotates around your head", category: "Vocal" },
  // Effects
  { key: "soft", label: "Soft", icon: PiCloudFill, description: "Smooth low-pass filter", category: "Effects" },
  { key: "tremolo", label: "Tremolo", icon: PiWaveSineFill, description: "Oscillating volume wobble", category: "Effects" },
  { key: "vibrato", label: "Vibrato", icon: PiMusicNoteFill, description: "Oscillating pitch wobble", category: "Effects" },
  { key: "vaporwave", label: "Vaporwave", icon: PiWavesLight, description: "Lo-fi aesthetic, slowed & wobbly", category: "Effects" },
  // Equalizer
  { key: "bass", label: "Bass Boost", icon: PiSpeakerLowFill, description: "Enhanced low-end frequencies", category: "Equalizer" },
  { key: "treblebass", label: "Treble+Bass", icon: PiEqualizerFill, description: "Boosted highs and lows", category: "Equalizer" },
  { key: "pop", label: "Pop", icon: PiMusicNotesFill, description: "Bright, clear pop EQ", category: "Equalizer" },
  { key: "electronic", label: "Electronic", icon: PiVinylRecordFill, description: "Crisp electronic EQ", category: "Equalizer" },
  { key: "radio", label: "Radio", icon: PiRadioFill, description: "Classic radio tone EQ", category: "Equalizer" },
  { key: "party", label: "Party", icon: PiConfettiFill, description: "Fun party-style EQ", category: "Equalizer" },
  { key: "equalizer", label: "Flat EQ", icon: PiChartBarFill, description: "Balanced flat equalizer", category: "Equalizer" },
  { key: "earrape", label: "Earrape", icon: PiFireFill, description: "Extreme volume — use with caution!", category: "Equalizer" },
  // Character
  { key: "china", label: "China", icon: PiFlagBannerFill, description: "High-pitched, fast rate", category: "Character" },
  { key: "chimpunk", label: "Chipmunk", icon: PiTreeFill, description: "Squeaky chipmunk voice", category: "Character" },
  { key: "darthvader", label: "Darth Vader", icon: PiSkullFill, description: "Deep, dark voice effect", category: "Character" },
];

const CATEGORIES = Array.from(new Set(FILTER_PRESETS.map((p) => p.category)));

interface Props {
  open: boolean;
  onClose: () => void;
  activeFilter: string | null;
  hasAccess: boolean;
  requirement?: string;
  voteUrl?: string | null;
  onApply: (preset: string) => Promise<void>;
  onClear: () => Promise<void>;
}

export default function FiltersPanel({
  open,
  onClose,
  activeFilter,
  hasAccess,
  requirement = "Premium",
  voteUrl,
  onApply,
  onClear,
}: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  async function handleSelect(preset: FilterPreset) {
    if (loading || !hasAccess) return;
    if (activeFilter === preset.key) {
      setLoading("clear");
      try {
        await onClear();
        toast.success("Filter removed");
      } catch {
        toast.error("Failed to clear filter");
      } finally {
        setLoading(null);
      }
      return;
    }
    setLoading(preset.key);
    try {
      await onApply(preset.key);
      toast.success(`${preset.label} filter applied`);
    } catch {
      toast.error(`Failed to apply ${preset.label}`);
    } finally {
      setLoading(null);
    }
  }

  async function handleClear() {
    if (loading || !activeFilter || !hasAccess) return;
    setLoading("clear");
    try {
      await onClear();
      toast.success("All filters cleared");
    } catch {
      toast.error("Failed to clear filters");
    } finally {
      setLoading(null);
    }
  }

  if (!open) return null;

  const isMaintenance = requirement === "Admin" || requirement === "Owner";
  const isVoter = requirement === "Voter";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        ref={panelRef}
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-white/[0.08] bg-[#0e0e10]/95 backdrop-blur-2xl shadow-2xl overflow-hidden"
      >
        {/* Access gate overlay */}
        {!hasAccess && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 bg-black/40 backdrop-blur-[1px] rounded-t-3xl sm:rounded-3xl pointer-events-auto">
            <svg className="h-8 w-8 text-white/70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <h3 className="text-lg font-bold text-white">
              {isMaintenance ? "This Feature is Under Maintenance" : isVoter ? "Vote Required" : "Premium Plan Required"}
            </h3>
            {isMaintenance ? (
              <p className="text-xs text-white/50 text-center px-4">This feature is currently unavailable. Please try again later.</p>
            ) : (
              <a
                href={isVoter ? (voteUrl ?? "/topgg") : "/premium"}
                target={isVoter ? "_blank" : undefined}
                rel={isVoter ? "noopener noreferrer" : undefined}
                className="relative flex items-center gap-1 overflow-hidden rounded-lg border border-white/10 bg-white/[0.08] backdrop-blur-md px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/[0.15] hover:border-white/25 active:scale-95"
              >
                <span className="relative z-10">{isVoter ? "Vote on Top.gg" : "Get Premium"}</span>
              </a>
            )}
          </div>
        )}

        {/* Header */}
        <div className="relative z-30 flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Audio Filters</h2>
              <p className="text-xs text-white/40">
                {activeFilter
                  ? <>Active: <span className="text-purple-400 font-semibold">{FILTER_PRESETS.find(p => p.key === activeFilter)?.label ?? activeFilter}</span></>
                  : "No filter applied"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeFilter && (
              <button
                onClick={handleClear}
                disabled={!!loading}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 hover:border-red-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                {loading === "clear" ? (
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                )}
                Reset
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="Close filters"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className={`scrollbar-none flex-1 overflow-y-auto px-6 py-4 space-y-5${!hasAccess ? " pointer-events-none" : ""}`}>
          {CATEGORIES.map((cat) => (
            <section key={cat}>
              <h3 className="mb-2.5 text-xs font-bold uppercase tracking-widest text-white/30">{cat}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {FILTER_PRESETS.filter((p) => p.category === cat).map((preset) => {
                  const isActive = activeFilter === preset.key;
                  const isLoading = loading === preset.key;
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.key}
                      onClick={() => void handleSelect(preset)}
                      disabled={!hasAccess || (!!loading && loading !== preset.key)}
                      title={preset.description}
                      className={[
                        "group relative flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-3.5 text-center transition-all duration-150",
                        "hover:scale-[1.03] active:scale-[0.97]",
                        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100",
                        isActive
                          ? "border-purple-500/60 bg-purple-500/15 shadow-lg shadow-purple-500/10"
                          : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.15] hover:bg-white/[0.06]",
                      ].join(" ")}
                    >
                      {/* Active indicator dot */}
                      {isActive && (
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50" />
                      )}

                      {/* Loading spinner overlay */}
                      {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30 backdrop-blur-[2px]">
                          <svg className="h-5 w-5 animate-spin text-purple-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        </div>
                      )}

                      <Icon className={`h-6 w-6 ${isActive ? "text-purple-400" : "text-white/60 group-hover:text-white/80"} transition-colors`} />
                      <span className={`text-xs font-bold leading-tight ${isActive ? "text-purple-300" : "text-white"}`}>
                        {preset.label}
                      </span>
                      <span className="text-[10px] leading-tight text-white/30 line-clamp-2">
                        {preset.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Footer hint */}
        <div className={`px-6 py-3 border-t border-white/[0.06] text-center${!hasAccess ? " pointer-events-none" : ""}`}>
          <p className="text-[10px] text-white/25">
            Click an active filter to toggle it off &middot; Filters apply instantly to the current session
          </p>
        </div>
      </div>
    </div>
  );
}
