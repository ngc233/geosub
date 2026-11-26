import { indexableStaticGuidePaths, isRetiredPublicPath } from "./public-launch-routes.ts";
import { isUnifiedPublicLocale } from "./public-style-rollout.ts";
import { isSeoIndexableLocale } from "./seo-indexing-policy.ts";
import {
  replaceSiteLocaleInPath,
  stripSiteLocale,
  withSiteLocale,
  type SiteLocale,
} from "./site-locale.ts";

export function isBilingualEvidencePath(pathname: string) {
  return /^\/(?:countries|price-history|price-records)(?:\/|$)/.test(stripSiteLocale(pathname));
}

export function isChineseOnlyGamePath(pathname: string) {
  return /^\/games(?:\/|$)/.test(stripSiteLocale(pathname || "/"));
}

const unifiedGuideSubpaths = new Set<string>(indexableStaticGuidePaths);

export function getLanguageSwitchHref(
  pathname: string,
  nextLocale: SiteLocale,
) {
  const relativePath = stripSiteLocale(pathname || "/").replace(/\/+$/, "") || "/";

  // Games vertical is available across all primary unified locales (zh, en, zh-tw, ja, ko, es).
  if (isChineseOnlyGamePath(pathname)) {
    return isUnifiedPublicLocale(nextLocale)
      ? replaceSiteLocaleInPath(pathname, nextLocale)
      : withSiteLocale("/", nextLocale);
  }

  // Product-specific region pilot pages (/ai-pricing/[slug]/regions/[country]) remain zh/en only.
  const regionPilotMatch = /^\/(ai-pricing|streaming-pricing)\/([^/]+)\/regions\/[^/]+(?:\/|$)/.exec(relativePath);
  if (regionPilotMatch && nextLocale !== "zh" && nextLocale !== "en") {
    return withSiteLocale(`/${regionPilotMatch[1]}/${regionPilotMatch[2]}`, nextLocale);
  }

  // Country hubs, price history, and original snapshots are available across all primary unified locales.
  if (isBilingualEvidencePath(pathname) && !isUnifiedPublicLocale(nextLocale)) {
    return withSiteLocale("/", nextLocale);
  }

  if (relativePath.startsWith("/guides/")) {
    if (isRetiredPublicPath(relativePath)) {
      return withSiteLocale("/guides", nextLocale);
    }
    if (unifiedGuideSubpaths.has(relativePath)) {
      return isUnifiedPublicLocale(nextLocale)
        ? replaceSiteLocaleInPath(pathname, nextLocale)
        : withSiteLocale("/guides", nextLocale);
    }
    // Dynamic CMS article slugs remain published per indexable locale unless mirrored.
    if (!isSeoIndexableLocale(nextLocale)) {
      return withSiteLocale("/guides", nextLocale);
    }
  }

  // Private support ticket inbox is available across all primary unified locales.
  if (relativePath === "/contact" && !isUnifiedPublicLocale(nextLocale)) {
    return withSiteLocale("/", nextLocale);
  }

  return replaceSiteLocaleInPath(pathname, nextLocale);
}
