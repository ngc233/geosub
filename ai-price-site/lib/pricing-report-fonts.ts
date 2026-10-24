import type { SiteLocale } from "./site-locale";

// latin-ext WOFF files are Unicode subsets, not supersets of Latin. The existing
// full Noto Sans Arabic font also includes Latin letters, accents and Turkish
// glyphs; reuse it to keep prices and multilingual labels in one complete font.
const localeFontFiles: Record<SiteLocale, { regular: string; bold: string }> = {
  zh: { regular: "assets/fonts/NotoSansSC-VF.ttf", bold: "assets/fonts/NotoSansSC-VF.ttf" },
  "zh-tw": { regular: "assets/fonts/NotoSansSC-VF.ttf", bold: "assets/fonts/NotoSansSC-VF.ttf" },
  ja: { regular: "assets/fonts/NotoSansSC-VF.ttf", bold: "assets/fonts/NotoSansSC-VF.ttf" },
  ko: { regular: "assets/fonts/NotoSansKR-VF.ttf", bold: "assets/fonts/NotoSansKR-VF.ttf" },
  ar: { regular: "assets/fonts/NotoSansArabic-VF.ttf", bold: "assets/fonts/NotoSansArabic-VF.ttf" },
  en: { regular: "@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff", bold: "@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff" },
  es: { regular: "assets/fonts/NotoSansArabic-VF.ttf", bold: "assets/fonts/NotoSansArabic-VF.ttf" },
  tr: { regular: "assets/fonts/NotoSansArabic-VF.ttf", bold: "assets/fonts/NotoSansArabic-VF.ttf" },
  fr: { regular: "assets/fonts/NotoSansArabic-VF.ttf", bold: "assets/fonts/NotoSansArabic-VF.ttf" },
  it: { regular: "assets/fonts/NotoSansArabic-VF.ttf", bold: "assets/fonts/NotoSansArabic-VF.ttf" },
  de: { regular: "assets/fonts/NotoSansArabic-VF.ttf", bold: "assets/fonts/NotoSansArabic-VF.ttf" },
  pt: { regular: "assets/fonts/NotoSansArabic-VF.ttf", bold: "assets/fonts/NotoSansArabic-VF.ttf" },
};


export function getPricingReportFontFiles(locale: SiteLocale) {
  return localeFontFiles[locale];
}
