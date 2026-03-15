export function ProgressBar(current: number, total: number, size: number = 20): string {
  const percent = Math.round((current / total) * 100);
  const filledSize = Math.round((size * current) / total);
  const filledBar = "🟩".repeat(filledSize);
  const emptyBar = "⬜".repeat(size - filledSize);
  return `${filledBar}${emptyBar} ${percent}%`;
}
