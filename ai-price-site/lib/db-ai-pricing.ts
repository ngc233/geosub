import { ProductCategory } from "@prisma/client";
import { prisma } from "./prisma";
import type {
  DbPricingCategory,
  DbPricingProduct,
  DbPricingPlan,
  DbPricingRegion,
} from "./db-pricing-types";
import type { SiteLocale } from "./site-locale";
import { getLocalizedCountryName } from "./country-name";
import { localizeTaxNote } from "./tax-note-localization";
import { toTraditionalChinese } from "./traditional-chinese";

type DbPricingLocale = SiteLocale;
type TaxProfileRow = {
  country_code: string;
  display_note_zh: string | null;
  display_note_en: string | null;
  confidence: string | null;
  source_kind: string | null;
  app_store_tax_treatment: string | null;
  review_status: string | null;
  frontend_note_zh: string | null;
  frontend_note_en: string | null;
};
function getProductDescription({
  name,
  locale,
}: {
  name: string;
  locale: DbPricingLocale;
}) {
  return defaultDescription({
    name,
    locale,
  });
}

function isDate(value: Date | null | undefined): value is Date {
  return value instanceof Date;
}

function mapCategory(category: ProductCategory): DbPricingCategory | null {
  if (category === ProductCategory.AI) return "ai";
  if (category === ProductCategory.STREAMING) return "streaming";
  return null;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function billingSuffix(billingCycle: string, locale: DbPricingLocale) {
  if (locale === "fr") {
    if (billingCycle === "MONTHLY") return "/mois";
    if (billingCycle === "YEARLY") return "/an";
    if (billingCycle === "WEEKLY") return "/semaine";
    return "";
  }
  if (locale === "it") {
    if (billingCycle === "MONTHLY") return "/mese";
    if (billingCycle === "YEARLY") return "/anno";
    if (billingCycle === "WEEKLY") return "/settimana";
    return "";
  }
  if (locale === "de") {
    if (billingCycle === "MONTHLY") return "/Monat";
    if (billingCycle === "YEARLY") return "/Jahr";
    if (billingCycle === "WEEKLY") return "/Woche";
    return "";
  }
  if (locale === "pt") {
    if (billingCycle === "MONTHLY") return "/mês";
    if (billingCycle === "YEARLY") return "/ano";
    if (billingCycle === "WEEKLY") return "/semana";
    return "";
  }
  if (locale === "ar") {
    if (billingCycle === "MONTHLY") return "/شهر";
    if (billingCycle === "YEARLY") return "/سنة";
    if (billingCycle === "WEEKLY") return "/أسبوع";
    return "";
  }

  if (locale === "tr") {
    if (billingCycle === "MONTHLY") return "/ay";
    if (billingCycle === "YEARLY") return "/yıl";
    if (billingCycle === "WEEKLY") return "/hafta";
    return "";
  }

  if (locale === "es") {
    if (billingCycle === "MONTHLY") return "/mes";
    if (billingCycle === "YEARLY") return "/año";
    if (billingCycle === "WEEKLY") return "/semana";
    return "";
  }

  if (locale === "ko") {
    if (billingCycle === "MONTHLY") return "/월";
    if (billingCycle === "YEARLY") return "/년";
    if (billingCycle === "WEEKLY") return "/주";
    return "";
  }

  if (locale === "ja") {
    if (billingCycle === "MONTHLY") return "/月";
    if (billingCycle === "YEARLY") return "/年";
    if (billingCycle === "WEEKLY") return "/週";
    return "";
  }

  if (locale === "zh") {
    if (billingCycle === "MONTHLY") return "/月";
    if (billingCycle === "YEARLY") return "/年";
    if (billingCycle === "WEEKLY") return "/周";
    return "";
  }

  if (billingCycle === "MONTHLY") return "/mo";
  if (billingCycle === "YEARLY") return "/yr";
  if (billingCycle === "WEEKLY") return "/wk";
  return "";
}

function formatLocalPrice({
  amount,
  currency,
  billingCycle,
  locale,
}: {
  amount: unknown;
  currency: string;
  billingCycle: string;
  locale: DbPricingLocale;
}) {
  const numberValue = Number(amount);

  if (Number.isNaN(numberValue)) {
    return `-- ${currency}`;
  }

  return `${numberValue.toLocaleString(locale === "ja" ? "ja-JP" : locale === "ko" ? "ko-KR" : locale === "es" ? "es-ES" : locale === "tr" ? "tr-TR" : locale === "ar" ? "ar" : locale === "fr" ? "fr-FR" : locale === "it" ? "it-IT" : locale === "de" ? "de-DE" : locale === "pt" ? "pt-PT" : locale === "zh" ? "zh-CN" : "en-US", {
    maximumFractionDigits: 2,
  })} ${currency}${billingSuffix(billingCycle, locale)}`;
}

function defaultDescription({
  name,
  locale,
}: {
  name: string;
  locale: DbPricingLocale;
}) {
  if (locale === "en") {
    return `Compare ${name} subscription prices, cheapest regions and regional price spread.`;
  }

  if (locale === "ja") {
    return `${name}のサブスクリプション料金、最安地域、地域別の価格差を比較します。`;
  }

  if (locale === "ko") {
    return `${name}의 구독 가격과 최저가 지역, 지역별 가격 차이를 비교합니다.`;
  }

  if (locale === "es") {
    return `Compara los precios de suscripción de ${name}, las regiones más baratas y las diferencias regionales.`;
  }

  if (locale === "tr") {
    return `${name} abonelik fiyatlarını, en uygun bölgeleri ve bölgesel fiyat farklarını karşılaştırın.`;
  }

  if (locale === "ar") {
    return `قارن أسعار اشتراك ${name} والمناطق الأقل سعراً وفروق الأسعار الإقليمية.`;
  }
  if (locale === "fr") return `Comparez les prix de ${name}, les régions les moins chères et les écarts régionaux.`;
  if (locale === "it") return `Confronta i prezzi di ${name}, le regioni meno care e le differenze regionali.`;
  if (locale === "de") return `Vergleichen Sie die Preise von ${name}, die günstigsten Regionen und regionale Unterschiede.`;
  if (locale === "pt") return `Compare os preços de ${name}, as regiões mais baratas e as diferenças regionais.`;

  return `比较 ${name} 在不同国家与地区的订阅价格、最低价地区和价格差异。`;
}

function getTaxNote({
  priceTaxNote,
  taxProfile,
  locale,
}: {
  priceTaxNote?: string | null;
  taxProfile?: TaxProfileRow;
  locale: DbPricingLocale;
}) {
  const profileNote = getLocalizedTaxProfileText({
    zh: taxProfile?.display_note_zh,
    en: taxProfile?.display_note_en,
    locale,
  });

  if (profileNote) {
    return profileNote;
  }

  const explicitNote = priceTaxNote?.trim();

  if (explicitNote) {
    return localizeTaxNote(explicitNote, locale, { unknownFallback: true });
  }

  if (locale === "en") return "Tax may vary at checkout";
  if (locale === "ja") return "税額は購入画面でご確認ください";
  if (locale === "ko") return "세금은 결제 화면에서 확인하세요";
  if (locale === "es") return "Los impuestos pueden variar al pagar";
  if (locale === "tr") return "Vergiler ödeme sırasında değişebilir";
  if (locale === "ar") return "قد تختلف الضرائب عند الدفع";
  if (locale === "fr") return "Les taxes peuvent varier au moment du paiement";
  if (locale === "it") return "Le imposte possono variare al momento del pagamento";
  if (locale === "de") return "Steuern können beim Bezahlen abweichen";
  if (locale === "pt") return "Os impostos podem variar no pagamento";
  return "税费以结算页为准";
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
  locale: DbPricingLocale;
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

function getTaxConfidence(value?: string | null): DbPricingRegion["taxConfidence"] {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return "unknown";
}

function getTaxSourceKind(value?: string | null): DbPricingRegion["taxSourceKind"] {
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

function getTaxTreatment(value?: string | null): DbPricingRegion["taxTreatment"] {
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

function getTaxReviewStatus(value?: string | null): DbPricingRegion["taxReviewStatus"] {
  if (value === "verified" || value === "needs_review" || value === "unknown") {
    return value;
  }

  return "unknown";
}

function getTaxFrontendNote({
  taxProfile,
  locale,
}: {
  taxProfile?: TaxProfileRow;
  locale: DbPricingLocale;
}) {
  return getLocalizedTaxProfileText({
    zh: taxProfile?.frontend_note_zh,
    en: taxProfile?.frontend_note_en,
    locale,
  });
}

export async function getDbAiPricingProducts({
  locale = "zh",
  categories = [ProductCategory.AI, ProductCategory.STREAMING],
}: {
  locale?: DbPricingLocale;
  categories?: ProductCategory[];
} = {}) {
  const requestedLocale = locale;
  locale = locale === "zh-tw" ? "zh" : locale;

  const [products, taxProfileRows] = await Promise.all([
    prisma.product.findMany({
      where: {
        category: {
          in: categories,
        },
        status: "PUBLISHED",
        plans: {
          some: {
            status: "PUBLISHED",
            regionPrices: {
              some: {
                status: "PUBLISHED",
              },
            },
          },
        },
      },
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "asc" },
      ],
      include: {
        plans: {
          where: {
            status: "PUBLISHED",
          },
          orderBy: [
            { sortOrder: "asc" },
            { createdAt: "asc" },
          ],
          include: {
            regionPrices: {
              where: {
                status: "PUBLISHED",
              },
              orderBy: {
                priceUsd: "asc",
              },
              include: {
                country: true,
              },
            },
          },
        },
      },
    }),
    prisma.$queryRaw<Array<TaxProfileRow>>`
      SELECT
        c.code AS country_code,
        tax_profile.display_note_zh,
        tax_profile.display_note_en,
        tax_profile.confidence,
        tax_profile.source_kind,
        tax_profile.app_store_tax_treatment,
        tax_profile.review_status,
        tax_profile.frontend_note_zh,
        tax_profile.frontend_note_en
      FROM country_tax_profiles tax_profile
      JOIN countries c ON c.id = tax_profile.country_id
      WHERE tax_profile.status = 'active'
    `,
  ]);

  const taxProfileByCountry = new Map(
    taxProfileRows.map((row) => [row.country_code.toUpperCase(), row])
  );

  const localizedProducts = products
    .map<DbPricingProduct | null>((product) => {
      const category = mapCategory(product.category);

      if (!category) {
        return null;
      }

      const displayName = product.name;

      const plans = product.plans
        .map<DbPricingPlan | null>((plan) => {
          const sortedPrices = [...plan.regionPrices].sort(
            (a, b) => Number(a.priceUsd) - Number(b.priceUsd)
          );

          if (sortedPrices.length === 0) {
            return null;
          }

          const expensiveStart = Math.max(0, sortedPrices.length - 2);

          const regions = sortedPrices.map<DbPricingRegion>((price, index) => {
            const code = price.country.code.toUpperCase();
            const taxProfile = taxProfileByCountry.get(code);

            return {
              rank: index + 1,
              code,
              countryName: getLocalizedCountryName({
                code: price.country.code,
                nameZh: price.country.nameZh,
                nameEn: price.country.nameEn,
                locale,
              }),
              localPrice: formatLocalPrice({
                amount: price.localPrice,
                currency: price.currency,
                billingCycle: String(plan.billingCycle),
                locale,
              }),
              priceUsd: Number(price.priceUsd),
              taxNote: getTaxNote({
                priceTaxNote: price.taxNote,
                taxProfile,
                locale,
              }),
              taxConfidence: getTaxConfidence(taxProfile?.confidence),
              taxSourceKind: getTaxSourceKind(taxProfile?.source_kind),
              taxTreatment: getTaxTreatment(taxProfile?.app_store_tax_treatment),
              taxReviewStatus: getTaxReviewStatus(taxProfile?.review_status),
              taxFrontendNote: getTaxFrontendNote({
                taxProfile,
                locale,
              }),
              dataQuality: String(price.dataQuality),
              isReference: code === "US",
              isCheap: index <= 2,
              isExpensive: index >= expensiveStart && sortedPrices.length > 3,
            };
          });

          return {
            slug: plan.slug,
            name: plan.name,
            billingCycle: String(plan.billingCycle),
            regions,
          };
        })
        .filter((plan): plan is DbPricingPlan => Boolean(plan));

      if (plans.length === 0) {
        return null;
      }

      const latestDate =
        product.plans
          .flatMap((plan) => plan.regionPrices)
          .map((price) => price.lastCheckedAt || price.updatedAt)
          .filter(isDate)
          .sort((a, b) => b.getTime() - a.getTime())[0] || product.updatedAt;

      return {
        slug: product.slug,
        name: displayName,
        brand: product.provider || displayName,
        category,
        description: getProductDescription({
          name: displayName,
          locale,
        }),
        logoUrl: product.logoUrl || undefined,
        updatedAt: formatDate(latestDate),
        plans,
      };
    })
    .filter((product): product is DbPricingProduct => Boolean(product));

  return requestedLocale === "zh-tw"
    ? toTraditionalChinese(localizedProducts)
    : localizedProducts;
}
