import { isSeoIndexableLocale } from "./seo-indexing-policy.ts";
import {
  replaceSiteLocaleInPath,
  stripSiteLocale,
  withSiteLocale,
  type SiteLocale,
} from "./site-locale.ts";

export function getLanguageSwitchHref(
  pathname: string,
  nextLocale: SiteLocale,
) {
  const relativePath = stripSiteLocale(pathname || "/").replace(/\/+$/, "") || "/";

  // Detailed guide translations are published only for indexable locales.
  // Keep every language available without linking to an unpublished detail page.
  if (
    relativePath.startsWith("/guides/") &&
    !isSeoIndexableLocale(nextLocale)
  ) {
    return withSiteLocale("/guides", nextLocale);
  }

  return replaceSiteLocaleInPath(pathname, nextLocale);
}
