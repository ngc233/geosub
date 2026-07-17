import Link from "next/link";
import { ArrowRight } from "lucide-react";
import BrandIcon from "./BrandIcon";
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

function priceSuffix(locale: "zh" | "en", billingCycle: string) {
  if (billingCycle === "MONTHLY") return locale === "en" ? "/mo" : "/月";
  if (billingCycle === "YEARLY") return locale === "en" ? "/yr" : "/年";
  if (billingCycle === "WEEKLY") return locale === "en" ? "/wk" : "/周";
  return "";
}

function taxConfidenceLabel(locale: "zh" | "en", confidence?: string, sourceKind?: string) {
  if (locale === "en") {
    if (sourceKind === "inferred") return "Platform inferred";
    if (confidence === "high") return "Verified";
    if (confidence === "medium") return "Medium";
    if (confidence === "low") return "Needs review";
    return "Unverified";
  }

  if (sourceKind === "inferred") return "平台推断";
  if (confidence === "high") return "高可信";
  if (confidence === "medium") return "中可信";
  if (confidence === "low") return "待复核";
  return "待核验";
}

function taxConfidenceClass(confidence?: string, sourceKind?: string) {
  if (confidence === "high") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (sourceKind === "inferred") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (confidence === "medium" || confidence === "low") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-zinc-100 text-zinc-500 ring-zinc-200";
}

function formatTaxNote(locale: "zh" | "en", note?: string, confidence?: string, reviewStatus?: string) {
  const raw = (note || "").trim();

  if (!raw && (reviewStatus === "needs_review" || confidence === "low")) {
    return locale === "en" ? "Needs review" : "待复核";
  }

  if (locale === "en") {
    return raw || "Checkout applies";
  }

  const includeMatch = raw.match(/^(?:Includes|Usually includes)\s+(.+)$/i);
  if (includeMatch) {
    const value = includeMatch[1]
      .replace(/consumption tax/i, "消费税")
      .replace(/service tax/i, "服务税")
      .replace(/sales tax/i, "销售税")
      .replace(/by region/i, "因地区不同");
    return /^Usually includes/i.test(raw) ? `通常含 ${value}` : `含 ${value}`;
  }

  if (/GST\/HST varies by province/i.test(raw)) return "各省 5-15% GST/HST 不同";
  if (/State ICMS varies/i.test(raw)) return "州税（ICMS）不同";
  if (/Sales tax varies by state/i.test(raw)) return "各州销售税不同";
  if (/Sales tax varies by region/i.test(raw)) return "销售税因地区不同";
  if (/VAT treatment needs review/i.test(raw)) return "VAT 规则需复核";

  return raw || "结算页为准";
}

export default function DbPricingCard({ product, locale }: DbPricingCardProps) {
  const defaultPlan = getDefaultPlan(product);

  if (!defaultPlan) {
    return null;
  }

  const cheapRegions = defaultPlan.regions.slice(0, 4);
  const maxRegion = defaultPlan.regions[defaultPlan.regions.length - 1];
  const displayRegions =
    maxRegion && !cheapRegions.some((region) => region.code === maxRegion.code)
      ? [...cheapRegions, maxRegion]
      : cheapRegions;
  const spread = getPlanSpread(defaultPlan);

  const copy =
    locale === "en"
      ? {
          titleSuffix: "Regional Pricing",
          region: "Region",
          price: "Price",
          tax: "Tax note",
          base: "Base",
          updated: "Updated",
          spread: "price spread",
          regions: "regions",
          detail: "View details",
          highest: "Highest",
          lowest: "Lowest",
        }
      : {
          titleSuffix: "各地区定价",
          region: "地区",
          price: "价格",
          tax: "税费说明",
          base: "基准",
          updated: "更新时间",
          spread: "价差",
          regions: "个地区",
          detail: "查看详情",
          highest: "最高价",
          lowest: "最低价",
        };

  const detailBase =
    product.category === "streaming" ? "streaming-pricing" : "ai-pricing";
  const detailHref = `/${locale}/${detailBase}/${product.slug}/`;

  return (
    <Link
      href={detailHref}
      data-track-event="click_digital_service_card"
      data-track-name="Open digital service pricing"
      data-track-button={product.slug}
      data-track-placement="pricing_card"
      className="group relative z-0 block overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-lime-300 hover:shadow-[0_14px_36px_rgba(15,23,42,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 focus-visible:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-900/50"
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

                  <span className="rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                    {defaultPlan.name}
                  </span>
                </div>

                <p className="mt-2 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {product.description}
                </p>
              </div>

              <div className="hidden shrink-0 flex-col items-end gap-3 sm:flex">
                <span className="text-xs font-black text-rose-500">
                  ↑ {spread}% {copy.spread}
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
            {displayRegions.map((region) => {
              const isCompareRow =
                maxRegion?.code === region.code && region.rank === maxRegion.rank;
              const isLowestRow = region.rank === 1;

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

                  <td className="py-4">
                    <div
                      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold tracking-wide ${
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
                    <div className="max-w-[170px]">
                      <div className="truncate" title={region.taxFrontendNote || region.taxNote}>
                        {formatTaxNote(
                          locale,
                          region.taxNote,
                          region.taxConfidence,
                          region.taxReviewStatus,
                        )}
                      </div>
                      <span
                        className={[
                          "mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                          taxConfidenceClass(region.taxConfidence, region.taxSourceKind),
                        ].join(" ")}
                      >
                        {taxConfidenceLabel(locale, region.taxConfidence, region.taxSourceKind)}
                      </span>
                    </div>
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
            ↑ {spread}% {copy.spread}
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 transition group-hover:border-lime-300 group-hover:text-lime-700">
            {copy.detail}
            <ArrowRight size={14} strokeWidth={2} />
          </span>
        </div>
      </div>
    </Link>
  );
}
