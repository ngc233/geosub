import Link from "next/link";
import {
  formatUsd,
  getDefaultPlan,
  getPlanSpread,
  type DbPricingProduct,
} from "../lib/db-pricing-types";

type DbPricingCardProps = {
  product: DbPricingProduct;
  locale: "zh" | "en";
};

function billingText(locale: "zh" | "en", billingCycle: string) {
  if (billingCycle === "MONTHLY") return locale === "en" ? "Monthly" : "月付";
  if (billingCycle === "YEARLY") return locale === "en" ? "Yearly" : "年付";
  if (billingCycle === "WEEKLY") return locale === "en" ? "Weekly" : "周付";
  return locale === "en" ? "Subscription" : "订阅";
}

function priceSuffix(locale: "zh" | "en", billingCycle: string) {
  if (billingCycle === "MONTHLY") return locale === "en" ? "/mo" : "/月";
  if (billingCycle === "YEARLY") return locale === "en" ? "/yr" : "/年";
  if (billingCycle === "WEEKLY") return locale === "en" ? "/wk" : "/周";
  return "";
}

export default function DbPricingCard({
  product,
  locale,
}: DbPricingCardProps) {
  const defaultPlan = getDefaultPlan(product);

  if (!defaultPlan) {
    return null;
  }

  const displayRegions = defaultPlan.regions.slice(0, 5);
  const spread = getPlanSpread(defaultPlan);
  const otherPlans = product.plans.filter((plan) => plan.slug !== defaultPlan.slug);

  const copy =
    locale === "en"
      ? {
          titleSuffix: "Regional Pricing",
          region: "Region",
          price: "Price",
          tax: "Tax",
          base: "Base",
          updated: "Updated",
          spread: "price spread",
          morePlans: "Also includes",
          regions: "regions",
          detail: "View details",
        }
      : {
          titleSuffix: "各地区定价",
          region: "地区",
          price: "价格",
          tax: "税费",
          base: "基准",
          updated: "更新时间",
          spread: "价差",
          morePlans: "另有",
          regions: "个地区",
          detail: "查看详情",
        };

  const detailHref = `/${locale}/ai-pricing/${product.slug}/`;

  return (
    <article className="group relative z-0 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-lime-300 hover:shadow-[0_18px_50px_rgba(15,23,42,0.12)] dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="p-6 md:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lime-100 text-lg font-black text-lime-700 ring-1 ring-lime-200 dark:bg-lime-500/10 dark:text-lime-300 dark:ring-lime-500/20">
            {product.name.slice(0, 1).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                    {product.name} {copy.titleSuffix}
                  </h2>

                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-black text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                    {defaultPlan.name}
                  </span>

                  <span className="rounded-full bg-lime-100 px-2.5 py-1 text-[11px] font-black text-lime-700 dark:bg-lime-500/10 dark:text-lime-300">
                    {billingText(locale, defaultPlan.billingCycle)}
                  </span>
                </div>

                <p className="mt-2 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {product.description}
                </p>

                {otherPlans.length > 0 ? (
                  <p className="mt-2 text-xs text-zinc-400">
                    {copy.morePlans} {otherPlans.map((plan) => plan.name).join(" / ")}
                  </p>
                ) : null}
              </div>

              <div className="hidden shrink-0 flex-col items-end gap-3 sm:flex">
                <span className="text-xs font-black text-rose-500">
                  ↕ {spread}% {copy.spread}
                </span>

                <span className="text-xs font-bold text-zinc-500">
                  {defaultPlan.regions.length} {copy.regions}
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
                        {region.countryName}
                      </span>

                      {region.isReference ? (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-black text-zinc-400 dark:bg-zinc-800">
                          {copy.base}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  <td className="py-4">
                    <div
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black tracking-wide ${
                        region.isExpensive
                          ? "bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                          : region.isReference
                            ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            : "bg-lime-100 text-lime-700 dark:bg-lime-500/10 dark:text-lime-400"
                      }`}
                    >
                      {formatUsd(region.priceUsd)}
                      {priceSuffix(locale, defaultPlan.billingCycle)}
                    </div>

                    <div className="mt-1.5 font-mono text-[11px] text-zinc-400">
                      ≈ {region.localPrice}
                    </div>
                  </td>

                  <td className="hidden py-4 pr-6 text-xs text-zinc-500 dark:text-zinc-400 md:table-cell">
                    {region.taxNote}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between bg-zinc-50/60 px-6 py-5 dark:bg-zinc-950/40">
        <span className="text-xs text-zinc-400">
          {copy.updated}: {product.updatedAt}
        </span>

        <div className="flex items-center gap-4">
          <span className="text-xs font-black text-rose-500 sm:hidden">
            ↕ {spread}% {copy.spread}
          </span>

          <Link
            href={detailHref}
            className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-black text-white transition hover:bg-lime-600"
          >
            {copy.detail} →
          </Link>
        </div>
      </div>
    </article>
  );
}