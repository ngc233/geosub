import type { SiteLocale } from "./site-locale";

const localeMap: Record<SiteLocale, string> = {
  zh: "zh-CN",
  "zh-tw": "zh-TW",
  en: "en",
  ja: "ja-JP",
  ko: "ko-KR",
  es: "es-ES",
  tr: "tr-TR",
  ar: "ar",
  fr: "fr-FR",
  it: "it-IT",
  de: "de-DE",
  pt: "pt-PT",
};

export function getLocalizedCountryName({
  code,
  locale,
  nameZh,
  nameEn,
}: {
  code: string;
  locale: SiteLocale;
  nameZh?: string | null;
  nameEn?: string | null;
}) {
  const normalizedCode = code.trim().toUpperCase();

  if (/^[A-Z]{2}$/.test(normalizedCode)) {
    try {
      const displayName = new Intl.DisplayNames([localeMap[locale]], {
        type: "region",
      }).of(normalizedCode);

      const genericUnknownNames = new Set(["Unknown Region", "未知地区"]);
      if (
        displayName &&
        displayName !== normalizedCode &&
        !genericUnknownNames.has(displayName)
      ) {
        return displayName;
      }
    } catch {
      // Fall through to maintained database names on older runtimes.
    }
  }

  return locale === "zh" || locale === "zh-tw"
    ? nameZh || nameEn || normalizedCode
    : nameEn || nameZh || normalizedCode;
}
