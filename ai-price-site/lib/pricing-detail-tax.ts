import type { RegionPrice } from "./public-pricing-model";
import type { DetailLocale } from "./detail-page-copy";
import { localizeTaxNote } from "./tax-note-localization";
export function getTaxNote({
  taxNote,
  taxProfileNoteZh,
  taxProfileNoteEn,
  billingPlatform,
  locale,
}: {
  taxNote: string | null;
  taxProfileNoteZh: string | null;
  taxProfileNoteEn: string | null;
  billingPlatform: string | null;
  locale: DetailLocale;
}) {
  const profileNote = getLocalizedTaxProfileText({
    zh: taxProfileNoteZh,
    en: taxProfileNoteEn,
    locale,
  });

  if (profileNote) {
    return profileNote;
  }

  const note = taxNote?.trim();

  if (note) {
    return localizeTaxNote(note, locale, { unknownFallback: true });
  }

  const platform = (billingPlatform || "unknown").toLowerCase();

  if (platform === "ios") {
    if (locale === "en") return "App Store list price; taxes may vary at checkout";
    if (locale === "ja") return "App Storeの表示価格です。税額は購入画面でご確認ください";
    if (locale === "ko") return "App Store 표시 가격이며, 세금은 결제 화면에서 확인하세요";
    if (locale === "es") return "Precio de App Store; los impuestos pueden variar al pagar";
    if (locale === "tr") return "App Store liste fiyatıdır; vergiler ödeme sırasında değişebilir";
    if (locale === "ar") return "سعر App Store المعلن؛ قد تختلف الضرائب عند الدفع";
    if (locale === "fr") return "Prix App Store affiché ; les taxes peuvent varier au paiement";
    if (locale === "it") return "Prezzo App Store; le imposte possono variare al pagamento";
    if (locale === "de") return "App-Store-Preis; Steuern können beim Bezahlen abweichen";
    if (locale === "pt") return "Preço da App Store; os impostos podem variar no pagamento";
    return "App Store 标价，税费以结算页为准";
  }

  if (platform === "android" || platform === "google_play") {
    if (locale === "en") return "Google Play list price; taxes may vary at checkout";
    if (locale === "ja") return "Google Playの表示価格です。税額は購入画面でご確認ください";
    if (locale === "ko") return "Google Play 표시 가격이며, 세금은 결제 화면에서 확인하세요";
    if (locale === "es") return "Precio de Google Play; los impuestos pueden variar al pagar";
    if (locale === "tr") return "Google Play liste fiyatıdır; vergiler ödeme sırasında değişebilir";
    if (locale === "ar") return "سعر Google Play المعلن؛ قد تختلف الضرائب عند الدفع";
    if (locale === "fr") return "Prix Google Play affiché ; les taxes peuvent varier au paiement";
    if (locale === "it") return "Prezzo Google Play; le imposte possono variare al pagamento";
    if (locale === "de") return "Google-Play-Preis; Steuern können beim Bezahlen abweichen";
    if (locale === "pt") return "Preço do Google Play; os impostos podem variar no pagamento";
    return "Google Play 标价，税费以结算页为准";
  }

  if (platform === "web") {
    if (locale === "en") return "Official website price; taxes may vary at checkout";
    if (locale === "ja") return "公式サイトの表示価格です。税額は購入画面でご確認ください";
    if (locale === "ko") return "공식 웹사이트 표시 가격이며, 세금은 결제 화면에서 확인하세요";
    if (locale === "es") return "Precio del sitio oficial; los impuestos pueden variar al pagar";
    if (locale === "tr") return "Resmî site liste fiyatıdır; vergiler ödeme sırasında değişebilir";
    if (locale === "ar") return "سعر الموقع الرسمي المعلن؛ قد تختلف الضرائب عند الدفع";
    if (locale === "fr") return "Prix du site officiel ; les taxes peuvent varier au paiement";
    if (locale === "it") return "Prezzo del sito ufficiale; le imposte possono variare al pagamento";
    if (locale === "de") return "Preis der offiziellen Website; Steuern können beim Bezahlen abweichen";
    if (locale === "pt") return "Preço do site oficial; os impostos podem variar no pagamento";
    return "官网标价，税费以结算页为准";
  }

  if (locale === "en") return "Tax information pending review";
  if (locale === "ja") return "税情報を確認中です";
  if (locale === "ko") return "세금 정보 확인 중";
  if (locale === "es") return "Información fiscal pendiente de revisión";
  if (locale === "tr") return "Vergi bilgileri inceleniyor";
  if (locale === "ar") return "المعلومات الضريبية قيد المراجعة";
  if (locale === "fr") return "Informations fiscales en cours de vérification";
  if (locale === "it") return "Informazioni fiscali in verifica";
  if (locale === "de") return "Steuerinformationen werden geprüft";
  if (locale === "pt") return "Informação fiscal em verificação";
  return "税费待核验";
}

export function hasBrokenText(value?: string | null) {
  return !value || value.includes("?") || value.includes("锟");
}

export function hasCjkText(value: string) {
  return /[\u3400-\u9fff]/.test(value);
}

export function translateTaxProfileTextToZh(value: string) {
  const raw = value.trim();
  const includeMatch = raw.match(/^(?:Includes|Usually includes)\s+(.+)$/i);

  if (includeMatch) {
    const label = includeMatch[1]
      .replace(/consumption tax/i, "消费税")
      .replace(/service tax/i, "服务税")
      .replace(/sales tax/i, "销售税")
      .replace(/by region/i, "因地区不同");
    return /^Usually includes/i.test(raw) ? `通常含 ${label}` : `含 ${label}`;
  }

  const provinceMatch = raw.match(/^GST\/HST varies by province(?:,\s*(.+))?$/i);
  if (provinceMatch) {
    return provinceMatch[1]
      ? `各省 ${provinceMatch[1]} GST/HST 不同`
      : "各省 GST/HST 不同";
  }

  if (/State ICMS varies/i.test(raw)) return "州税（ICMS）不同";
  if (/Sales tax varies by state/i.test(raw)) return "各州销售税不同";
  if (/Sales tax varies by region/i.test(raw)) return "销售税因地区不同";
  if (/VAT treatment needs review/i.test(raw)) return "VAT 规则需复核";
  if (/Usually GST-inclusive/i.test(raw)) return "通常已含 GST，最终以结算页为准";
  if (/Usually VAT-inclusive/i.test(raw)) return "通常已含 VAT，最终以结算页为准";
  if (/App Store list price/i.test(raw)) return "App Store 标价，税费以结算页为准";
  if (/No country tax-rate profile matched yet/i.test(raw)) {
    return "未匹配到国家税率资料；最终以 App Store 结算页为准";
  }
  if (/final checkout applies/i.test(raw)) return "最终以结算页为准";

  return raw;
}

export function getLocalizedTaxProfileText({
  zh,
  en,
  locale,
}: {
  zh?: string | null;
  en?: string | null;
  locale: DetailLocale;
}) {
  const zhText = zh?.trim();
  const enText = en?.trim();

  if (locale === "en") {
    return enText || zhText || "";
  }

  if (
    locale === "ja" ||
    locale === "ko" ||
    locale === "es" ||
    locale === "tr" ||
    locale === "ar" ||
    locale === "fr" ||
    locale === "it" ||
    locale === "de" ||
    locale === "pt"
  ) {
    return localizeTaxNote(enText || zhText || "", locale, {
      unknownFallback: true,
    });
  }

  if (zhText && !hasBrokenText(zhText) && hasCjkText(zhText)) {
    return zhText;
  }

  if (enText) {
    return translateTaxProfileTextToZh(enText);
  }

  return "";
}

export function getTaxConfidence(value: string | null): RegionPrice["taxConfidence"] {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return "unknown";
}

export function getTaxSourceKind(value: string | null): RegionPrice["taxSourceKind"] {
  if (
    value === "manual" ||
    value === "official" ||
    value === "apple" ||
    value === "provider" ||
    value === "inferred"
  ) {
    return value;
  }

  return undefined;
}

export function getTaxTreatment(value: string | null): RegionPrice["taxTreatment"] {
  if (
    value === "included_likely" ||
    value === "varies_by_region" ||
    value === "checkout_may_add" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

export function getTaxCalculationPolicy(value: string | null): RegionPrice["taxCalculationPolicy"] {
  if (value === "do_not_calculate" || value === "informational_only") {
    return value;
  }

  return "do_not_calculate";
}

export function getTaxReviewStatus(value: string | null): RegionPrice["taxReviewStatus"] {
  if (value === "verified" || value === "needs_review" || value === "unknown") {
    return value;
  }

  return "unknown";
}

export function getTaxFrontendNote({
  zh,
  en,
  locale,
}: {
  zh: string | null;
  en: string | null;
  locale: DetailLocale;
}) {
  return getLocalizedTaxProfileText({ zh, en, locale });
}

