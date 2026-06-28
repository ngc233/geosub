import { prisma } from "./prisma";
import type {
  ProductCategory,
  SubscriptionProduct,
  ProductPlan,
  RegionPrice,
} from "./ai-pricing-model";

type AiPricingLocale = "zh" | "en";

function mapCategory(category: string): ProductCategory | null {
  if (category === "AI") return "ai";
  if (category === "STREAMING") return "streaming";
  return null;
}

function mapBillingCycle(value: string): ProductPlan["billing"] {
  if (value === "MONTHLY") return "monthly";
  if (value === "YEARLY") return "yearly";
  if (value === "WEEKLY") return "weekly";
  if (value === "QUARTERLY") return "quarterly";
  if (value === "ONE_TIME") return "one_time";
  if (value === "LIFETIME") return "lifetime";
  return "unknown";
}

function formatYearMonth(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatLocalPrice({
  amount,
  currency,
  billing,
}: {
  amount: number;
  currency: string;
  billing: ProductPlan["billing"];
}) {
  const suffix =
    billing === "monthly"
      ? "/mo"
      : billing === "yearly"
        ? "/yr"
        : billing === "weekly"
          ? "/wk"
          : "";

  return `${amount.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })} ${currency}${suffix}`;
}

function taxText(locale: AiPricingLocale, taxNote?: string | null) {
  if (taxNote) return taxNote;

  return locale === "en"
    ? "Tax may vary by region"
    : "税费可能因地区而异";
}

function defaultDescription({
  name,
  category,
  locale,
}: {
  name: string;
  category: ProductCategory;
  locale: AiPricingLocale;
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

function sourceNote(locale: AiPricingLocale) {
  return locale === "en"
    ? "Database-backed pricing data. Final checkout prices may vary by taxes, exchange rates, platform and region."
    : "数据库价格数据。最终结算价格可能因税费、汇率、平台和地区政策变化而不同。";
}

function mapRegions({
  prices,
  locale,
  billing,
}: {
  prices: Array<{
    localPrice: unknown;
    currency: string;
    priceUsd: unknown;
    taxNote: string | null;
    country: {
      code: string;
      nameZh: string;
      nameEn: string;
    };
  }>;
  locale: AiPricingLocale;
  billing: ProductPlan["billing"];
}): RegionPrice[] {
  const sorted = [...prices].sort(
    (a, b) => Number(a.priceUsd) - Number(b.priceUsd)
  );

  const expensiveStart = Math.max(0, sorted.length - 2);

  return sorted.map((price, index) => {
    const code = price.country.code.toUpperCase();

    return {
      rank: index + 1,
      country:
        locale === "en"
          ? price.country.nameEn
          : price.country.nameZh || price.country.nameEn,
      code,
      priceUsd: Number(price.priceUsd),
      localPrice: formatLocalPrice({
        amount: Number(price.localPrice),
        currency: price.currency,
        billing,
      }),
      tax: taxText(locale, price.taxNote),
      isCheap: index <= 2,
      isExpensive: index >= expensiveStart && sorted.length > 3,
      isReference: code === "US",
    };
  });
}

export async function getAiPricingProducts({
  locale = "zh",
  category,
}: {
  locale?: AiPricingLocale;
  category?: ProductCategory;
} = {}) {
  const categoryWhere =
    category === "ai"
      ? "AI"
      : category === "streaming"
        ? "STREAMING"
        : undefined;

  const products = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
      category: categoryWhere
        ? (categoryWhere as never)
        : {
            in: ["AI", "STREAMING"] as never,
          },
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
            include: {
              country: true,
            },
            orderBy: {
              priceUsd: "asc",
            },
          },
        },
      },
    },
  });

  return products
    .map<SubscriptionProduct | null>((product) => {
      const mappedCategory = mapCategory(String(product.category));

      if (!mappedCategory) {
        return null;
      }

      const plans = product.plans
        .map<ProductPlan | null>((plan) => {
          const billing = mapBillingCycle(String(plan.billingCycle));

          const regions = mapRegions({
            prices: plan.regionPrices,
            locale,
            billing,
          });

          if (regions.length === 0) {
            return null;
          }

          return {
            slug: plan.slug,
            name: plan.name,
            billing,
            description: plan.description || undefined,
            regions,
          };
        })
        .filter((plan): plan is ProductPlan => Boolean(plan));

      if (plans.length === 0) {
        return null;
      }

      const updatedAt =
        product.plans
          .flatMap((plan) => plan.regionPrices)
          .map((price) => price.lastCheckedAt || price.updatedAt)
          .filter(Boolean)
          .sort((a, b) => b.getTime() - a.getTime())[0] || product.updatedAt;

      return {
        slug: product.slug,
        category: mappedCategory,
        name: product.name,
        brand: product.provider || product.name,
        description:
          product.description ||
          defaultDescription({
            name: product.name,
            category: mappedCategory,
            locale,
          }),
        logoUrl: product.logoUrl || undefined,
        accentIcon: product.name.slice(0, 1).toUpperCase(),
        defaultPlan: plans[0]?.slug || "",
        updatedAt: formatYearMonth(updatedAt),
        sourceNote: sourceNote(locale),
        plans,
      } as SubscriptionProduct;
    })
    .filter((product): product is SubscriptionProduct => Boolean(product));
}