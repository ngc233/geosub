import Link from "next/link";
import { ArrowRight } from "lucide-react";
import BrandIcon from "./BrandIcon";
import {
  formatUsd,
  getDefaultPlan,
  getPlanSpread,
  type DbPricingProduct,
} from "../lib/db-pricing-types";
import {
  getPricingListCopy,
  type PricingListCopy,
} from "../lib/pricing-list-copy";
import { getPricingPlanPath } from "../lib/pricing-routes";
import {
  normalizeSiteLocale,
  type PreparedSiteLocale,
} from "../lib/site-locale";

type DbPricingCardProps = {
  product: DbPricingProduct;
  locale: PreparedSiteLocale;
};

type CardCopy = PricingListCopy["card"];

function priceSuffix(copy: CardCopy, billingCycle: string) {
  if (billingCycle === "MONTHLY") return copy.monthlySuffix;
  if (billingCycle === "YEARLY") return copy.yearlySuffix;
  if (billingCycle === "WEEKLY") return copy.weeklySuffix;
  return "";
}

function roundedPriceCents(value: number) {
  return Math.round(value * 100);
}

function comparisonPercent(price: number, referencePrice: number) {
  if (!Number.isFinite(referencePrice) || referencePrice <= 0) return null;
  return Math.round(((price - referencePrice) / referencePrice) * 100);
}

export default function DbPricingCard({ product, locale }: DbPricingCardProps) {
  const defaultPlan = getDefaultPlan(product);

  if (!defaultPlan) {
    return null;
  }

  const uniqueRegions = defaultPlan.regions.filter(
    (region, index, regions) =>
      regions.findIndex(
        (candidate) => candidate.code.toUpperCase() === region.code.toUpperCase(),
      ) === index,
  );
  const cheapRegions = uniqueRegions.slice(0, 3);
  const referenceRegion =
    uniqueRegions.find((region) => region.isReference) ||
    uniqueRegions.find((region) => region.code.toUpperCase() === "US");
  const comparisonReference = referenceRegion || uniqueRegions[0];
  const maxRegion = uniqueRegions[uniqueRegions.length - 1];
  const displayRegions = [...cheapRegions, referenceRegion, maxRegion].filter(
    (region, index, regions): region is NonNullable<typeof region> =>
      Boolean(region) &&
      regions.findIndex(
        (candidate) => candidate?.code === region?.code,
      ) === index,
  );
  const spread = getPlanSpread(defaultPlan);
  const regionCount = defaultPlan.totalRegions ?? uniqueRegions.length;
  const minimumDisplayPrice = uniqueRegions[0]
    ? roundedPriceCents(uniqueRegions[0].priceUsd)
    : null;

  const copy = getPricingListCopy(locale).card;

  const detailHref = getPricingPlanPath(
    normalizeSiteLocale(locale),
    product.category,
    product.slug,
    defaultPlan.slug,
  );

  return (
    <Link
      href={detailHref}
      data-track-event="click_digital_service_card"
      data-track-name="Open digital service pricing"
      data-track-button={product.slug}
      data-track-placement="pricing_card"
      className="group relative z-0 block overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.01] hover:border-zinc-200 hover:shadow-[0_16px_36px_rgba(15,23,42,0.10)] focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-500/10 dark:border-zinc-800 dark:bg-zinc-900/50"
    >
      <div className="p-5 md:p-6">
        <div className="flex items-start gap-4">
          <BrandIcon
            product={{
              slug: product.slug,
              name: product.name,
              logoUrl: product.logoUrl,
            }}
            size="md"
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                    {product.name} {copy.titleSuffix}
                  </h2>

                  <span className="rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                    {defaultPlan.name}
                  </span>
                </div>

                <p className="mt-2 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {product.description}
                </p>
              </div>

              <div className="hidden shrink-0 flex-col items-end gap-3 sm:flex">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {copy.spread} {spread}%
                </span>

                <span className="text-xs font-medium text-zinc-500">
                  {regionCount} {copy.regions}
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
              <th className="w-14 py-3 pl-5 md:pl-6">#</th>
              <th className="min-w-[120px] py-3">{copy.region}</th>
              <th className="min-w-[150px] py-3">{copy.price}</th>
              <th className="hidden min-w-[110px] py-3 pr-6 md:table-cell">
                {referenceRegion ? copy.comparison : copy.spread}
              </th>
            </tr>
          </thead>

          <tbody>
            {displayRegions.map((region, index) => {
              const isCompareRow =
                maxRegion?.code === region.code && region.rank === maxRegion.rank;
              const isLowestRow =
                minimumDisplayPrice !== null &&
                roundedPriceCents(region.priceUsd) === minimumDisplayPrice;
              const isSeparatedRow = index >= cheapRegions.length;
              const difference = comparisonReference
                ? comparisonPercent(region.priceUsd, comparisonReference.priceUsd)
                : null;

              return (
                <tr
                  key={`${product.slug}-${defaultPlan.slug}-${region.code}-${region.rank}`}
                  className={`border-b border-zinc-100 transition-colors group-hover:bg-white dark:border-zinc-800/50 dark:group-hover:bg-zinc-900/40 ${
                    isSeparatedRow
                      ? "border-t border-dashed border-t-zinc-300 bg-zinc-50/40 dark:border-t-zinc-700 dark:bg-zinc-950/30"
                      : ""
                  }`}
                >
                  <td className="py-3.5 pl-5 font-mono text-xs text-zinc-400 md:pl-6">
                    {region.rank}
                  </td>

                  <td className="py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        {region.code}
                      </span>

                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {region.countryName}
                      </span>

                      {region.isReference ? (
                        <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400 dark:bg-zinc-800">
                          {copy.base}
                        </span>
                      ) : null}

                      {isLowestRow ? (
                        <span className="rounded-md bg-lime-50 px-1.5 py-0.5 text-[10px] font-bold text-lime-700 ring-1 ring-lime-200">
                          {copy.lowest}
                        </span>
                      ) : null}

                      {isCompareRow ? (
                        <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-500 ring-1 ring-rose-100">
                          {copy.highest}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  <td className="py-3.5">
                    <div
                      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold tracking-wide ${
                        isLowestRow
                          ? "bg-lime-100 text-lime-800 ring-1 ring-inset ring-lime-200 dark:bg-lime-500/10 dark:text-lime-400 dark:ring-lime-500/20"
                          : isCompareRow
                            ? "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20"
                            : region.isReference
                              ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
                              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {formatUsd(region.priceUsd)}
                      {priceSuffix(copy, defaultPlan.billingCycle)}
                    </div>

                    <div className="mt-1.5 font-mono text-[11px] text-zinc-400">
                      ≈ {region.localPrice}
                    </div>
                  </td>

                  <td className="hidden py-4 pr-6 text-xs font-semibold md:table-cell">
                    {difference === null || difference === 0 ? (
                      <span className={isLowestRow ? "text-lime-700" : "text-zinc-500"}>
                        {referenceRegion ? copy.base : copy.lowest}
                      </span>
                    ) : difference < 0 ? (
                      <span className={isLowestRow ? "text-lime-700" : "text-emerald-700"}>
                        −{Math.abs(difference)}%
                      </span>
                    ) : (
                      <span className="text-rose-600">+{difference}%</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950/40 md:px-6">
        <span className="text-xs text-zinc-400">
          {copy.updated}: {product.updatedAt}
        </span>

        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold text-zinc-700 sm:hidden">
            {copy.spread} {spread}%
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 transition group-hover:border-zinc-300 group-hover:text-zinc-950">
            {copy.detail}
            <ArrowRight size={14} strokeWidth={2} />
          </span>
        </div>
      </div>
    </Link>
  );
}
