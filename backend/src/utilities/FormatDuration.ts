import { formatDuration } from "mstg-kit";

export class FormatDuration {
  parse(duration: number | undefined) {
    if (typeof duration === "undefined") return "00:00";
    if (duration > 3600000000) return "Live Stream";
    return formatDuration(duration);
  }
}
