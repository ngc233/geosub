import {
  type ProductPlan,
  type RegionPrice,
  type SubscriptionProduct,
} from "./public-pricing-model";
import { prisma } from "./prisma";
import type { DetailLocale } from "./detail-page-copy";
import { localizeTaxNote } from "./tax-note-localization";
import { toTraditionalChinese } from "./traditional-chinese";

type PricingDetailRow = {
  product_slug: string;
  product_name: string;
  product_category: string;
  product_provider: string | null;
  product_description: string | null;
  product_logo_url: string | null;
  product_official_url: string | null;
  plan_slug: string;
  plan_name: string;
  billing_cycle: string | null;
  plan_description: string | null;
  plan_sort_order: number | null;
  pending_observation_count: number;

  country_code: string | null;
  country_name_zh: string | null;
  country_name_en: string | null;
  is_reference: boolean | null;

  local_price: unknown;
  currency: string | null;
  price_usd: unknown;
  diff_vs_us_percent: unknown;
  tax_note: string | null;
  tax_profile_note_zh: string | null;
  tax_profile_note_en: string | null;
  tax_profile_confidence: string | null;
  tax_profile_source_kind: string | null;
  tax_profile_is_variable: boolean | null;
  tax_profile_treatment: string | null;
  tax_profile_calculation_policy: string | null;
  tax_profile_review_status: string | null;
  tax_profile_frontend_note_zh: string | null;
  tax_profile_frontend_note_en: string | null;
  risk_level: string | null;
  risk_base_score: unknown;
  risk_factors_zh: string | null;
  risk_factors_en: string | null;
  risk_note_zh: string | null;
  risk_note_en: string | null;
  risk_requirements_zh: string | null;
  risk_requirements_en: string | null;
  availability_note: string | null;
  billing_platform: string | null;
  last_checked_at: Date | string | null;
  fx_rate_date: string | null;
  reviewed_at: Date | string | null;
  source_name: string | null;
  confidence_score: number | null;
  data_quality: string | null;
};

const localeMap: Record<DetailLocale, string> = {
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

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);

  if (value && typeof value === "object" && "toString" in value) {
    return Number(value.toString());
  }

  return 0;
}

function formatDate(value: Date | string | null) {
  if (!value) return undefined;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  return date.toISOString().slice(0, 10);
}

function getLatestDate(values: Array<Date | string | null | undefined>) {
  const latest = values
    .map((value) => {
      if (!value) return null;
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    })
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return latest ? formatDate(latest) : undefined;
}

function getPlanFreshness(regions: RegionPrice[]) {
  const priceCollectedAt = getLatestDate(regions.map((region) => region.lastCheckedAt));
  const fxRateDate = getLatestDate(regions.map((region) => region.fxRateDate));
  const planReviewedAt = getLatestDate(regions.map((region) => region.reviewedAt));
  const sourceNames = [...new Set(regions.map((region) => region.sourceName).filter(Boolean))];
  const minimumConfidence = Math.min(
    ...regions.map((region) => region.confidenceScore ?? 0),
  );
  const qualities = regions.map((region) => region.dataQuality || "unknown");
  const trustStatus = qualities.every((quality) => quality === "verified") && minimumConfidence >= 80
    ? "verified"
    : qualities.every((quality) => quality === "verified" || quality === "estimated") &&
        minimumConfidence >= 60
      ? "reviewed"
      : "needs_review";

  return {
    sourceLabel: sourceNames.length > 0 ? sourceNames.join(" + ") : "App Store",
    priceCollectedAt,
    fxRateDate,
    planReviewedAt,
    pageUpdatedAt: getLatestDate([planReviewedAt, priceCollectedAt]),
    trustStatus,
  } satisfies NonNullable<ProductPlan["freshness"]>;
}

function getCountryName(
  countryCode: string,
  fallbackZh: string | null,
  fallbackEn: string | null,
  locale: DetailLocale,
) {
  try {
    const displayNames = new Intl.DisplayNames([localeMap[locale] || "en"], {
      type: "region",
    });

    const localizedName = displayNames.of(countryCode.toUpperCase());

    if (localizedName) {
      return localizedName;
    }
  } catch {
    // fallback below
  }

  if (locale === "zh") {
    return fallbackZh || fallbackEn || countryCode;
  }

  return fallbackEn || fallbackZh || countryCode;
}

function formatLocalPrice(value: unknown, currency: string | null, locale: DetailLocale) {
  const number = toNumber(value);

  if (!currency || number <= 0) {
    if (locale === "zh") return "本地价格待核验";
    if (locale === "ja") return "現地価格を確認中";
    if (locale === "ko") return "현지 가격 확인 중";
    if (locale === "es") return "Precio local pendiente de revisión";
    if (locale === "tr") return "Yerel fiyat inceleniyor";
    if (locale === "ar") return "السعر المحلي قيد المراجعة";
    if (locale === "fr") return "Prix local en cours de vérification";
    if (locale === "it") return "Prezzo locale in verifica";
    if (locale === "de") return "Lokaler Preis wird geprüft";
    if (locale === "pt") return "Preço local em verificação";
    return "Local price pending review";
  }

  const monthlySuffix =
    locale === "zh" || locale === "ja" ? "/月"
    : locale === "ko" ? "/월"
    : locale === "es" ? "/mes"
    : locale === "tr" ? "/ay"
    : locale === "ar" ? "/شهر"
    : locale === "fr" ? "/mois"
    : locale === "it" ? "/mese"
    : locale === "de" ? "/Monat"
    : locale === "pt" ? "/mês"
    : "/mo";

  try {
    return `${new Intl.NumberFormat(localeMap[locale] || "en", {
      style: "currency",
      currency,
      maximumFractionDigits: Number.isInteger(number) ? 0 : 2,
    }).format(number)}${monthlySuffix}`;
  } catch {
    return `${number} ${currency}${monthlySuffix}`;
  }
}

function getPlanBilling(value: string | null): ProductPlan["billing"] {
  return value === "yearly" ? "yearly" : "monthly";
}

function getBillingPlatformLabel(value: string | null) {
  const platform = (value || "unknown").toLowerCase();

  if (platform === "ios") return "iOS";
  if (platform === "android") return "Android";
  if (platform === "google_play") return "Google Play";
  if (platform === "web") return "Web";
  if (platform === "steam") return "Steam";
  if (platform === "gift_card") return "Gift Card";

  return "Unknown";
}

function getTaxNote({
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

function hasBrokenText(value?: string | null) {
  return !value || value.includes("?") || value.includes("锟");
}

function hasCjkText(value: string) {
  return /[\u3400-\u9fff]/.test(value);
}

function translateTaxProfileTextToZh(value: string) {
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

function getLocalizedTaxProfileText({
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

function getTaxConfidence(value: string | null): RegionPrice["taxConfidence"] {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return "unknown";
}

function getTaxSourceKind(value: string | null): RegionPrice["taxSourceKind"] {
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

function getTaxTreatment(value: string | null): RegionPrice["taxTreatment"] {
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

function getTaxCalculationPolicy(value: string | null): RegionPrice["taxCalculationPolicy"] {
  if (value === "do_not_calculate" || value === "informational_only") {
    return value;
  }

  return "do_not_calculate";
}

function getTaxReviewStatus(value: string | null): RegionPrice["taxReviewStatus"] {
  if (value === "verified" || value === "needs_review" || value === "unknown") {
    return value;
  }

  return "unknown";
}

function getTaxFrontendNote({
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

function getRiskLevel(value: string | null): RegionPrice["riskLevel"] {
  if (value === "low" || value === "medium" || value === "high" || value === "unknown") {
    return value;
  }

  return "unknown";
}

function getRiskLevelFromScore(score: number): RegionPrice["riskLevel"] {
  if (score <= 49) return "low";
  if (score <= 74) return "medium";
  return "high";
}

function clampRiskScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getRiskLevelLabel(level: RegionPrice["riskLevel"], locale: DetailLocale) {
  if (locale === "fr") {
    if (level === "low") return "Faible";
    if (level === "high") return "Élevé";
    if (level === "medium") return "Modéré";
    return "Non vérifié";
  }
  if (locale === "it") {
    if (level === "low") return "Basso";
    if (level === "high") return "Alto";
    if (level === "medium") return "Medio";
    return "Non verificato";
  }
  if (locale === "de") {
    if (level === "low") return "Niedrig";
    if (level === "high") return "Hoch";
    if (level === "medium") return "Mittel";
    return "Ungeprüft";
  }
  if (locale === "pt") {
    if (level === "low") return "Baixo";
    if (level === "high") return "Alto";
    if (level === "medium") return "Médio";
    return "Não verificado";
  }
  if (locale === "ar") {
    if (level === "low") return "منخفض";
    if (level === "high") return "مرتفع";
    if (level === "medium") return "متوسط";
    return "غير موثق";
  }

  if (locale === "tr") {
    if (level === "low") return "Düşük";
    if (level === "high") return "Yüksek";
    if (level === "medium") return "Orta";
    return "Doğrulanmadı";
  }

  if (locale === "es") {
    if (level === "low") return "Bajo";
    if (level === "high") return "Alto";
    if (level === "medium") return "Medio";
    return "Sin verificar";
  }

  if (locale === "ko") {
    if (level === "low") return "낮음";
    if (level === "high") return "높음";
    if (level === "medium") return "중간";
    return "미확인";
  }

  if (locale === "ja") {
    if (level === "low") return "低";
    if (level === "high") return "高";
    if (level === "medium") return "中";
    return "未確認";
  }

  if (locale !== "zh") {
    if (level === "low") return "Low";
    if (level === "high") return "High";
    if (level === "medium") return "Medium";
    return "Unverified";
  }

  if (level === "low") return "低";
  if (level === "high") return "高";
  if (level === "medium") return "中";
  return "待核验";
}

function translateRiskProfileTextToZh(value: string) {
  const raw = value.trim();

  if (/Apple ID region|account region|payment method|billing information/i.test(raw)) {
    return "跨区订阅可能受到 Apple ID 或账号地区、付款方式、账单信息和平台风控影响。";
  }

  if (/gift card|local payment|local billing|VPN/i.test(raw)) {
    return "可能需要当地付款方式或账单资料；使用礼品卡或网络位置切换仍可能触发平台核验。";
  }

  if (/tax|checkout|final price/i.test(raw)) {
    return "展示价格可能与最终结算价存在税费差异，请以官方结算页为准。";
  }

  if (/availability|not available|region restriction/i.test(raw)) {
    return "该服务或套餐可能受地区可用性限制，请以当地 App Store 实际展示为准。";
  }

  return "该地区的跨区订阅条件仍需核验，请以官方结算页和平台规则为准。";
}

function translateRiskProfileTextToJa(value: string) {
  const raw = value.trim();

  if (/Apple ID region|account region|payment method|billing information/i.test(raw)) {
    return "地域をまたぐ契約では、Apple Accountの地域、支払い方法、請求先情報、プラットフォームの審査が影響する場合があります。";
  }

  if (/gift card|local payment|local billing|VPN/i.test(raw)) {
    return "現地の支払い方法や請求先情報が必要な場合があります。ギフトカードや接続地域の変更を利用しても、プラットフォームの確認対象になることがあります。";
  }

  if (/tax|checkout|final price/i.test(raw)) {
    return "表示価格と最終支払額は税金などにより異なる場合があります。公式の購入画面をご確認ください。";
  }

  if (/availability|not available|region restriction/i.test(raw)) {
    return "サービスまたはプランは地域によって利用できない場合があります。現地のApp Store表示をご確認ください。";
  }

  return "この地域での契約条件は、公式の購入画面とプラットフォームの規則をご確認ください。";
}

function translateRiskProfileTextToKo(value: string) {
  const raw = value.trim();

  if (/Apple ID region|account region|payment method|billing information/i.test(raw)) {
    return "지역 간 구독은 Apple Account의 국가·지역, 결제 수단, 청구 정보와 플랫폼 심사의 영향을 받을 수 있습니다.";
  }

  if (/gift card|local payment|local billing|VPN/i.test(raw)) {
    return "현지 결제 수단이나 청구 정보가 필요할 수 있습니다. 기프트 카드나 접속 지역을 변경해도 플랫폼의 확인 대상이 될 수 있습니다.";
  }

  if (/tax|checkout|final price/i.test(raw)) {
    return "표시 가격과 최종 결제 금액은 세금 등에 따라 달라질 수 있습니다. 공식 결제 화면에서 확인하세요.";
  }

  if (/availability|not available|region restriction/i.test(raw)) {
    return "서비스 또는 요금제는 지역에 따라 이용하지 못할 수 있습니다. 현지 App Store 표시를 확인하세요.";
  }

  return "이 지역의 구독 조건은 공식 결제 화면과 플랫폼 정책을 확인하세요.";
}

function translateRiskProfileTextToEs(value: string) {
  const raw = value.trim();

  if (/Apple ID region|account region|payment method|billing information/i.test(raw)) {
    return "Las suscripciones entre regiones pueden depender del país o la región de la cuenta de Apple, el método de pago, los datos de facturación y las comprobaciones de la plataforma.";
  }

  if (/gift card|local payment|local billing|VPN/i.test(raw)) {
    return "Puede ser necesario disponer de un método de pago o una dirección de facturación local. Las tarjetas regalo o el cambio de ubicación de red también pueden activar comprobaciones de la plataforma.";
  }

  if (/tax|checkout|final price/i.test(raw)) {
    return "El precio mostrado y el importe final pueden diferir por los impuestos. Confirma el total en la pantalla oficial de pago.";
  }

  if (/availability|not available|region restriction/i.test(raw)) {
    return "El servicio o el plan puede no estar disponible en todas las regiones. Comprueba lo que aparece en la App Store local.";
  }

  return "Consulta las condiciones de suscripción de esta región en la pantalla oficial de pago y en las normas de la plataforma.";
}

function translateRiskProfileTextToTr(value: string) {
  const raw = value.trim();

  if (/Apple ID region|account region|payment method|billing information/i.test(raw)) {
    return "Bölgeler arası aboneliklerde Apple hesabının ülkesi veya bölgesi, ödeme yöntemi, fatura bilgileri ve platform kontrolleri etkili olabilir.";
  }

  if (/gift card|local payment|local billing|VPN/i.test(raw)) {
    return "Yerel bir ödeme yöntemi veya fatura adresi gerekebilir. Hediye kartı ya da ağ konumunu değiştirmek de platform kontrollerini tetikleyebilir.";
  }

  if (/tax|checkout|final price/i.test(raw)) {
    return "Gösterilen fiyat ile son ödeme tutarı vergiler nedeniyle farklı olabilir. Toplam tutarı resmî ödeme ekranında doğrulayın.";
  }

  if (/availability|not available|region restriction/i.test(raw)) {
    return "Hizmet veya paket her bölgede sunulmayabilir. Yerel App Store sayfasındaki kullanılabilirliği kontrol edin.";
  }

  return "Bu bölgedeki abonelik koşullarını resmî ödeme ekranından ve platform kurallarından kontrol edin.";
}

function translateRiskProfileTextToAr(value: string) {
  const raw = value.trim();

  if (/Apple ID region|account region|payment method|billing information/i.test(raw)) {
    return "قد تتأثر الاشتراكات بين المناطق ببلد أو منطقة حساب Apple وطريقة الدفع وبيانات الفوترة وضوابط المنصة.";
  }

  if (/gift card|local payment|local billing|VPN/i.test(raw)) {
    return "قد يلزم استخدام وسيلة دفع أو عنوان فوترة محلي. وقد تؤدي بطاقات الهدايا أو تغيير موقع الشبكة أيضاً إلى مراجعات إضافية من المنصة.";
  }

  if (/tax|checkout|final price/i.test(raw)) {
    return "قد يختلف السعر المعروض عن المبلغ النهائي بسبب الضرائب. تحقّق من الإجمالي في شاشة الدفع الرسمية.";
  }

  if (/availability|not available|region restriction/i.test(raw)) {
    return "قد لا تتوفر الخدمة أو الباقة في جميع المناطق. تحقّق من ظهورها في App Store المحلي.";
  }

  return "راجِع شروط الاشتراك في هذه المنطقة عبر شاشة الدفع الرسمية وقواعد المنصة.";
}

function translateRiskProfileTextToLatin(
  value: string,
  locale: Extract<DetailLocale, "fr" | "it" | "de" | "pt">,
) {
  const raw = value.trim();
  const copy = {
    fr: {
      account: "Les abonnements entre régions peuvent dépendre du pays du compte Apple, du moyen de paiement, des coordonnées de facturation et des contrôles de la plateforme.",
      payment: "Un moyen de paiement ou une adresse de facturation locale peut être nécessaire. Les cartes cadeaux ou un changement de localisation réseau peuvent aussi déclencher des contrôles.",
      tax: "Le prix affiché peut différer du montant final en raison des taxes. Vérifiez le total sur la page de paiement officielle.",
      availability: "Le service ou l’offre peut ne pas être disponible dans toutes les régions. Vérifiez sa présence dans l’App Store local.",
      source: "La source n’est pas l’App Store ; l’évaluation du risque est donc uniquement indicative.",
      lowPrice: "Le prix est nettement inférieur à la référence américaine ; vérifiez attentivement le paiement et le pays du compte.",
      highPrice: "Le prix est nettement supérieur à la référence américaine. Il s’agit surtout d’un surcoût, pas nécessairement d’un risque de plateforme.",
      taxLow: "La fiabilité des informations fiscales est faible et doit être vérifiée.",
      fallback: "Vérifiez les conditions d’abonnement de cette région sur la page de paiement officielle et dans les règles de la plateforme.",
    },
    it: {
      account: "Gli abbonamenti tra regioni possono dipendere dal paese dell’account Apple, dal metodo di pagamento, dai dati di fatturazione e dai controlli della piattaforma.",
      payment: "Può essere necessario un metodo di pagamento o un indirizzo di fatturazione locale. Anche carte regalo o cambi di posizione della rete possono attivare controlli.",
      tax: "Il prezzo mostrato può differire dall’importo finale per effetto delle imposte. Verifica il totale nella pagina di pagamento ufficiale.",
      availability: "Il servizio o il piano potrebbe non essere disponibile in tutte le regioni. Verifica la disponibilità nell’App Store locale.",
      source: "La fonte non è l’App Store; la valutazione del rischio è quindi solo indicativa.",
      lowPrice: "Il prezzo è nettamente inferiore al riferimento statunitense; verifica con attenzione pagamento e paese dell’account.",
      highPrice: "Il prezzo è nettamente superiore al riferimento statunitense. Si tratta soprattutto di un maggior costo, non necessariamente di un rischio della piattaforma.",
      taxLow: "Le informazioni fiscali hanno un’affidabilità bassa e devono essere verificate.",
      fallback: "Verifica le condizioni di abbonamento della regione nella pagina di pagamento ufficiale e nelle regole della piattaforma.",
    },
    de: {
      account: "Regionsübergreifende Abonnements können vom Land des Apple-Kontos, der Zahlungsmethode, den Rechnungsdaten und den Plattformprüfungen abhängen.",
      payment: "Möglicherweise sind eine lokale Zahlungsmethode oder Rechnungsadresse erforderlich. Auch Geschenkkarten oder ein geänderter Netzwerkstandort können Prüfungen auslösen.",
      tax: "Der angezeigte Preis kann wegen Steuern vom Endbetrag abweichen. Prüfen Sie die Summe auf der offiziellen Zahlungsseite.",
      availability: "Der Dienst oder Tarif ist möglicherweise nicht in allen Regionen verfügbar. Prüfen Sie das Angebot im lokalen App Store.",
      source: "Die Quelle ist nicht der App Store; die Risikobewertung ist daher nur ein Richtwert.",
      lowPrice: "Der Preis liegt deutlich unter der US-Referenz; prüfen Sie Zahlungsmethode und Kontoland besonders sorgfältig.",
      highPrice: "Der Preis liegt deutlich über der US-Referenz. Das ist vor allem ein Kostenfaktor und nicht zwingend ein Plattformrisiko.",
      taxLow: "Die Steuerinformationen haben eine geringe Verlässlichkeit und sollten geprüft werden.",
      fallback: "Prüfen Sie die Abonnementbedingungen dieser Region auf der offiziellen Zahlungsseite und in den Plattformregeln.",
    },
    pt: {
      account: "As assinaturas entre regiões podem depender do país da conta Apple, do método de pagamento, dos dados de faturação e dos controlos da plataforma.",
      payment: "Poderá ser necessário um método de pagamento ou endereço de faturação local. Cartões-oferta ou alterações da localização da rede também podem desencadear controlos.",
      tax: "O preço apresentado pode diferir do valor final devido a impostos. Confirme o total na página oficial de pagamento.",
      availability: "O serviço ou plano pode não estar disponível em todas as regiões. Confirme a disponibilidade na App Store local.",
      source: "A fonte não é a App Store; a avaliação de risco é, por isso, apenas indicativa.",
      lowPrice: "O preço está claramente abaixo da referência dos EUA; verifique com atenção o pagamento e o país da conta.",
      highPrice: "O preço está claramente acima da referência dos EUA. Trata-se sobretudo de um custo maior, não necessariamente de um risco da plataforma.",
      taxLow: "A informação fiscal tem baixa fiabilidade e deve ser verificada.",
      fallback: "Consulte as condições de assinatura desta região na página oficial de pagamento e nas regras da plataforma.",
    },
  }[locale];

  if (/Apple ID region|account region|payment method|billing information/i.test(raw)) return copy.account;
  if (/gift card|local payment|local billing|VPN/i.test(raw)) return copy.payment;
  if (/not an App Store source/i.test(raw)) return copy.source;
  if (/far below|clearly below/i.test(raw)) return copy.lowPrice;
  if (/far above/i.test(raw)) return copy.highPrice;
  if (/Tax profile confidence is low/i.test(raw)) return copy.taxLow;
  if (/tax|checkout|final price/i.test(raw)) return copy.tax;
  if (/availability|not available|region restriction/i.test(raw)) return copy.availability;
  return copy.fallback;
}

function getLocalizedRiskProfileText({
  zh,
  en,
  locale,
}: {
  zh: string | null;
  en: string | null;
  locale: DetailLocale;
}) {
  const zhText = zh?.trim();
  const enText = en?.trim();
  const canonical = enText || zhText;

  if (!canonical) return undefined;
  if (locale === "ja") {
    return translateRiskProfileTextToJa(canonical);
  }
  if (locale === "ko") {
    return translateRiskProfileTextToKo(canonical);
  }
  if (locale === "es") {
    return translateRiskProfileTextToEs(canonical);
  }
  if (locale === "tr") {
    return translateRiskProfileTextToTr(canonical);
  }
  if (locale === "ar") {
    return translateRiskProfileTextToAr(canonical);
  }
  if (locale === "fr" || locale === "it" || locale === "de" || locale === "pt") {
    return translateRiskProfileTextToLatin(canonical, locale);
  }
  if (locale !== "zh") return canonical;

  if (zhText && !hasBrokenText(zhText) && hasCjkText(zhText)) {
    return zhText;
  }

  return enText ? translateRiskProfileTextToZh(enText) : undefined;
}

function assessAppStoreRisk({
  baseLevel,
  baseScore,
  baseFactors,
  baseNote,
  requirements,
  diffPercent,
  taxConfidence,
  taxVariable,
  billingPlatform,
  locale,
}: {
  baseLevel: string | null;
  baseScore: unknown;
  baseFactors?: string;
  baseNote?: string;
  requirements?: string;
  diffPercent: number;
  taxConfidence: string | null;
  taxVariable: boolean | null;
  billingPlatform: string | null;
  locale: DetailLocale;
}) {
  const factors: string[] = [];
  let score = toNumber(baseScore);

  if (score <= 0) {
    const level = getRiskLevel(baseLevel);
    score = level === "low" ? 42 : level === "high" ? 78 : level === "medium" ? 62 : 58;
  }

  if (baseFactors) factors.push(baseFactors);

  const platform = (billingPlatform || "unknown").toLowerCase();
  if (platform !== "ios") {
    score += 5;
    factors.push(
      locale === "zh"
        ? "当前不是 App Store 来源，风险模型仅作参考。"
        : locale === "ja"
          ? "App Store以外の情報元であるため、リスク評価は参考値です。"
          : locale === "ko"
            ? "App Store 이외의 출처이므로 위험 평가는 참고용입니다."
            : locale === "es"
              ? "La fuente no es App Store, por lo que la evaluación de riesgo es solo orientativa."
              : locale === "tr"
                ? "Kaynak App Store olmadığı için risk değerlendirmesi yalnızca genel bir göstergedir."
                : locale === "ar"
                  ? "المصدر ليس App Store، لذا فإن تقييم المخاطر إرشادي فقط."
                : "This is not an App Store source, so the risk model is only indicative.",
    );
  }

  if (diffPercent <= -40) {
    score += 10;
    factors.push(
      locale === "zh"
        ? "价格大幅低于美国，跨区订阅时更需要关注付款和账号限制。"
        : locale === "ja"
          ? "米国基準より大幅に安いため、支払い方法とアカウント地域の条件に注意が必要です。"
          : locale === "ko"
            ? "미국 기준보다 크게 저렴하므로 결제 수단과 계정 지역 조건을 특히 확인해야 합니다."
            : locale === "es"
              ? "El precio está muy por debajo de la referencia de EE. UU.; conviene revisar con especial atención el método de pago y la región de la cuenta."
              : locale === "tr"
                ? "Fiyat ABD referansının çok altındadır; ödeme yöntemini ve hesap bölgesi koşullarını özellikle kontrol edin."
                : locale === "ar"
                  ? "السعر أقل بكثير من مرجع الولايات المتحدة؛ تحقّق بعناية من وسيلة الدفع وشروط منطقة الحساب."
                : "The price is far below the US reference, so payment and account restrictions deserve extra attention.",
    );
  } else if (diffPercent <= -25) {
    score += 6;
    factors.push(
      locale === "zh"
        ? "价格明显低于美国，建议以结算页能否完成为准。"
        : locale === "ja"
          ? "米国基準より明らかに安いため、公式の購入画面で手続きできるかをご確認ください。"
          : locale === "ko"
            ? "미국 기준보다 뚜렷하게 저렴하므로 공식 결제 화면에서 실제 구매 가능 여부를 확인하세요."
            : locale === "es"
              ? "El precio es claramente inferior a la referencia de EE. UU.; comprueba que la compra pueda completarse en la pantalla oficial de pago."
              : locale === "tr"
                ? "Fiyat ABD referansından belirgin biçimde düşüktür; satın alma işleminin resmî ödeme ekranında tamamlanabildiğini doğrulayın."
                : locale === "ar"
                  ? "السعر أقل بوضوح من مرجع الولايات المتحدة؛ تأكد من إمكانية إتمام الشراء في شاشة الدفع الرسمية."
                : "The price is clearly below the US reference; rely on checkout completion.",
    );
  } else if (diffPercent <= -12) {
    score += 3;
  } else if (diffPercent >= 45) {
    score += 3;
    factors.push(
      locale === "zh"
        ? "价格明显高于美国，主要体现为成本风险，不直接等同于平台高风控。"
        : locale === "ja"
          ? "米国基準より大幅に高い価格です。これは主に費用面の注意であり、プラットフォーム上の高リスクを直接示すものではありません。"
          : locale === "ko"
            ? "미국 기준보다 크게 비싼 가격입니다. 이는 주로 비용 부담을 뜻하며 플랫폼 위험이 높다는 의미는 아닙니다."
            : locale === "es"
              ? "El precio está muy por encima de la referencia de EE. UU. Esto supone sobre todo un mayor coste, no necesariamente un riesgo elevado de la plataforma."
              : locale === "tr"
                ? "Fiyat ABD referansının çok üzerindedir. Bu durum daha çok maliyet yükünü gösterir; tek başına yüksek platform riski anlamına gelmez."
                : locale === "ar"
                  ? "السعر أعلى بكثير من مرجع الولايات المتحدة. ويعكس ذلك عبئاً مالياً أكبر، لا خطراً مرتفعاً على المنصة بالضرورة."
                : "The price is far above the US reference; this is mainly cost risk, not high platform risk by itself.",
    );
  }

  if (taxVariable) {
    score += 3;
    factors.push(
      locale === "zh"
        ? "税费按州或省变化，结算价可能和展示价略有差异。"
        : locale === "ja"
          ? "税額は州や地域によって異なるため、最終支払額が表示価格と少し異なる場合があります。"
          : locale === "ko"
            ? "세금은 주나 지역에 따라 달라 최종 결제 금액이 표시 가격과 다를 수 있습니다."
            : locale === "es"
              ? "Los impuestos varían según el estado o la provincia, por lo que el importe final puede diferir del precio mostrado."
              : locale === "tr"
                ? "Vergiler eyalet veya bölgeye göre değişebildiği için son ödeme tutarı gösterilen fiyattan farklı olabilir."
                : locale === "ar"
                  ? "تختلف الضرائب حسب الولاية أو المنطقة، لذلك قد يختلف المبلغ النهائي عن السعر المعروض."
                : "Taxes vary by state or province, so checkout price may differ slightly.",
    );
  }

  if (taxConfidence === "low") {
    score += 5;
    factors.push(
      locale === "zh"
        ? "税务资料可信度较低。"
        : locale === "ja"
          ? "税情報の信頼性が低いため、確認が必要です。"
          : locale === "ko"
            ? "세금 정보의 신뢰도가 낮아 확인이 필요합니다."
            : locale === "es"
              ? "La información fiscal tiene una fiabilidad baja y conviene verificarla."
              : locale === "tr"
                ? "Vergi bilgilerinin güven düzeyi düşüktür; ayrıca doğrulanması gerekir."
                : locale === "ar"
                  ? "موثوقية المعلومات الضريبية منخفضة وتحتاج إلى تحقق إضافي."
                : "Tax profile confidence is low.",
    );
  } else if (taxConfidence === "medium") {
    score += 1;
  }

  const finalScore = clampRiskScore(score);
  const finalLevel = getRiskLevelFromScore(finalScore);
  const noteParts = [...new Set([requirements, baseNote].filter(Boolean))];
  const riskNote =
    noteParts.join(" ") ||
    (locale === "zh"
      ? "跨区订阅可能受到 Apple ID 地区、付款方式、账单信息和平台风控影响。"
      : locale === "ja"
        ? "地域をまたぐ契約では、Apple Accountの地域、支払い方法、請求先情報、プラットフォームの審査が影響する場合があります。"
        : locale === "ko"
          ? "지역 간 구독은 Apple Account의 국가·지역, 결제 수단, 청구 정보와 플랫폼 심사의 영향을 받을 수 있습니다."
          : locale === "es"
            ? "Las suscripciones entre regiones pueden depender del país o la región de la cuenta de Apple, el método de pago, los datos de facturación y las comprobaciones de la plataforma."
            : locale === "tr"
              ? "Bölgeler arası aboneliklerde Apple hesabının ülkesi veya bölgesi, ödeme yöntemi, fatura bilgileri ve platform kontrolleri etkili olabilir."
              : locale === "ar"
                ? "قد تتأثر الاشتراكات بين المناطق ببلد أو منطقة حساب Apple وطريقة الدفع وبيانات الفوترة وضوابط المنصة."
              : locale === "fr" || locale === "it" || locale === "de" || locale === "pt"
                ? translateRiskProfileTextToLatin("Apple ID region and payment method", locale)
              : "Cross-region subscription may be affected by Apple ID region, payment method, billing information, and platform risk controls.");

  return {
    level: finalLevel,
    score: finalScore,
    note: `${riskNote} ${
      locale === "zh"
        ? "模型判断："
        : locale === "ja"
          ? "評価："
          : locale === "ko"
            ? "평가: "
            : locale === "es"
              ? "Evaluación: "
              : locale === "tr"
                ? "Değerlendirme: "
                : locale === "ar"
                  ? "التقييم: "
                : locale === "fr"
                  ? "Évaluation : "
                : locale === "it"
                  ? "Valutazione: "
                : locale === "de"
                  ? "Bewertung: "
                : locale === "pt"
                  ? "Avaliação: "
                : "Model rating: "
    }${getRiskLevelLabel(finalLevel, locale)} (${finalScore}/100).`,
    factors: factors
      .map((factor) =>
        locale === "fr" || locale === "it" || locale === "de" || locale === "pt"
          ? translateRiskProfileTextToLatin(factor, locale)
          : factor,
      )
      .join(" "),
  };
}
function getLocalizedRiskText({
  zh,
  en,
  locale,
}: {
  zh: string | null;
  en: string | null;
  locale: DetailLocale;
}) {
  return getLocalizedRiskProfileText({ zh, en, locale });
}

function buildProductFromRows(
  _productSlug: string,
  rows: PricingDetailRow[],
  locale: DetailLocale,
): SubscriptionProduct | null {
  if (rows.length === 0) {
    return null;
  }

  const firstRow = rows[0];
  const planMap = new Map<
    string,
    {
      slug: string;
      name: string;
      billing: ProductPlan["billing"];
      description?: string;
      sortOrder: number;
      pendingObservationCount: number;
      regions: RegionPrice[];
    }
  >();

  rows.forEach((row) => {
    const planSlug = row.plan_slug;

    if (!planMap.has(planSlug)) {
      planMap.set(planSlug, {
        slug: planSlug,
        name: row.plan_name,
        billing: getPlanBilling(row.billing_cycle),
        description: row.plan_description || undefined,
        sortOrder: row.plan_sort_order || 0,
        pendingObservationCount: Number(row.pending_observation_count || 0),
        regions: [],
      });
    }

    if (!row.country_code || row.price_usd === null || row.local_price === null || !row.currency) {
      return;
    }

    const diffPercent = toNumber(row.diff_vs_us_percent);
    const countryCode = row.country_code.toUpperCase();
    const riskBaseNote = getLocalizedRiskText({
      zh: row.risk_note_zh,
      en: row.risk_note_en,
      locale,
    });
    const riskRequirements = getLocalizedRiskText({
      zh: row.risk_requirements_zh,
      en: row.risk_requirements_en,
      locale,
    });
    const assessedRisk = assessAppStoreRisk({
      baseLevel: row.risk_level,
      baseScore: row.risk_base_score,
      baseFactors: getLocalizedRiskText({
        zh: row.risk_factors_zh,
        en: row.risk_factors_en,
        locale,
      }),
      baseNote: riskBaseNote,
      requirements: riskRequirements,
      diffPercent,
      taxConfidence: row.tax_profile_confidence,
      taxVariable: row.tax_profile_is_variable,
      billingPlatform: row.billing_platform,
      locale,
    });

    planMap.get(planSlug)?.regions.push({
      rank: 0,
      country: getCountryName(
        countryCode,
        row.country_name_zh,
        row.country_name_en,
        locale,
      ),
      code: countryCode,
      priceUsd: toNumber(row.price_usd),
      localPrice: formatLocalPrice(row.local_price, row.currency, locale),
      tax: getTaxNote({
        taxNote: row.tax_note,
        taxProfileNoteZh: row.tax_profile_note_zh,
        taxProfileNoteEn: row.tax_profile_note_en,
        billingPlatform: row.billing_platform,
        locale,
      }),
      taxConfidence: getTaxConfidence(row.tax_profile_confidence),
      taxSourceKind: getTaxSourceKind(row.tax_profile_source_kind),
      taxTreatment: getTaxTreatment(row.tax_profile_treatment),
      taxCalculationPolicy: getTaxCalculationPolicy(row.tax_profile_calculation_policy),
      taxReviewStatus: getTaxReviewStatus(row.tax_profile_review_status),
      taxFrontendNote: getTaxFrontendNote({
        zh: row.tax_profile_frontend_note_zh,
        en: row.tax_profile_frontend_note_en,
        locale,
      }),
      riskLevel: assessedRisk.level,
      riskScore: assessedRisk.score,
      riskNote: assessedRisk.note,
      riskRequirements,
      riskFactors: assessedRisk.factors,
      billingPlatform: row.billing_platform || "unknown",
      billingPlatformLabel: getBillingPlatformLabel(row.billing_platform),
      lastCheckedAt: formatDate(row.last_checked_at),
      fxRateDate: row.fx_rate_date || undefined,
      reviewedAt: formatDate(row.reviewed_at),
      sourceName: row.source_name || (row.billing_platform === "ios" ? "App Store" : undefined),
      confidenceScore: Number(row.confidence_score || 0),
      dataQuality:
        row.data_quality === "verified" ||
        row.data_quality === "estimated" ||
        row.data_quality === "stale" ||
        row.data_quality === "pending_review"
          ? row.data_quality
          : "unknown",
      isReference: Boolean(row.is_reference) || countryCode === "US",
      isCheap: diffPercent < -5,
      isExpensive: diffPercent > 18,
    });
  });

  const plans = [...planMap.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map<ProductPlan>((plan) => {
      const regions = [...plan.regions]
        .sort((a, b) => a.priceUsd - b.priceUsd)
        .map((region, index) => ({
          ...region,
          rank: index + 1,
        }));

      return {
        slug: plan.slug,
        name: plan.name,
        billing: plan.billing,
        description: plan.description,
        priceStatus:
          regions.length > 0
            ? "published"
            : plan.pendingObservationCount > 0
              ? "pending"
              : "empty",
        pendingObservationCount: plan.pendingObservationCount,
        freshness: getPlanFreshness(regions),
        regions,
      };
    });

  const defaultPlan = plans[0]?.slug || "";
  return {
    slug: firstRow.product_slug,
    category: firstRow.product_category === "streaming" ? "streaming" : "ai",
    name: firstRow.product_name,
    brand: firstRow.product_provider || firstRow.product_name,
    description:
      locale === "ja"
        ? `${firstRow.product_name}のサブスクリプション料金を地域別に比較します。`
        : locale === "ko"
          ? `${firstRow.product_name}의 구독 가격을 지역별로 비교합니다.`
          : locale === "es"
            ? `Compara los precios de suscripción de ${firstRow.product_name} entre regiones.`
            : locale === "tr"
              ? `${firstRow.product_name} abonelik fiyatlarını bölgeler arasında karşılaştırın.`
              : locale === "ar"
                ? `قارن أسعار اشتراك ${firstRow.product_name} بين المناطق.`
              : firstRow.product_description ||
              (locale === "zh"
                ? `比较 ${firstRow.product_name} 不同地区的订阅价格。`
                : `Compare ${firstRow.product_name} subscription prices across regions.`),
    logoUrl: firstRow.product_logo_url || undefined,
    officialUrl: firstRow.product_official_url || undefined,
    defaultPlan,
    updatedAt: plans[0]?.freshness?.pageUpdatedAt || "",
    sourceNote:
      locale === "zh"
        ? "正式价格来自已复核的公开平台地区价格，页面按当前套餐单独计算日期与可信状态。"
        : locale === "ja"
          ? "掲載価格は確認済みの公開地域別価格です。日付と信頼性は、表示中のプランごとに算出しています。"
          : locale === "ko"
            ? "표시 가격은 검토된 공개 지역별 가격입니다. 날짜와 신뢰도는 현재 선택한 요금제를 기준으로 계산합니다."
            : locale === "es"
              ? "Los precios publicados proceden de tarifas regionales públicas revisadas. Las fechas y la fiabilidad se calculan para el plan seleccionado."
              : locale === "tr"
                ? "Yayımlanan fiyatlar incelenmiş bölgesel liste fiyatlarından alınır. Tarihler ve güven durumu seçili paket için ayrı hesaplanır."
                : locale === "ar"
                  ? "تأتي الأسعار المنشورة من أسعار إقليمية عامة خضعت للمراجعة. وتُحسب التواريخ وحالة الموثوقية لكل باقة على حدة."
                : "Published prices come from reviewed public regional pricing. Dates and trust status are calculated for the selected plan.",
    plans,
  };
}

export async function getPricingDetailProduct(
  productSlug: string,
  locale: DetailLocale = "zh",
) {
  const rows = await prisma.$queryRaw<PricingDetailRow[]>`
    SELECT
      p.slug AS product_slug,
      p.name AS product_name,
      p.category::text AS product_category,
      p.provider AS product_provider,
      p.description AS product_description,
      p.logo_url AS product_logo_url,
      p.official_url AS product_official_url,
      pl.slug AS plan_slug,
      pl.name AS plan_name,
      pl.billing_cycle::text AS billing_cycle,
      pl.description AS plan_description,
      pl.sort_order AS plan_sort_order,
      COALESCE(pending.pending_observation_count, 0)::int AS pending_observation_count,

      c.code AS country_code,
      c.name_zh AS country_name_zh,
      c.name_en AS country_name_en,
      c.is_reference AS is_reference,

      rp.local_price,
      rp.currency,
      rp.price_usd,
      rp.diff_vs_us_percent,
      rp.tax_note,
      tax_profile.display_note_zh AS tax_profile_note_zh,
      tax_profile.display_note_en AS tax_profile_note_en,
      tax_profile.confidence AS tax_profile_confidence,
      tax_profile.source_kind AS tax_profile_source_kind,
      tax_profile.is_variable_by_region AS tax_profile_is_variable,
      tax_profile.app_store_tax_treatment AS tax_profile_treatment,
      tax_profile.price_calculation_policy AS tax_profile_calculation_policy,
      tax_profile.review_status AS tax_profile_review_status,
      tax_profile.frontend_note_zh AS tax_profile_frontend_note_zh,
      tax_profile.frontend_note_en AS tax_profile_frontend_note_en,
      risk_profile.risk_level AS risk_level,
      risk_profile.base_risk_score AS risk_base_score,
      risk_profile.risk_factors_zh AS risk_factors_zh,
      risk_profile.risk_factors_en AS risk_factors_en,
      risk_profile.display_note_zh AS risk_note_zh,
      risk_profile.display_note_en AS risk_note_en,
      risk_profile.requirements_zh AS risk_requirements_zh,
      risk_profile.requirements_en AS risk_requirements_en,
      rp.availability_note,
      rp.billing_platform::text AS billing_platform,
      rp.last_checked_at,
      latest_observation.raw_payload ->> 'fx_rate_date' AS fx_rate_date,
      latest_observation.reviewed_at,
      source.name AS source_name,
      rp.confidence_score,
      rp.data_quality::text AS data_quality
    FROM products p
    JOIN plans pl ON pl.product_id = p.id
    JOIN region_prices rp
      ON rp.product_id = p.id
      AND rp.plan_id = pl.id
      AND rp.status = 'published'
      AND rp.price_usd IS NOT NULL
    JOIN countries c ON c.id = rp.country_id
    LEFT JOIN price_sources source ON source.id = rp.primary_source_id
    LEFT JOIN country_tax_profiles tax_profile
      ON tax_profile.country_id = c.id
      AND tax_profile.status = 'active'
    LEFT JOIN country_app_store_risk_profiles risk_profile
      ON risk_profile.country_id = c.id
      AND risk_profile.status = 'active'
    LEFT JOIN LATERAL (
      SELECT
        po.raw_payload,
        COALESCE(
          NULLIF(po.raw_payload ->> 'approved_at', '')::timestamptz,
          NULLIF(po.raw_payload ->> 'auto_approved_at', '')::timestamptz,
          po.updated_at
        ) AS reviewed_at
      FROM price_observations po
      WHERE po.product_id = p.id
        AND po.plan_id = pl.id
        AND po.country_id = rp.country_id
        AND po.billing_platform = rp.billing_platform
        AND (
          po.status = 'approved'
          OR (
            po.status = 'ignored'
            AND po.raw_payload ->> 'auto_review_reason_code' = 'superseded_by_published_price'
          )
        )
      ORDER BY po.observed_at DESC, po.created_at DESC
      LIMIT 1
    ) latest_observation ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS pending_observation_count
      FROM price_observations po
      WHERE po.product_id = p.id
        AND po.plan_id = pl.id
        AND po.status = 'pending'
    ) pending ON TRUE
    WHERE p.slug = ${productSlug}
      AND p.status = 'published'
      AND p.category IN ('ai'::product_category, 'streaming'::product_category)
      AND pl.status = 'published'
    ORDER BY pl.sort_order ASC, rp.price_usd ASC, rp.billing_platform ASC
  `;

  const product = buildProductFromRows(
    productSlug,
    rows,
    locale === "zh-tw" ? "zh" : locale,
  );

  return locale === "zh-tw" ? toTraditionalChinese(product) : product;
}
