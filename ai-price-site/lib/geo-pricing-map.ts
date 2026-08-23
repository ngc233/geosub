export const GEO_PRICING_MAP_COLORS = {
  noData: "#f2f4f3",
  outline: "#ffffff",
  deepestSaving: "#a3e635",
  saving: "#d9edb6",
  nearBenchmark: "#dde1de",
  aboveBenchmark: "#edc9c0",
  highestPremium: "#d07a63",
  benchmarkPin: "#525a55",
  savingPin: "#84cc16",
} as const;

export type GeoPriceBand =
  | "no-data"
  | "deep-saving"
  | "saving"
  | "benchmark"
  | "premium"
  | "high-premium";

export function getGeoPriceDifference(price: number, benchmark: number) {
  if (benchmark <= 0) return 0;
  return Math.round(((price - benchmark) / benchmark) * 100);
}

export function getGeoPriceBand(diffPercent?: number): GeoPriceBand {
  if (typeof diffPercent !== "number") return "no-data";
  if (diffPercent <= -15) return "deep-saving";
  if (diffPercent <= -6) return "saving";
  if (diffPercent < 6) return "benchmark";
  if (diffPercent < 15) return "premium";
  return "high-premium";
}

export function getGeoPriceFill(diffPercent?: number) {
  const band = getGeoPriceBand(diffPercent);
  if (band === "deep-saving") return GEO_PRICING_MAP_COLORS.deepestSaving;
  if (band === "saving") return GEO_PRICING_MAP_COLORS.saving;
  if (band === "benchmark") return GEO_PRICING_MAP_COLORS.nearBenchmark;
  if (band === "premium") return GEO_PRICING_MAP_COLORS.aboveBenchmark;
  if (band === "high-premium") return GEO_PRICING_MAP_COLORS.highestPremium;
  return GEO_PRICING_MAP_COLORS.noData;
}
