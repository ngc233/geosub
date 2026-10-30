import type { Metadata } from "next";
import { getPriorityCountry, priorityCountries, type HubLocale } from "./country-hubs.ts";
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

export async function getCountryHubMetadata(
  locale: HubLocale,
  slug: string | null,
  readRows: ReadRows,
  preview = isCountryHubIndexPreview(),
): Promise<Metadata> {
  const country = slug === null ? undefined : getPriorityCountry(slug);
  const path = slug === null ? "/countries" : `/countries/${slug}`;
  const canonical = `/${locale}${path}`;
  let index = false;
  if (!preview && hubLocales.includes(locale)) {
    try {
      if (country) index = countryHubIsIndexable(country.slug, await readRows(country.code));
      else if (slug === null) index = (await getIndexableCountryHubPaths(readRows, preview)).includes(canonical);
    } catch {
      // The public template renders its unavailable state when the same read fails.
    }
  }

  const title = country
    ? (locale === "zh" ? `${country.zh} App Store 月付订阅价格对比` : `${country.en} App Store subscription prices by plan`)
    : (locale === "zh" ? "按国家比较 App Store 月付订阅价格" : "Compare monthly App Store subscription prices by country");
  const description = country
    ? (locale === "zh" ? `查看${country.zh}已核验的 App Store 月付订阅，比较本币标价、美国同档价格和采集日期。`
      : `Explore verified monthly App Store plans for ${country.en}, with local prices, same-plan US comparisons and collection dates.`)
    : (locale === "zh" ? "比较土耳其、印度、菲律宾和日本的 App Store 月付订阅，查看各地收录的产品、套餐和价格来源。"
      : "Explore App Store subscription prices in Turkey, India, the Philippines and Japan with verified plans and dated sources.");

  return {
    title, description,
    robots: { index, follow: true },
    alternates: {
      canonical,
      ...(index ? { languages: { "zh-CN": `/zh${path}`, "en-US": `/en${path}`, "x-default": `/en${path}` } } : {}),
    },
  };
}
