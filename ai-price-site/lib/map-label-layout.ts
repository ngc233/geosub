export type MapLabelPoint = { x: number; y: number; width: number; height: number; preferRight?: boolean };
export function placeMapLabels(points: MapLabelPoint[], width = 900, height = 430) {
  const placed: { x: number; y: number; width: number; height: number; lineX: number; lineY: number }[] = [];
  for (const point of points) {
    const right = point.x + 18 + point.width <= width - 8;
    const left = point.x - 18 - point.width >= 8;
    const useRight = point.preferRight ? right || !left : !left && right;
    const x = useRight ? point.x + 18 : point.x - 18 - point.width;
    const candidates = [point.y - point.height / 2, point.y - point.height - 18, point.y + 18, point.y - point.height * 2 - 24];
    const positions = candidates.map(y => Math.max(8, Math.min(height - point.height - 8, y)));
    const overlaps = (y: number) => placed.reduce((sum, box) => sum + (x < box.x + box.width + 8 && x + point.width + 8 > box.x && y < box.y + box.height + 8 && y + point.height + 8 > box.y ? 1 : 0), 0);
    const y = positions.toSorted((a,b) => overlaps(a) - overlaps(b) || Math.abs(a + point.height / 2 - point.y) - Math.abs(b + point.height / 2 - point.y))[0];
    placed.push({ x, y, width: point.width, height: point.height, lineX: useRight ? x : x + point.width, lineY: Math.max(y + 8, Math.min(y + point.height - 8, point.y)) });
  }
  return placed;
}
