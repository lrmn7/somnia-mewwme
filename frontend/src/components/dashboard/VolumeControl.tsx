import { useState, useCallback } from "react";
import {
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from "@heroicons/react/24/solid";

interface Props {
  volume: number;
  onVolumeChange: (vol: number) => void;
}

export default function VolumeControl({ volume, onVolumeChange }: Props) {
  const [prevVolume, setPrevVolume] = useState(60);

  const toggleMute = useCallback(() => {
    if (volume === 0) {
      onVolumeChange(prevVolume || 60);
    } else {
      setPrevVolume(volume);
      onVolumeChange(0);
    }
  }, [volume, prevVolume, onVolumeChange]);

  const Icon = volume === 0 ? SpeakerXMarkIcon : SpeakerWaveIcon;
  const pct = volume;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleMute}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <Icon className="w-5 h-5" />
      </button>
      <div className="relative w-24 group">
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-pink-500 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => onVolumeChange(parseInt(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">
        {volume}%
      </span>
    </div>
  );
}
