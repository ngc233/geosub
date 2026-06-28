import { ProductCategory } from "@prisma/client";
import { prisma } from "./prisma";
import type {
  DbPricingCategory,
  DbPricingProduct,
  DbPricingPlan,
  DbPricingRegion,
} from "./db-pricing-types";

type DbPricingLocale = "zh" | "en";
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

const productDescriptionZhMap: Record<string, string> = {
  chatgpt: "比较 ChatGPT Plus 和 Pro 在不同国家与地区的订阅价格、美元折算价和价格差异。",
  netflix: "比较 Netflix 在不同国家与地区的订阅价格、套餐差异和区域价格差距。",
};

const productDescriptionEnMap: Record<string, string> = {
  chatgpt: "Compare ChatGPT Plus and Pro subscription prices across countries and regions.",
  netflix: "Compare Netflix subscription prices, plans and regional price differences across countries and regions.",
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
  slug,
  name,
  category,
  rawDescription,
  locale,
}: {
  slug: string;
  name: string;
  category: DbPricingCategory;
  rawDescription?: string | null;
  locale: DbPricingLocale;
}) {
  if (locale === "zh") {
    return (
      productDescriptionZhMap[slug] ||
      defaultDescription({
        name,
        category,
        locale,
      })
    );
  }

  return (
    productDescriptionEnMap[slug] ||
    rawDescription ||
    defaultDescription({
      name,
      category,
      locale,
    })
  );
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
    if (category === "ai") {
      return `Compare ${name} subscription prices across countries and regions.`;
    }

    return `Compare ${name} subscription prices across countries and regions.`;
  }

  if (category === "ai") {
    return `比较 ${name} 在不同国家和地区的订阅价格、最低价地区和价格差异。`;
  }

  return `比较 ${name} 在不同国家和地区的订阅价格、最低价地区和价格差异。`;
}

export async function getDbAiPricingProducts({
  locale = "zh",
}: {
  locale?: DbPricingLocale;
} = {}) {
  const products = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
      category: {
        in: [ProductCategory.AI, ProductCategory.STREAMING],
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
  });

  return products
    .map<DbPricingProduct | null>((product) => {
      const category = mapCategory(product.category);

      if (!category) {
        return null;
      }

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
              taxNote:
                price.taxNote ||
                (locale === "en"
                  ? "Tax may vary by region"
                  : "税费可能因地区而异"),
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
        name: product.name,
        brand: product.provider || product.name,
        category,
        description: getProductDescription({
          slug: product.slug,
          name: product.name,
          category,
          rawDescription: product.description,
          locale,
        }),
        updatedAt: formatYearMonth(latestDate),
        plans,
      };
    })
    .filter((product): product is DbPricingProduct => Boolean(product));
}