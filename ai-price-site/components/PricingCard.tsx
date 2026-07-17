import Link from "next/link";
import BrandIcon from "./BrandIcon";
import {
  formatUsd,
  getPlanStats,
  getProductPlan,
  type SubscriptionProduct,
} from "../lib/ai-pricing-model";

type PricingCardProps = {
  product: SubscriptionProduct;
  locale?: "zh" | "en";
};

function billingSuffix(locale: "zh" | "en", billing: string) {
  if (billing === "monthly") return locale === "en" ? "/mo" : "/月";
  if (billing === "yearly") return locale === "en" ? "/yr" : "/年";
  if (billing === "weekly") return locale === "en" ? "/wk" : "/周";
  return "";
}

export default function PricingCard({ product, locale = "zh" }: PricingCardProps) {
  const defaultPlan = getProductPlan(product);

  if (!defaultPlan || defaultPlan.regions.length === 0) {
    return null;
  }

  const stats = getPlanStats(defaultPlan);
  const displayRegions = defaultPlan.regions.slice(0, 5);
  const otherPlans = product.plans.filter((plan) => plan.slug !== defaultPlan.slug);
  const productHref = `/${locale}/ai-pricing/${product.slug}/`;

  const copy =
    locale === "en"
      ? {
          titleSuffix: "Regional Pricing",
          otherPlansPrefix: "Also includes",
          otherPlansSuffix: "plans",
          spread: "price spread",
          viewMore: "View more",
          region: "Region",
          price: "Price",
          tax: "Tax",
          reference: "Base",
          updatedAt: "Updated",
        }
      : {
          titleSuffix: "各地区定价",
          otherPlansPrefix: "另有",
          otherPlansSuffix: "套餐",
          spread: "价差",
          viewMore: "查看更多",
          region: "地区",
          price: "价格",
          tax: "税费",
          reference: "基准",
          updatedAt: "更新时间",
        };

  return (
    <Link
      href={productHref}
      data-track-event="click_digital_service_card"
      data-track-name="Open digital service pricing"
      data-track-button={product.slug}
      data-track-placement="pricing_card"
      className="group relative z-0 block overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 ease-out will-change-transform hover:z-10 hover:-translate-y-1 hover:scale-[1.015] hover:border-lime-300 hover:shadow-[0_18px_50px_rgba(15,23,42,0.12)] dark:border-zinc-800 dark:bg-zinc-900/50"
    >
      <div className="p-6 md:p-7">
        <div className="flex items-start gap-4">
          <BrandIcon product={product} size="md" />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                    {product.name} {copy.titleSuffix}
                  </h2>

                  <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-[11px] font-black text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                    {defaultPlan.name}
                  </span>
                </div>

                <p className="mt-2 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {product.description}
                </p>

                {otherPlans.length > 0 ? (
                  <p className="mt-2 text-xs text-zinc-400">
                    {copy.otherPlansPrefix}{" "}
                    {otherPlans.map((plan) => plan.name).join(" / ")}{" "}
                    {copy.otherPlansSuffix}
                  </p>
                ) : null}
              </div>

              <div className="hidden shrink-0 flex-col items-end gap-3 sm:flex">
                <span className="text-xs font-black text-rose-500">
                  ↕ {stats.spreadPercent}% {copy.spread}
                </span>

                <span className="text-xs font-bold text-zinc-500 transition-colors group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-white">
                  {copy.viewMore} →
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-y border-zinc-100 text-xs font-medium text-zinc-400 dark:border-zinc-800">
              <th className="w-14 py-3 pl-6">#</th>
              <th className="min-w-[120px] py-3">{copy.region}</th>
              <th className="min-w-[150px] py-3">{copy.price}</th>
              <th className="hidden min-w-[120px] py-3 pr-6 md:table-cell">
                {copy.tax}
              </th>
            </tr>
          </thead>

          <tbody>
            {displayRegions.map((region, index) => {
              const isCompareRow =
                index === 4 || region.isExpensive || region.isReference;

              return (
                <tr
                  key={`${product.slug}-${defaultPlan.slug}-${region.code}-${region.rank}`}
                  className={`border-b border-zinc-100 transition-colors group-hover:bg-white dark:border-zinc-800/50 dark:group-hover:bg-zinc-900/40 ${
                    isCompareRow
                      ? "border-t border-dashed border-t-zinc-300 bg-zinc-50/40 dark:border-t-zinc-700 dark:bg-zinc-950/30"
                      : ""
                  }`}
                >
                  <td className="py-4 pl-6 font-mono text-xs text-zinc-400">
                    {region.rank}
                  </td>

                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        {region.code}
                      </span>

                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {region.country}
                      </span>

                      {region.isReference ? (
                        <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-black text-zinc-400 dark:bg-zinc-800">
                          {copy.reference}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  <td className="py-4">
                    <div
                      className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-black tracking-wide ${
                        region.isExpensive
                          ? "bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                          : region.isReference
                            ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            : "bg-lime-100 text-lime-700 dark:bg-lime-500/10 dark:text-lime-400"
                      }`}
                    >
                      {formatUsd(region.priceUsd)}
                      {billingSuffix(locale, defaultPlan.billing)}
                    </div>

                    <div className="mt-1.5 font-mono text-[11px] text-zinc-400">
                      ≈ {region.localPrice}
                    </div>
                  </td>

                  <td className="hidden py-4 pr-6 text-xs text-zinc-500 dark:text-zinc-400 md:table-cell">
                    {region.tax}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between bg-zinc-50/60 px-6 py-5 dark:bg-zinc-950/40">
        <span className="text-xs text-zinc-400">
          {copy.updatedAt}: {product.updatedAt}
        </span>

        <span className="text-xs font-black text-rose-500 sm:hidden">
          ↕ {stats.spreadPercent}% {copy.spread}
        </span>
      </div>
    </Link>
  );
}
