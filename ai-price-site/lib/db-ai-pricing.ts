import { ProductCategory } from "@prisma/client";
import { prisma } from "./prisma";
import type {
  DbPricingCategory,
  DbPricingProduct,
  DbPricingPlan,
  DbPricingRegion,
} from "./db-pricing-types";

type DbPricingLocale = "zh" | "en";
type TaxProfileRow = {
  country_code: string;
  display_note_zh: string | null;
  display_note_en: string | null;
  confidence: string | null;
  app_store_tax_treatment: string | null;
  review_status: string | null;
  frontend_note_zh: string | null;
  frontend_note_en: string | null;
};
const countryNameZhMap: Record<string, string> = {
  US: "美国",
  CA: "加拿大",
  MX: "墨西哥",
  GB: "英国",
  DE: "德国",
  FR: "法国",
  ES: "西班牙",
  IT: "意大利",
  NL: "荷兰",
  DK: "丹麦",
  SE: "瑞典",
  NO: "挪威",
  CH: "瑞士",
  PL: "波兰",
  TR: "土耳其",
  JP: "日本",
  KR: "韩国",
  SG: "新加坡",
  HK: "中国香港",
  TW: "中国台湾",
  IN: "印度",
  PH: "菲律宾",
  TH: "泰国",
  MY: "马来西亚",
  ID: "印度尼西亚",
  VN: "越南",
  AU: "澳大利亚",
  NZ: "新西兰",
  BR: "巴西",
  AR: "阿根廷",
  CL: "智利",
  CO: "哥伦比亚",
  ZA: "南非",
  AE: "阿联酋",
};

const productDisplayNameMap: Record<string, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  netflix: "Netflix",
};

function getCountryName({
  code,
  nameZh,
  nameEn,
  locale,
}: {
  code: string;
  nameZh: string;
  nameEn: string;
  locale: DbPricingLocale;
}) {
  const normalizedCode = code.toUpperCase();

  if (locale === "en") {
    return nameEn;
  }

  return countryNameZhMap[normalizedCode] || nameZh || nameEn;
}

function getProductDescription({
  name,
  category,
  locale,
}: {
  name: string;
  category: DbPricingCategory;
  locale: DbPricingLocale;
}) {
  return defaultDescription({
    name,
    category,
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

function formatYearMonth(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function billingSuffix(billingCycle: string) {
  if (billingCycle === "MONTHLY") return "/mo";
  if (billingCycle === "YEARLY") return "/yr";
  if (billingCycle === "WEEKLY") return "/wk";
  return "";
}

function formatLocalPrice({
  amount,
  currency,
  billingCycle,
}: {
  amount: unknown;
  currency: string;
  billingCycle: string;
}) {
  const numberValue = Number(amount);

  if (Number.isNaN(numberValue)) {
    return `— ${currency}`;
  }

  return `${numberValue.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })} ${currency}${billingSuffix(billingCycle)}`;
}

function defaultDescription({
  name,
  category,
  locale,
}: {
  name: string;
  category: DbPricingCategory;
  locale: DbPricingLocale;
}) {
  if (locale === "en") {
    return `Compare ${name} subscription prices, cheapest regions and regional price spread.`;
  }

  return `比较 ${name} 在不同国家与地区的订阅价格、最低价地区和价差。`;
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
  const explicitNote = priceTaxNote?.trim();

  if (explicitNote) {
    return explicitNote;
  }

  const profileNote =
    locale === "zh"
      ? taxProfile?.display_note_zh?.trim()
      : taxProfile?.display_note_en?.trim();

  if (profileNote) {
    return profileNote;
  }

  return locale === "en"
    ? "Tax may vary at checkout"
    : "税费以结算页为准";
}

function getTaxConfidence(value?: string | null): DbPricingRegion["taxConfidence"] {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return "unknown";
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
  return (
    (locale === "zh"
      ? taxProfile?.frontend_note_zh?.trim()
      : taxProfile?.frontend_note_en?.trim()) || ""
  );
}

export async function getDbAiPricingProducts({
  locale = "zh",
}: {
  locale?: DbPricingLocale;
} = {}) {
  const [products, taxProfileRows] = await Promise.all([
    prisma.product.findMany({
      where: {
        category: {
          in: [ProductCategory.AI, ProductCategory.STREAMING],
        },
        OR: [
          { status: "PUBLISHED" },
          {
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
        ],
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

  return products
    .map<DbPricingProduct | null>((product) => {
      const category = mapCategory(product.category);

      if (!category) {
        return null;
      }

      const displayName = productDisplayNameMap[product.slug] || product.name;

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
              countryName: getCountryName({
                code: price.country.code,
                nameZh: price.country.nameZh,
                nameEn: price.country.nameEn,
                locale,
              }),
              localPrice: formatLocalPrice({
                amount: price.localPrice,
                currency: price.currency,
                billingCycle: String(plan.billingCycle),
              }),
              priceUsd: Number(price.priceUsd),
              taxNote: getTaxNote({
                priceTaxNote: price.taxNote,
                taxProfile,
                locale,
              }),
              taxConfidence: getTaxConfidence(taxProfile?.confidence),
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
          category,
          locale,
        }),
        updatedAt: formatYearMonth(latestDate),
        plans,
      };
    })
    .filter((product): product is DbPricingProduct => Boolean(product));
}
