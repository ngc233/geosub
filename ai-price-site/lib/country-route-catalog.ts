import { priorityCountries } from "./country-hubs.ts";
import { getLocalizedRegionName } from "./locale-format.ts";

// Complete ISO 3166-1 alpha-2 codes supported across App Store / public pricing.
const PUBLIC_COUNTRY_CODES = [
  "AE", "AR", "AT", "AU", "BE", "BG", "BH", "BO", "BR", "CA", "CH", "CL", "CN", "CO", "CR", "CY", "CZ",
  "DE", "DK", "DO", "DZ", "EC", "EE", "EG", "ES", "FI", "FR", "GB", "GH", "GR", "GT", "HK", "HN", "HR",
  "HU", "ID", "IE", "IL", "IN", "IS", "IT", "JM", "JO", "JP", "KE", "KH", "KR", "KW", "KZ", "LB", "LI",
  "LK", "LT", "LU", "LV", "MA", "MC", "MD", "MO", "MT", "MX", "MY", "NG", "NI", "NL", "NO", "NP", "NZ",
  "OM", "PA", "PE", "PH", "PK", "PL", "PT", "PY", "QA", "RO", "RS", "RU", "SA", "SE", "SG", "SI", "SK",
  "SV", "TH", "TN", "TR", "TW", "TZ", "UA", "UG", "US", "UY", "UZ", "VE", "VN", "ZA",
] as const;

export type PublicCountryEntry = {
  code: string;
  slug: string;
  zh: string;
  en: string;
};

function slugifyEnglishName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const byCode = new Map<string, PublicCountryEntry>();
const bySlug = new Map<string, PublicCountryEntry>();

for (const item of priorityCountries) {
  const entry: PublicCountryEntry = { code: item.code, slug: item.slug, zh: item.zh, en: item.en };
  byCode.set(entry.code, entry);
  bySlug.set(entry.slug, entry);
}

for (const code of PUBLIC_COUNTRY_CODES) {
  if (byCode.has(code)) continue;
  const en = getLocalizedRegionName(code, "en") ?? code;
  const zh = getLocalizedRegionName(code, "zh") ?? en;
  const slug = slugifyEnglishName(en);
  if (!slug || bySlug.has(slug)) continue;
  const entry: PublicCountryEntry = { code, slug, zh, en };
  byCode.set(code, entry);
  bySlug.set(slug, entry);
}

export function resolvePublicCountryBySlug(slug: string): PublicCountryEntry | undefined {
  if (!/^[a-z0-9-]{2,64}$/.test(slug)) return undefined;
  return bySlug.get(slug);
}

export function resolvePublicCountryByCode(code: string): PublicCountryEntry | undefined {
  return byCode.get(code.trim().toUpperCase());
}

export function getPublicCountryHref(code: string, locale: "zh" | "en" = "zh"): string | null {
  const entry = resolvePublicCountryByCode(code);
  return entry ? `/${locale}/countries/${entry.slug}` : null;
}
