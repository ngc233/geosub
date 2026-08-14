import { getProductEditorialContent } from "./product-editorial-content.ts";
import {
  getProductOverviewDecisionPlans,
  getProductOverviewPriceFact,
} from "./pricing-product-overview-copy.ts";
import { getPlanDisplayName } from "./pricing-labels.ts";
import type { PricingFaq } from "./pricing-seo.ts";
import type { SubscriptionProduct } from "./public-pricing-model.ts";
import type { SiteLocale } from "./site-locale.ts";

function getReviewedRegionCount(product: SubscriptionProduct) {
  return new Set(
    product.plans.flatMap((plan) =>
      plan.regions.map((region) => region.code),
    ),
  ).size;
}

function getPlanChoiceSummary(
  locale: SiteLocale,
  product: SubscriptionProduct,
) {
  const choices = getProductOverviewDecisionPlans(product)
    .map((plan) => {
      const editorial = getProductEditorialContent(
        locale,
        product.slug,
        plan.slug,
      );
      if (!editorial) return null;

      return `${getPlanDisplayName(product.name, plan.name)}: ${editorial.plan.bestFor
        .trim()
        .replace(/[。.!?！？]+$/u, "")}`;
    })
    .filter((value): value is string => Boolean(value));

  if (choices.length === 0) return "";
  return `${choices.join(locale === "zh" ? "；" : ". ")}${
    locale === "zh" ? "。" : "."
  }`;
}

export function getProductOverviewSearchFaqs({
  locale,
  product,
}: {
  locale: SiteLocale;
  product: SubscriptionProduct;
}): PricingFaq[] {
  if (locale !== "zh" && locale !== "en") return [];

  const lowest = getProductOverviewPriceFact(product);
  const planCount = getProductOverviewDecisionPlans(product).length;
  const regionCount = getReviewedRegionCount(product);
  const planChoiceSummary = getPlanChoiceSummary(locale, product);

  if (locale === "zh") {
    return [
      {
        q: `${product.name} 哪个套餐和地区最便宜？`,
        a: lowest
          ? `按当前已核验的月付套餐比较，${lowest.country}的 ${lowest.planName} 最低，折合约 ${lowest.price}。GeoSub 共比较 ${planCount} 个已发布套餐和 ${regionCount} 个地区；价格、税费和可购买性仍以结账页为准。`
          : `GeoSub 当前比较 ${planCount} 个已发布套餐和 ${regionCount} 个地区。最低价格会在取得可核验的月付价格后显示。`,
      },
      {
        q: `${product.name} 不同套餐应该怎么选？`,
        a: planChoiceSummary ||
          `${product.name} 的套餐通常按功能、使用额度、画质或设备数量区分。先按自己的使用强度选择套餐，再进入对应套餐页比较地区价格。`,
      },
      {
        q: `${product.name} 为什么不同国家价格不一样？`,
        a: `不同国家和地区的 ${product.name} 价格会受到平台定价、当地税费、汇率和区域策略影响。美元折算价便于横向比较，但最终扣款金额以当地 App Store 结账页为准。`,
      },
      {
        q: `可以直接切换到最便宜地区订阅 ${product.name} 吗？`,
        a: `不一定。跨地区订阅可能受到 Apple ID 地区、付款方式、账单地址、税务和服务条款限制。GeoSub 只提供公开价格比较，不建议为了低价规避平台规则。`,
      },
    ];
  }

  return [
    {
      q: `Which ${product.name} plan and country are cheapest?`,
      a: lowest
        ? `Among the currently reviewed monthly plans, ${lowest.planName} is lowest in ${lowest.country} at about ${lowest.price}. GeoSub compares ${planCount} published plans across ${regionCount} regions; checkout price, tax and availability remain authoritative.`
        : `GeoSub currently compares ${planCount} published plans across ${regionCount} regions. The lowest price will appear when a reviewed monthly price is available.`,
    },
    {
      q: `Which ${product.name} plan should I choose?`,
      a: planChoiceSummary ||
        `${product.name} plans usually differ by features, usage capacity, video quality or device limits. Choose for your actual usage first, then compare regional prices on the relevant plan page.`,
    },
    {
      q: `Why does ${product.name} cost different amounts by country?`,
      a: `${product.name} prices can vary because of platform pricing, local taxes, exchange rates and regional strategy. USD conversions support comparison, while the local App Store checkout remains the final price.`,
    },
    {
      q: `Can I switch regions to buy ${product.name} at the lowest price?`,
      a: `Not necessarily. Cross-region subscriptions may be restricted by Apple ID region, payment method, billing address, tax and service terms. GeoSub compares public prices and does not recommend bypassing platform rules.`,
    },
  ];
}
