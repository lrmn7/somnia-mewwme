import { useState, useCallback, useRef, useEffect } from "react";
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
  const [localVol, setLocalVol] = useState(volume);
  const dragging = useRef(false);

  // Sync local state from prop when NOT dragging
  useEffect(() => {
    if (!dragging.current) setLocalVol(volume);
  }, [volume]);

  const toggleMute = useCallback(() => {
    if (localVol === 0) {
      const restored = prevVolume || 60;
      setLocalVol(restored);
      onVolumeChange(restored);
    } else {
      setPrevVolume(localVol);
      setLocalVol(0);
      onVolumeChange(0);
    }
  }, [localVol, prevVolume, onVolumeChange]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setLocalVol(val);
  }, []);

  const handlePointerDown = useCallback(() => {
    dragging.current = true;
  }, []);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
    onVolumeChange(localVol);
  }, [localVol, onVolumeChange]);

  const Icon = localVol === 0 ? SpeakerXMarkIcon : SpeakerWaveIcon;

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
            className="h-full bg-pink-500 rounded-full transition-[width] duration-75 ease-linear"
            style={{ width: `${localVol}%` }}
          />
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={localVol}
          onInput={handleInput}
          onChange={handleInput}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
        {localVol}%
      </span>
    </div>
  );
}
