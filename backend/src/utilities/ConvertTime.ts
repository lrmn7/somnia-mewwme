import { formatDuration } from "mstg-kit";

export class ConvertTime {
  parse(duration: number): string {
    return formatDuration(duration);
  }
}
