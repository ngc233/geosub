export const homepageMapWidth = 600;
export const homepageMapHeight = 220;

type Dot = { code: string; x: number; y: number; radius: number };

const offsets: {x:number; y:number; distance:number}[] = [];
for (let x = -36; x <= 36; x += 2) {
  for (let y = -36; y <= 36; y += 2) {
    const distance = x * x + y * y;
    if (distance <= 36 * 36) offsets.push({ x, y, distance });
  }
}
offsets.sort((a, b) => a.distance - b.distance);

/** Move crowded visual markers only. The original coordinates are used for leader lines. */
export function spaceHomepageMapDots(dots: Dot[], width: number, height: number, lowest: string) {
  const clear = (a: Dot, b: Dot) => Math.hypot(a.x - b.x, a.y - b.y) >= a.radius + b.radius + 2;
  const settled = dots.filter(dot => dots.every(other => other === dot || clear(dot, other)));
  const priority = (code: string) => code === lowest ? 0 : code === "US" ? 1 : 2;
  const crowded = dots.filter(dot => !settled.includes(dot))
    .sort((a, b) => priority(a.code) - priority(b.code) || a.code.localeCompare(b.code));

  for (const dot of crowded) {
    const moved = offsets.find(offset => {
      const candidate = { ...dot, x: dot.x + offset.x, y: dot.y + offset.y };
      return candidate.x >= dot.radius && candidate.x <= width - dot.radius
        && candidate.y >= dot.radius && candidate.y <= height - dot.radius
        && settled.every(other => clear(candidate, other));
    });
    settled.push(moved ? { ...dot, x: dot.x + moved.x, y: dot.y + moved.y } : dot);
  }
  return new Map(settled.map(dot => [dot.code, [
    dot.x / width * homepageMapWidth,
    dot.y / height * homepageMapHeight,
  ]]));
}
