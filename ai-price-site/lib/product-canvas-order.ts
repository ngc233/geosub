import type { ProductCanvasModel } from "./product-canvas.ts";

// Client-safe arithmetic only; editorial dictionaries stay on the server.
export function productSaving(usd: number, usPrice?: number) {
  return usPrice !== undefined && usPrice > 0 ? 1 - usd / usPrice : null;
}
export function sortProductRows(rows: ProductCanvasModel["rows"], column: number, direction: "asc" | "desc") {
  return [...rows].sort((a, b) => {
    const av = a.cells[column]?.usd, bv = b.cells[column]?.usd;
    if (av === undefined || bv === undefined) return av === bv ? a.code.localeCompare(b.code) : av === undefined ? 1 : -1;
    return (av - bv) * (direction === "asc" ? 1 : -1) || a.code.localeCompare(b.code);
  });
}
