/** CSS minifiers may turn 4500ms into 4.5s. Timers always require milliseconds.
 * Reject invalid/overflowing delays instead of accidentally starting a fast loop. */
export function parseCarouselDuration(value: string): number | null {
  const match = value.trim().match(/^(\d*\.?\d+)(ms|s)$/);
  if (!match) return null;
  const milliseconds = Number(match[1]) * (match[2] === "s" ? 1000 : 1);
  return Number.isFinite(milliseconds) && milliseconds > 0 && milliseconds <= 2_147_483_647
    ? milliseconds : null;
}
