export const siteLocaleDefinitions = {
  zh: {
    path: "zh",
    htmlLang: "zh-CN",
    direction: "ltr",
    shortLabel: "CN",
    label: "中文",
  },
  en: {
    path: "en",
    htmlLang: "en",
    direction: "ltr",
    shortLabel: "US",
    label: "English",
  },
} as const;

export type SiteLocale = keyof typeof siteLocaleDefinitions;

export const defaultSiteLocale: SiteLocale = "zh";
export const supportedSiteLocales = Object.keys(
  siteLocaleDefinitions,
) as SiteLocale[];

export function normalizeSiteLocale(value?: string | null): SiteLocale {
  const normalized = String(value || "").toLowerCase();

  return supportedSiteLocales.includes(normalized as SiteLocale)
    ? (normalized as SiteLocale)
    : defaultSiteLocale;
}

export function getSiteLocaleFromPath(pathname?: string | null): SiteLocale {
  const localePath = String(pathname || "").split("/")[1];
  const matchedLocale = supportedSiteLocales.find(
    (locale) => siteLocaleDefinitions[locale].path === localePath,
  );

  return matchedLocale || defaultSiteLocale;
}

export function getSiteLocaleDefinition(locale?: string | null) {
  return siteLocaleDefinitions[normalizeSiteLocale(locale)];
}

function splitHrefSuffix(href: string) {
  const suffixIndex = href.search(/[?#]/);

  if (suffixIndex < 0) {
    return { pathname: href, suffix: "" };
  }

  return {
    pathname: href.slice(0, suffixIndex),
    suffix: href.slice(suffixIndex),
  };
}

export function isExternalSiteHref(href: string) {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href);
}

export function stripSiteLocale(pathname: string) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const parts = normalizedPath.split("/");
  const localePath = parts[1];
  const isLocalized = supportedSiteLocales.some(
    (locale) => siteLocaleDefinitions[locale].path === localePath,
  );

  if (!isLocalized) {
    return normalizedPath || "/";
  }

  const stripped = `/${parts.slice(2).join("/")}`;
  return stripped === "" ? "/" : stripped;
}

export function withSiteLocale(href: string, locale: SiteLocale) {
  if (isExternalSiteHref(href) || href.startsWith("#")) {
    return href;
  }

  const { pathname, suffix } = splitHrefSuffix(href);
  const strippedPath = stripSiteLocale(pathname || "/");
  const localePath = siteLocaleDefinitions[locale].path;
  const localizedPath =
    strippedPath === "/" ? `/${localePath}/` : `/${localePath}${strippedPath}`;

  return `${localizedPath}${suffix}`;
}

export function replaceSiteLocaleInPath(
  pathname: string,
  nextLocale: SiteLocale,
) {
  return withSiteLocale(pathname || "/", nextLocale);
}
