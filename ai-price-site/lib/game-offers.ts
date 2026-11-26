import type { CanvasLocale } from "./canvas-ui-copy.ts";
import { isSupportedDisplayCurrency, type DisplayCurrency } from "./display-currency.ts";

export const platforms = ["ps5", "xbox", "pc"] as const;
export const currencies = ["CNY", "HKD", "USD"] as const;
export const editions = ["standard", "ultimate"] as const;
export const markets = ["HK", "US"] as const;
export type Platform = (typeof platforms)[number];
export type Currency = (typeof currencies)[number];
export type Edition = (typeof editions)[number];
export type Market = (typeof markets)[number];

export const names: Record<string, string> & {
  ps5: string;
  xbox: string;
  pc: string;
  HK: string;
  US: string;
  standard: string;
  ultimate: string;
  CNY: string;
  HKD: string;
  USD: string;
} = {
  ps5: "PS5",
  xbox: "Xbox",
  pc: "PC",
  HK: "香港",
  US: "美国",
  JP: "日本",
  TR: "土耳其",
  BR: "巴西",
  GB: "英国",
  TW: "台湾",
  KR: "韩国",
  SG: "新加坡",
  standard: "标准版",
  ultimate: "终极版",
  CNY: "人民币",
  HKD: "港元",
  USD: "美元",
};

export const signs: Record<string, string> & { CNY: string; HKD: string; USD: string } = {
  CNY: "¥",
  HKD: "HK$",
  USD: "US$",
  JPY: "JP¥",
  KRW: "₩",
  TWD: "NT$",
  SGD: "S$",
  GBP: "£",
  EUR: "€",
  TRY: "₺",
  BRL: "R$",
  CAD: "CA$",
  AUD: "A$",
};

export const msPerWeek = 7 * 24 * 60 * 60 * 1000;

export type GamePrice = {
  public_price: string;
  converted_public_price: string | null;
  base_price: string | null;
  member_price: string | null;
  member_tier: string | null;
  member_ends_at: string | null;
  promo_ends_at: string | null;
  included_in_subscription: boolean | null;
};

export type GameOffer = {
  market: Market;
  edition: Edition;
  store_product_id: string;
  store_url: string;
  currency: "HKD" | "USD";
  status: "fresh" | "stale_grace" | "never_verified" | "unavailable" | "stale_expired";
  verified_at: string | null;
  valid_until: string | null;
  tax_included: boolean | null;
  price: GamePrice | null;
};

export type GameResponse = {
  game: string;
  platform: Platform;
  platform_status: "listed" | "unannounced";
  display_currency: Currency;
  as_of: string;
  fx_as_of: string | null;
  next_change_at: string | null;
  full_games: GameOffer[];
  upgrades: GameOffer[];
};

export type Selection = {
  platform: Platform;
  edition: Edition;
  region: Market | "all";
  editionRegion: Market;
  currency: DisplayCurrency;
};

export const defaults: Selection = {
  platform: "ps5",
  edition: "standard",
  region: "all",
  editionRegion: "HK",
  currency: "CNY",
};

const editionLabelsByLocale: Record<CanvasLocale, Record<Edition, string>> = {
  zh: { standard: "标准版", ultimate: "终极版" },
  "zh-tw": { standard: "標準版", ultimate: "終極版" },
  en: { standard: "Standard Edition", ultimate: "Ultimate Edition" },
  ja: { standard: "通常版", ultimate: "アルティメット版" },
  ko: { standard: "스탠다드 에디션", ultimate: "얼티밋 에디션" },
  es: { standard: "Edición Estándar", ultimate: "Edición Definitiva" },
};

export function getGameEditionLabel(edition: Edition, locale: CanvasLocale = "zh"): string {
  return editionLabelsByLocale[locale]?.[edition] ?? editionLabelsByLocale.zh[edition];
}

export function getGamePlatformLabel(platform: Platform): string {
  return names[platform];
}

export function memberOf<T extends string>(options: readonly T[], value: unknown): value is T {
  return options.some((option) => option === value);
}

export function selectionFrom(
  params: URLSearchParams,
  defaultCurrency: DisplayCurrency = defaults.currency,
): Selection {
  const p = params.get("platform"),
    e = params.get("edition"),
    r = params.get("region"),
    er = params.get("editionRegion"),
    c = params.get("currency");
  return {
    platform: memberOf(platforms, p) ? p : defaults.platform,
    edition: memberOf(editions, e) ? e : defaults.edition,
    region: memberOf(markets, r) ? r : defaults.region,
    editionRegion: memberOf(markets, er) ? er : defaults.editionRegion,
    currency: c && isSupportedDisplayCurrency(c) ? c : defaultCurrency,
  };
}

export function localMoney(currency: string, value: string) {
  const prefix = signs[currency] ?? `${currency} `;
  return prefix + value.replace(/\.00$/, "");
}

export function currentOffer(row: GameOffer, at: number, data: GameResponse): GameOffer {
  if (row.valid_until && at >= Date.parse(row.valid_until))
    return { ...row, status: "stale_expired", price: null };
  if (!row.price) return row;
  const price = { ...row.price };
  if (price.member_ends_at && at >= Date.parse(price.member_ends_at)) {
    price.member_price = price.member_tier = price.member_ends_at = null;
  }
  if (
    row.currency !== data.display_currency &&
    (!data.fx_as_of || at >= Date.parse(data.fx_as_of) + msPerWeek)
  ) {
    price.converted_public_price = null;
  }
  return { ...row, price };
}
