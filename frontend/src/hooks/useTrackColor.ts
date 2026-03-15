import { useEffect, useRef, useState } from "react";

/**
 * Extracts the dominant color from a track thumbnail URL using an offscreen canvas.
 * Returns an RGB string like "19,19,19" that can be used in rgba().
 * Falls back to a default dark color if extraction fails.
 */
const DEFAULT_COLOR = "15,15,20"; // fallback close to #0f0f14

export function useTrackColor(thumbnailUrl: string | null | undefined): string {
  const [color, setColor] = useState(DEFAULT_COLOR);
  const prevUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!thumbnailUrl || thumbnailUrl === prevUrl.current) return;
    prevUrl.current = thumbnailUrl;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = thumbnailUrl;

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        // Sample a small area for performance
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const data = ctx.getImageData(0, 0, size, size).data;
        let r = 0, g = 0, b = 0, count = 0;

        // Sample every 4th pixel for speed
        for (let i = 0; i < data.length; i += 16) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }

        if (count > 0) {
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);

          // Darken the color to keep readability (cap brightness)
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          if (brightness > 80) {
            const scale = 80 / brightness;
            r = Math.round(r * scale);
            g = Math.round(g * scale);
            b = Math.round(b * scale);
          }

          setColor(`${r},${g},${b}`);
        }
      } catch {
        // CORS or canvas error — keep previous color
      }
    };

    img.onerror = () => {
      // keep previous color on load failure
    };
  }, [thumbnailUrl]);

  return color;
}
