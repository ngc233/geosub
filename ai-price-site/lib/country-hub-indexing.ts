import type { Metadata } from "next";
import { getPriorityCountry, priorityCountries, type HubLocale } from "./country-hubs.ts";
import { getCountryDisplayName, resolvePublicCountryBySlug } from "./country-route-catalog.ts";
import { isSeoIndexableLocale } from "./seo-indexing-policy.ts";

const approvedSlugs: ReadonlySet<string> = new Set(["turkey", "india", "philippines", "japan"]);
const hubLocales = (["zh", "en"] as const).filter(isSeoIndexableLocale);
type CoverageRow = { productSlug: string; planSlug: string; difference: number | null };
type ReadRows = (countryCode: string) => Promise<readonly CoverageRow[]>;

export function isCountryHubIndexPreview() {
  return Boolean(process.env.GEOSUB_PRICE_EVIDENCE_PREVIEW);
}

// Rows already passed the public monthly App Store evidence and freshness checks.
export function countryHubIsIndexable(slug: string, rows: readonly CoverageRow[]) {
  if (!approvedSlugs.has(slug)) return false;
  const products = new Set<string>();
  const plans = new Set<string>();
  const comparable = new Set<string>();
  for (const row of rows) {
    const plan = `${row.productSlug}/${row.planSlug}`;
    products.add(row.productSlug);
    plans.add(plan);
    if (row.difference !== null && Number.isFinite(row.difference)) comparable.add(plan);
  }
  return products.size >= 5 && plans.size >= 10 && comparable.size >= 5;
}

export async function getIndexableCountryHubPaths(readRows: ReadRows, preview = isCountryHubIndexPreview()) {
  if (preview) return [];
  const candidates = priorityCountries.filter(country => approvedSlugs.has(country.slug));
  const ready = await Promise.all(candidates.map(async country =>
    countryHubIsIndexable(country.slug, await readRows(country.code)),
  ));
  const paths = candidates.filter((_, index) => ready[index]).map(country => `/countries/${country.slug}`);
  if (paths.length === approvedSlugs.size) paths.unshift("/countries");
  return hubLocales.flatMap(locale => paths.map(path => `/${locale}${path}`));
}

const countryHubSeoCopy: Record<
  HubLocale,
  {
    countryTitle: (name: string) => string;
    countryDesc: (name: string) => string;
    indexTitle: string;
    indexDesc: string;
  }
> = {
  zh: {
    countryTitle: (name) => `${name} App Store 月付订阅价格对比`,
    countryDesc: (name) => `查看${name}已核验的 App Store 月付订阅，比较本币标价、美国同档价格和采集日期。`,
    indexTitle: "按国家比较 App Store 月付订阅价格",
    indexDesc: "比较土耳其、印度、菲律宾和日本的 App Store 月付订阅，查看各地收录的产品、套餐和价格来源。",
  },
  "zh-tw": {
    countryTitle: (name) => `${name} App Store 月付訂閱價格對比`,
    countryDesc: (name) => `查看${name}已核驗的 App Store 月付訂閱，比較當地標價、美國同方案價格與採集日期。`,
    indexTitle: "按國家比較 App Store 月付訂閱價格",
    indexDesc: "比較土耳其、印度、菲律賓與日本的 App Store 月付訂閱，查看各地收錄的產品、方案與價格來源。",
  },
  en: {
    countryTitle: (name) => `${name} App Store subscription prices by plan`,
    countryDesc: (name) => `Explore verified monthly App Store plans for ${name}, with local prices, same-plan US comparisons and collection dates.`,
    indexTitle: "Compare monthly App Store subscription prices by country",
    indexDesc: "Explore App Store subscription prices in Turkey, India, the Philippines and Japan with verified plans and dated sources.",
  },
  ja: {
    countryTitle: (name) => `${name}の App Store 月額サブスク価格比較`,
    countryDesc: (name) => `${name}の確認済み App Store 月額プランを一覧比較。現地価格、米国の同一プランとの価格差、取得日を確認できます。`,
    indexTitle: "国・地域別の App Store 月額サブスク価格比較",
    indexDesc: "トルコ、インド、フィリピン、日本の App Store 月額サブスクリプション価格を検証済みプランと取得元データで比較します。",
  },
  ko: {
    countryTitle: (name) => `${name} App Store 월간 구독 가격 비교`,
    countryDesc: (name) => `${name}의 검증된 App Store 월간 요금제를 현지 가격, 미국 동일 요금제 비교 및 수집일과 함께 확인하세요.`,
    indexTitle: "국가별 App Store 월간 구독 가격 비교",
    indexDesc: "튀르키예, 인도, 필리핀, 일본의 검증된 App Store 월간 구독 가격과 출처 기록을 비교합니다.",
  },
  es: {
    countryTitle: (name) => `Precios mensuales de App Store en ${name} por plan`,
    countryDesc: (name) => `Consulta planes mensuales verificados de App Store en ${name}, con precios locales, comparación frente a EE. UU. y fechas de captura.`,
    indexTitle: "Comparar precios mensuales de suscripciones de App Store por país",
    indexDesc: "Explora precios verificados de suscripciones mensuales de App Store en Turquía, India, Filipinas y Japón con fuentes fechadas.",
  },
};

export async function getCountryHubMetadata(
  locale: HubLocale,
  slug: string | null,
  readRows: ReadRows,
  preview = isCountryHubIndexPreview(),
): Promise<Metadata> {
  const priorityCountry = slug === null ? undefined : getPriorityCountry(slug);
  const country = slug === null ? undefined : (priorityCountry ?? resolvePublicCountryBySlug(slug));
  const path = slug === null ? "/countries" : `/countries/${slug}`;
  const canonical = `/${locale}${path}`;
  let index = false;
  if (!preview && (hubLocales as readonly string[]).includes(locale)) {
    try {
      if (priorityCountry) index = countryHubIsIndexable(priorityCountry.slug, await readRows(priorityCountry.code));
      else if (slug === null) index = (await getIndexableCountryHubPaths(readRows, preview)).includes(canonical);
    } catch {
      // The public template renders its unavailable state when the same read fails.
    }
  }

  const seo = countryHubSeoCopy[locale];
  const countryLabel = country ? getCountryDisplayName(country, locale) : null;
  const title = countryLabel ? seo.countryTitle(countryLabel) : seo.indexTitle;
  const description = countryLabel ? seo.countryDesc(countryLabel) : seo.indexDesc;

  return {
    title, description,
    robots: { index, follow: true },
    alternates: {
      canonical,
      ...(index ? { languages: { "zh-CN": `/zh${path}`, "en-US": `/en${path}`, "x-default": `/en${path}` } } : {}),
    },
  };
}
