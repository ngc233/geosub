/** Evaluate the CSS token's cubic Bezier, including x inversion (time is not t). */
export function numberMotionProgress(progress: number, curve: readonly number[]): number {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  const coordinate = (t: number, a: number, b: number) => 3 * (1-t)**2 * t * a + 3 * (1-t) * t*t * b + t**3;
  let low = 0, high = 1;
  for (let i = 0; i < 24; i++) {
    const t = (low + high) / 2;
    if (coordinate(t, curve[0], curve[2]) < progress) low = t;
    else high = t;
  }
  return coordinate((low + high) / 2, curve[1], curve[3]);
}

export function parseNumberMotion(duration: string, easing: string) {
  const curve = easing.match(/^cubic-bezier\(([^)]+)\)$/)?.[1].split(",").map(Number);
  const time = duration.match(/^([\d.]+)(ms|s)$/);
  const ms = time ? Number(time[1]) * (time[2] === "s" ? 1000 : 1) : 0;
  if (!curve || curve.length !== 4 || curve.some(n => !Number.isFinite(n)) || ms <= 0) return null;
  return { ms, curve };
}
