import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "./prisma";

export type DbPricingDetailLocale = "zh" | "en";

export type DbPricingDetailRegion = {
  rank: number;
  code: string;
  countryName: string;
  localPrice: string;
  priceUsd: number;
  diffVsUsPercent: number | null;
  taxNote: string;
  availabilityNote: string;
  sourceSummary: string;
  sourceName: string;
  dataQuality: string;
  confidenceScore: number;
  lastCheckedAt: string;
  isReference: boolean;
  isCheap: boolean;
  isExpensive: boolean;
};

export type DbPricingDetailPlan = {
  slug: string;
  name: string;
  billingCycle: string;
  description: string;
  regionCount: number;
  minRegion: DbPricingDetailRegion;
  maxRegion: DbPricingDetailRegion;
  referenceRegion: DbPricingDetailRegion;
  spreadPercent: number;
  regions: DbPricingDetailRegion[];
};

export type DbPricingDetailProduct = {
  slug: string;
  name: string;
  brand: string;
  categoryLabel: string;
  description: string;
  logoUrl?: string;
  officialUrl: string | null;
  updatedAt: string;
  sourceNote: string;
  plans: DbPricingDetailPlan[];
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

const categoryLabelMap: Record<string, { zh: string; en: string }> = {
  AI: {
    zh: "AI 订阅",
    en: "AI Subscriptions",
  },
  STREAMING: {
    zh: "流媒体",
    en: "Streaming",
  },
  SOFTWARE: {
    zh: "软件订阅",
    en: "Software Subscriptions",
  },
  GAME: {
    zh: "游戏 / Steam",
    en: "Gaming / Steam",
  },
  GIFT_CARD: {
    zh: "礼品卡 / 充值卡",
    en: "Gift Cards",
  },
  PAYMENT: {
    zh: "支付 / 虚拟服务",
    en: "Payments / Virtual Services",
  },
  VPN: {
    zh: "网络工具",
    en: "Network Tools",
  },
  OTHER: {
    zh: "其他",
    en: "Other",
  },
};

const productDescriptionZhMap: Record<string, string> = {
  chatgpt: "比较 ChatGPT Plus 和 Pro 在不同国家与地区的订阅价格、美元折算价、美国基准价和区域价格差异。",
  netflix: "比较 Netflix 在不同国家与地区的订阅价格、套餐差异和区域价格差距。",
};

const productDescriptionEnMap: Record<string, string> = {
  chatgpt: "Compare ChatGPT Plus and Pro subscription prices across countries and regions, including USD equivalents and regional price differences.",
  netflix: "Compare Netflix subscription prices, plans and regional price differences across countries and regions.",
};

function formatDate(value: Date | null | undefined, fallback = "—") {
  if (!value) return fallback;

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatYearMonth(value: Date | null | undefined) {
  if (!value) return "—";

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");

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

function getCountryName({
  code,
  nameZh,
  nameEn,
  locale,
}: {
  code: string;
  nameZh: string;
  nameEn: string;
  locale: DbPricingDetailLocale;
}) {
  const normalizedCode = code.toUpperCase();

  if (locale === "en") {
    return nameEn;
  }

  return countryNameZhMap[normalizedCode] || nameZh || nameEn;
}

function getCategoryLabel(category: string, locale: DbPricingDetailLocale) {
  return categoryLabelMap[category]?.[locale] || category;
}

function getProductDescription({
  slug,
  name,
  rawDescription,
  locale,
}: {
  slug: string;
  name: string;
  rawDescription?: string | null;
  locale: DbPricingDetailLocale;
}) {
  if (locale === "zh") {
    return (
      productDescriptionZhMap[slug] ||
      `比较 ${name} 在不同国家和地区的订阅价格、最低价地区和价格差异。`
    );
  }

  return (
    productDescriptionEnMap[slug] ||
    rawDescription ||
    `Compare ${name} subscription prices across countries and regions.`
  );
}

function getSourceNote(locale: DbPricingDetailLocale) {
  return locale === "en"
    ? "The official V1 ranking uses reviewed App Store regional subscription prices. Web and Google Play signals are kept for diagnostics unless they are labeled separately. Final checkout prices may still vary by tax, exchange rate, platform policy and region."
    : "V1 正式榜单使用已审核的 App Store 各地区订阅价格。Web 官网价和 Google Play 线索暂用于后台诊断，除非单独标注，不会混入正式排行。最终结算价格仍可能因税费、汇率、平台政策和地区而变化。";
}

function getSpreadPercent(minPrice: number, maxPrice: number) {
  if (minPrice <= 0) return 0;
  return Math.round(((maxPrice - minPrice) / minPrice) * 100);
}

function getDiffVsUs({
  explicitDiff,
  priceUsd,
  usPriceUsd,
}: {
  explicitDiff: unknown;
  priceUsd: number;
  usPriceUsd: number | null;
}) {
  const explicitValue = Number(explicitDiff);

  if (!Number.isNaN(explicitValue)) {
    return Number(explicitValue.toFixed(1));
  }

  if (!usPriceUsd || usPriceUsd <= 0) {
    return null;
  }

  return Number((((priceUsd - usPriceUsd) / usPriceUsd) * 100).toFixed(1));
}

export async function getDbPricingProductDetail({
  slug,
  locale = "zh",
}: {
  slug: string;
  locale?: DbPricingDetailLocale;
}) {
  noStore();

  const product = await prisma.product.findUnique({
    where: {
      slug,
    },
    include: {
      plans: {
        where: {
          status: "PUBLISHED",
        },
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            createdAt: "asc",
          },
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
              primarySource: true,
            },
          },
        },
      },
    },
  });

  if (!product || product.status !== "PUBLISHED") {
    return null;
  }

  const plans = product.plans
    .map<DbPricingDetailPlan | null>((plan) => {
      const sortedPrices = [...plan.regionPrices].sort(
        (a, b) => Number(a.priceUsd) - Number(b.priceUsd)
      );

      if (sortedPrices.length === 0) {
        return null;
      }

      const expensiveStart = Math.max(0, sortedPrices.length - 2);
      const usPrice = sortedPrices.find(
        (price) => price.country.code.toUpperCase() === "US"
      );
      const usPriceUsd = usPrice ? Number(usPrice.priceUsd) : null;

      const regions = sortedPrices.map<DbPricingDetailRegion>((price, index) => {
        const code = price.country.code.toUpperCase();
        const priceUsd = Number(price.priceUsd);

        return {
          rank: index + 1,
          code,
          countryName: getCountryName({
            code,
            nameZh: price.country.nameZh,
            nameEn: price.country.nameEn,
            locale,
          }),
          localPrice: formatLocalPrice({
            amount: price.localPrice,
            currency: price.currency,
            billingCycle: String(plan.billingCycle),
          }),
          priceUsd,
          diffVsUsPercent: getDiffVsUs({
            explicitDiff: price.diffVsUsPercent,
            priceUsd,
            usPriceUsd,
          }),
          taxNote:
            price.taxNote ||
            (locale === "en"
              ? "Tax may vary by region"
              : "税费可能因地区而异"),
          availabilityNote: price.availabilityNote || "—",
          sourceSummary: price.sourceSummary || "—",
          sourceName: price.primarySource?.name || "—",
          dataQuality: String(price.dataQuality),
          confidenceScore: price.confidenceScore,
          lastCheckedAt: formatDate(price.lastCheckedAt || price.updatedAt),
          isReference: code === "US",
          isCheap: index <= 2,
          isExpensive: index >= expensiveStart && sortedPrices.length > 3,
        };
      });

      const minRegion = regions[0];
      const maxRegion = regions[regions.length - 1];
      const referenceRegion =
        regions.find((region) => region.isReference) || minRegion;

      return {
        slug: plan.slug,
        name: plan.name,
        billingCycle: String(plan.billingCycle),
        description: plan.description || "—",
        regionCount: regions.length,
        minRegion,
        maxRegion,
        referenceRegion,
        spreadPercent: getSpreadPercent(minRegion.priceUsd, maxRegion.priceUsd),
        regions,
      };
    })
    .filter((plan): plan is DbPricingDetailPlan => Boolean(plan));

  if (plans.length === 0) {
    return null;
  }

  const latestDate =
    product.plans
      .flatMap((plan) => plan.regionPrices)
      .map((price) => price.lastCheckedAt || price.updatedAt)
      .filter((date): date is Date => date instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0] || product.updatedAt;

  return {
    slug: product.slug,
    name: product.name,
    brand: product.provider || product.name,
    categoryLabel: getCategoryLabel(String(product.category), locale),
    description: getProductDescription({
      slug: product.slug,
      name: product.name,
      rawDescription: product.description,
      locale,
    }),
    logoUrl: product.logoUrl || undefined,
    officialUrl: product.officialUrl,
    updatedAt: formatYearMonth(latestDate),
    sourceNote: getSourceNote(locale),
    plans,
  } satisfies DbPricingDetailProduct;
}
