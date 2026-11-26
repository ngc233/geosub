import { getProductOverviewDecisionPlans, getPricingProductOverviewCopy, getProductOverviewRegionCount, getProductOverviewPriceFact } from "./pricing-product-overview-copy.ts";
import { getPlanTabLabel } from "./pricing-labels.ts";
import { getCanvasPlanDisplayName } from "./homepage-display.ts";
import { getProductEditorialContent } from "./product-editorial-content.ts";
import { getPricingPlanPath } from "./pricing-routes.ts";
import { productSaving } from "./product-canvas-order.ts";
import type { SubscriptionProduct } from "./public-pricing-model.ts";
import type { CanvasLocale } from "./canvas-ui-copy.ts";

/** D5 is a projection of the existing overview scope, not a second price reader.
 * Each column retains its own billing/platform scope. A missing US price never
 * falls back to the minimum; a missing matrix cell is never treated as zero. */
export function productCanvasModel(product: SubscriptionProduct, locale: CanvasLocale = "zh") {
  const plans = getProductOverviewDecisionPlans(product).map(plan => {
    const editorial = getProductEditorialContent(locale, product.slug, plan.slug);
    const prices = plan.regions.map(region => ({ code: region.code, country: region.country, usd: region.priceUsd }));
    const lowest = prices.reduce((a, b) => (a.usd - b.usd || a.code.localeCompare(b.code)) <= 0 ? a : b);
    const usPrice = prices.find(price => price.code === "US")?.usd;
    const platform = plan.regions[0]?.billingPlatform;
    const displayName = getCanvasPlanDisplayName(product.name, plan.name, locale);
    return { slug: plan.slug, name: getPlanTabLabel(product.name, displayName),
      href: getPricingPlanPath(locale, product.category, product.slug, plan.slug), cycle: plan.billing,
      channel: platform === "web" ? "Web" : ["android", "google_play"].includes(platform || "") ? "Google Play" : "App Store",
      bestFor: editorial?.plan.bestFor, difference: editorial?.plan.difference,
      prices, lowest, usPrice, saving: productSaving(lowest.usd, usPrice) };
  });
  const countries = new Map<string, string>();
  for (const plan of plans) for (const price of plan.prices) countries.set(price.code, price.country);
  const rows = [...countries].map(([code, country]) => ({ code, country,
    cells: plans.map(plan => { const price = plan.prices.find(price => price.code === code); return price ? { usd: price.usd } : null; }) }));
  const intro = plans.length > 1 ? getPricingProductOverviewCopy({ locale, productName: product.name,
    planCount: plans.length, regionCount: getProductOverviewRegionCount(product), lowest: getProductOverviewPriceFact(product) }).intro : undefined;
  const summary = plans.length > 1 ? plans.map(plan => getProductEditorialContent(locale, product.slug, plan.slug)).find(Boolean)?.summary : undefined;
  // Send each quote once (in the matrix), not a duplicate copy in every column.
  const columns = plans.map(({ prices, ...column }) => ({ ...column, coverage: prices.length }));
  return { plans: columns, rows, intro, summary, defaultPlan: Math.max(0, plans.findIndex(plan => plan.slug === product.defaultPlan)) };
}
export type ProductCanvasModel = ReturnType<typeof productCanvasModel>;
