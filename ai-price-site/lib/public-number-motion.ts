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

/** Compute a width-stable starting value for restrained initial hero count-up. */
export function countInStartValue(value: number, fractionDigits = 2): number {
  if (!Number.isFinite(value) || value === 0) return 0;
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  if (fractionDigits === 0) {
    const whole = Math.round(abs);
    if (whole < 10) return 0;
    const floorPower = 10 ** Math.floor(Math.log10(whole));
    const candidate = Math.max(Math.floor(whole * 0.38), floorPower);
    return sign * (candidate >= whole ? Math.max(1, Math.floor(whole * 0.55)) : candidate);
  }
  if (abs < 1) return sign * (abs * 0.42);
  const floorPower = 10 ** Math.floor(Math.log10(abs));
  const scaled = abs * 0.38;
  const candidate = Math.max(scaled, floorPower);
  return sign * (candidate >= abs * 0.92 ? abs * 0.58 : candidate);
}
