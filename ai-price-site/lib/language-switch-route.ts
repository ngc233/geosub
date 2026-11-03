import { isSeoIndexableLocale } from "./seo-indexing-policy.ts";
import {
  replaceSiteLocaleInPath,
  stripSiteLocale,
  withSiteLocale,
  type SiteLocale,
} from "./site-locale.ts";

export function isCodexResetPath(pathname: string) {
  const path = stripSiteLocale(pathname.split(/[?#]/, 1)[0]);
  return /^\/tools\/codex-reset(?:\/rss\.xml)?\/?$/.test(path);
}

export function isBilingualEvidencePath(pathname: string) {
  return isCodexResetPath(pathname)
    || /^\/(?:countries|price-history|price-records)(?:\/|$)/.test(stripSiteLocale(pathname));
}

export function getLanguageSwitchHref(
  pathname: string,
  nextLocale: SiteLocale,
) {
  const relativePath = stripSiteLocale(pathname || "/").replace(/\/+$/, "") || "/";

  if (isBilingualEvidencePath(pathname) && nextLocale !== "zh" && nextLocale !== "en") {
    return withSiteLocale("/", nextLocale);
  }

  // Detailed guide translations are published only for indexable locales.
  // Keep every language available without linking to an unpublished detail page.
  if (
    relativePath.startsWith("/guides/") &&
    !isSeoIndexableLocale(nextLocale)
  ) {
    return withSiteLocale("/guides", nextLocale);
  }

  // The private ticket inbox is currently published in Simplified Chinese only.
  // Never generate a localized contact URL that resolves to a 404 page.
  if (relativePath === "/contact" && nextLocale !== "zh") {
    return withSiteLocale("/", nextLocale);
  }

  return replaceSiteLocaleInPath(pathname, nextLocale);
}
