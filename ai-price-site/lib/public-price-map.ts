export type PublicMapRegion = { code: string; country: string; priceUsd: number };
export type PublicMapBand = "no-data" | "covered" | "lower" | "same" | "higher" | "reference";

// Canonical USD values decide the color; presentation currency never changes the comparison.
export function publicMapBand(region?: PublicMapRegion, us?: PublicMapRegion): PublicMapBand {
  if (!region || !Number.isFinite(region.priceUsd) || region.priceUsd <= 0) return "no-data";
  if (!us || !Number.isFinite(us.priceUsd) || us.priceUsd <= 0) return "covered";
  if (region.code.toUpperCase() === "US") return "reference";
  const cents = Math.round(region.priceUsd * 100) - Math.round(us.priceUsd * 100);
  return cents === 0 ? "same" : cents < 0 ? "lower" : "higher";
}

export function publicMapDifference(region: PublicMapRegion, us?: PublicMapRegion) {
  if (!us || us.priceUsd <= 0) return "美国基准缺失";
  if (region.code.toUpperCase() === "US") return "美国基准";
  if (publicMapBand(region, us) === "same") return "与美国相同";
  const difference = (region.priceUsd - us.priceUsd) / us.priceUsd * 100;
  const amount = Math.abs(difference) < 1 ? "不到 1" : String(Math.round(Math.abs(difference)));
  return `${difference < 0 ? "低于" : "高于"}美国 ${amount}%`;
}
