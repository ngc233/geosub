import { editions, type Edition, type Market } from "./game-offers.ts";
import { savingsPercent } from "./homepage-display.ts";

const consoles = ["ps5", "xbox"] as const;
type Console = (typeof consoles)[number];

// The reader supplies fresh, approved GTA 6 full-game public prices only.
export type HomepageGameQuote = { platform: Console; edition: Edition; market: Market; price: string };
export type HomepageGameSavings = { platform: Console; edition: Edition; percent: number };
type GameComparison = Pick<HomepageGameQuote, "platform" | "edition"> & {
  hongKong: string | null;
  us: string | null;
  ratio: number | null;
};

function positivePrice(value: string | undefined): string | null {
  const price = Number(value);
  return value && Number.isFinite(price) && price > 0 ? value : null;
}

export function summarizeGta6HomepageOffers(quotes: readonly HomepageGameQuote[], hkdPerUsd: number): {
  showHongKongPromotion: boolean;
  savings: HomepageGameSavings | null;
  comparisons: GameComparison[];
} {
  const prices = new Map(quotes.map(({ platform, edition, market, price }) => [`${platform}:${edition}:${market}`, price]));
  const validRate = Number.isFinite(hkdPerUsd) && hkdPerUsd > 0;
  const comparisons = editions.flatMap((edition) => consoles.map((platform) => {
    const hongKong = positivePrice(prices.get(`${platform}:${edition}:HK`));
    const us = positivePrice(prices.get(`${platform}:${edition}:US`));
    const ratio = hongKong !== null && us !== null && validRate ? 1 - Number(hongKong) / hkdPerUsd / Number(us) : null;
    return { platform, edition, hongKong, us, ratio };
  }));
  const standard = comparisons.filter(({ edition }) => edition === "standard");
  const showHongKongPromotion = standard.every(({ hongKong }) => hongKong !== null);

  // A version enters the home headline only when both console comparisons are available.
  let best: (GameComparison & { ratio: number }) | null = null;
  for (const edition of editions) {
    const rows = comparisons.filter((row) => row.edition === edition);
    if (rows.some((row) => row.ratio === null)) continue;
    for (const row of rows) {
      if (row.ratio !== null && row.ratio > (best?.ratio ?? 0)) best = { ...row, ratio: row.ratio };
    }
  }
  const percent = best ? savingsPercent(best.ratio) : 0;
  const savings = best && percent > 0 ? { platform: best.platform, edition: best.edition, percent } : null;
  return { showHongKongPromotion, savings, comparisons };
}
