export const englishPlanCanvasPath = "/en/ai-pricing/chatgpt/go";

export const unifiedPublicLocales = [
  "zh",
  "en",
  "zh-tw",
  "ja",
  "ko",
  "es",
] as const;

export type UnifiedPublicLocale = (typeof unifiedPublicLocales)[number];

export function isUnifiedPublicLocale(
  value?: string | null,
): value is UnifiedPublicLocale {
  return unifiedPublicLocales.includes(
    String(value || "").toLowerCase() as UnifiedPublicLocale,
  );
}

/** Keep the Chinese Plus shell separate from the rollout; all primary unified locales use the unified public style. */
export function usesUnifiedPublicStyle(pathname: string): boolean {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "");
  if (path === "/zh/ai-pricing/chatgpt/plus") return false;
  return unifiedPublicLocales.some(
    (locale) => path === `/${locale}` || path.startsWith(`/${locale}/`),
  );
}
