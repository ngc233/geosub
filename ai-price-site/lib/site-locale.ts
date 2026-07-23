export const preparedSiteLocaleDefinitions = {
  zh: {
    path: "zh",
    htmlLang: "zh-CN",
    direction: "ltr",
    shortLabel: "CN",
    label: "中文",
    englishLabel: "Chinese",
    intlLocale: "zh-CN",
    openGraphLocale: "zh_CN",
    defaultCurrency: "CNY",
  },
  "zh-tw": {
    path: "zh-tw",
    htmlLang: "zh-TW",
    direction: "ltr",
    shortLabel: "TW",
    label: "繁體中文",
    englishLabel: "Traditional Chinese",
    intlLocale: "zh-TW",
    openGraphLocale: "zh_TW",
    defaultCurrency: "TWD",
  },
  en: {
    path: "en",
    htmlLang: "en-US",
    direction: "ltr",
    shortLabel: "US",
    label: "English",
    englishLabel: "English",
    intlLocale: "en-US",
    openGraphLocale: "en_US",
    defaultCurrency: "USD",
  },
  ja: {
    path: "ja",
    htmlLang: "ja-JP",
    direction: "ltr",
    shortLabel: "JP",
    label: "日本語",
    englishLabel: "Japanese",
    intlLocale: "ja-JP",
    openGraphLocale: "ja_JP",
    defaultCurrency: "JPY",
  },
  ko: {
    path: "ko",
    htmlLang: "ko-KR",
    direction: "ltr",
    shortLabel: "KR",
    label: "한국어",
    englishLabel: "Korean",
    intlLocale: "ko-KR",
    openGraphLocale: "ko_KR",
    defaultCurrency: "KRW",
  },
  es: {
    path: "es",
    htmlLang: "es-ES",
    direction: "ltr",
    shortLabel: "ES",
    label: "Español",
    englishLabel: "Spanish",
    intlLocale: "es-ES",
    openGraphLocale: "es_ES",
    defaultCurrency: "EUR",
  },
  tr: {
    path: "tr",
    htmlLang: "tr-TR",
    direction: "ltr",
    shortLabel: "TR",
    label: "Türkçe",
    englishLabel: "Turkish",
    intlLocale: "tr-TR",
    openGraphLocale: "tr_TR",
    defaultCurrency: "TRY",
  },
  ar: {
    path: "ar",
    htmlLang: "ar",
    direction: "rtl",
    shortLabel: "AR",
    label: "العربية",
    englishLabel: "Arabic",
    intlLocale: "ar",
    openGraphLocale: "ar_AR",
    defaultCurrency: "SAR",
  },
  fr: {
    path: "fr",
    htmlLang: "fr-FR",
    direction: "ltr",
    shortLabel: "FR",
    label: "Français",
    englishLabel: "French",
    intlLocale: "fr-FR",
    openGraphLocale: "fr_FR",
    defaultCurrency: "EUR",
  },
  it: {
    path: "it",
    htmlLang: "it-IT",
    direction: "ltr",
    shortLabel: "IT",
    label: "Italiano",
    englishLabel: "Italian",
    intlLocale: "it-IT",
    openGraphLocale: "it_IT",
    defaultCurrency: "EUR",
  },
  de: {
    path: "de",
    htmlLang: "de-DE",
    direction: "ltr",
    shortLabel: "DE",
    label: "Deutsch",
    englishLabel: "German",
    intlLocale: "de-DE",
    openGraphLocale: "de_DE",
    defaultCurrency: "EUR",
  },
  pt: {
    path: "pt",
    htmlLang: "pt-PT",
    direction: "ltr",
    shortLabel: "PT",
    label: "Português",
    englishLabel: "Portuguese",
    intlLocale: "pt-PT",
    openGraphLocale: "pt_PT",
    defaultCurrency: "EUR",
  },
} as const;

export type PreparedSiteLocale = keyof typeof preparedSiteLocaleDefinitions;

export const launchedSiteLocales = [
  "zh",
  "zh-tw",
  "en",
  "ja",
  "ko",
  "es",
  "tr",
  "ar",
  "fr",
  "it",
  "de",
  "pt",
] as const satisfies readonly PreparedSiteLocale[];

export type SiteLocale = (typeof launchedSiteLocales)[number];

export const siteLocaleDefinitions = {
  zh: preparedSiteLocaleDefinitions.zh,
  "zh-tw": preparedSiteLocaleDefinitions["zh-tw"],
  en: preparedSiteLocaleDefinitions.en,
  ja: preparedSiteLocaleDefinitions.ja,
  ko: preparedSiteLocaleDefinitions.ko,
  es: preparedSiteLocaleDefinitions.es,
  tr: preparedSiteLocaleDefinitions.tr,
  ar: preparedSiteLocaleDefinitions.ar,
  fr: preparedSiteLocaleDefinitions.fr,
  it: preparedSiteLocaleDefinitions.it,
  de: preparedSiteLocaleDefinitions.de,
  pt: preparedSiteLocaleDefinitions.pt,
} as const satisfies Pick<
  typeof preparedSiteLocaleDefinitions,
  SiteLocale
>;

export const defaultSiteLocale: SiteLocale = "zh";
export const supportedSiteLocales = [...launchedSiteLocales];
export const preparedSiteLocales = Object.keys(
  preparedSiteLocaleDefinitions,
) as PreparedSiteLocale[];

export function isPreparedSiteLocale(
  value?: string | null,
): value is PreparedSiteLocale {
  return preparedSiteLocales.includes(
    String(value || "").toLowerCase() as PreparedSiteLocale,
  );
}

export function isSiteLocale(value?: string | null): value is SiteLocale {
  return supportedSiteLocales.includes(
    String(value || "").toLowerCase() as SiteLocale,
  );
}

export function normalizeSiteLocale(value?: string | null): SiteLocale {
  const normalized = String(value || "").toLowerCase();

  return isSiteLocale(normalized)
    ? (normalized as SiteLocale)
    : defaultSiteLocale;
}

export function getPreparedSiteLocaleDefinition(
  locale: PreparedSiteLocale,
) {
  return preparedSiteLocaleDefinitions[locale];
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
