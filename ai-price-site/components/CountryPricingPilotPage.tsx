import { getCountryPricingPlans } from "../lib/pricing-page-facts";
import PurchaseEligibilityNote from "./PurchaseEligibilityNote";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, ShieldCheck } from "lucide-react";
import BrandIcon from "./BrandIcon";
import StaticCountryFlag from "./StaticCountryFlag";
import TrackedLink from "./analytics/TrackedLink";
import {
  getCountryPagePilot,
  getCountryPageCopy,
  getCountryPagePilotLanguageAlternates,
  getCountryPagePilotPath,
  isCountryPagePilotIndexApproved,
  type CountryPagePilotLocale,
} from "../lib/country-page-pilot";
import { getLatestUsdExchangeRates } from "../lib/exchange-rates";
import { getPricingDetailProduct } from "../lib/pricing-detail-adapter";
import type {
  ProductCategory,
  ProductPlan,
  RegionPrice,
} from "../lib/public-pricing-model";

export type CountryPricingPilotPageProps = {
  params: Promise<{ slug: string; country: string }>;
};

type CountryPricingPilotPageOptions = CountryPricingPilotPageProps & {
  locale: CountryPagePilotLocale;
  category: ProductCategory;
};

function getCategoryPath(category: ProductCategory) {
  return category === "streaming" ? "streaming-pricing" : "ai-pricing";
}

function getCopy(locale: CountryPagePilotLocale) {
  return locale === "zh"
    ? {
        back: "返回产品价格",
        eyebrow: "地区订阅价格",
        currentPrices: "当前套餐价格",
        currentPricesHelp: "仅列出该地区已核验的 App Store 月付项目。美元金额用于比较，不代表实际扣款币种。",
        plan: "套餐",
        localPrice: "本币价格",
        usdReference: "美元参考",
        checked: "价格采集",
        trust: "可信状态",
        verified: "已核验",
        source: "价格来源",
        fx: "汇率基准",
        fxUnavailable: "当前没有可安全展示的汇率快照",
        fxStale: "汇率快照已超过 18 小时，等待下一轮同步",
        tax: "税务说明",
        taxConfidence: "税务可信度",
        history: "本币价格记录",
        historicalPriceChange: "历史调价",
        historicalChange: (plan: string, before: string, after: string) =>
          `${plan} 月付曾由 ${before} 调至 ${after}`,
        historicalSource: "查看历史核验来源",
        noVerifiedChange: "当前未发现达到公开门槛的本币调价；汇率变化不会被记作调价。",
        confirmedOn: "来源复核",
        sourceEvidence: "查看 App Store 证据",
        globalRank: "全球价格位次",
        versusUs: "对比美国",
        nearby: "相邻价位",
        noUsReference: "暂无同套餐美国参考价",
        viewPlan: "查看全球套餐比较",
        decision: "怎么选",
        localContext: "当地价格怎么理解",
        beforeSubscribe: "订阅前确认",
        dataNote: "数据说明",
        dataNoteBody: "GeoSub 分开记录本币标价、汇率日期和价格采集日期。汇率变化不会被写成产品调价，最终价格以 App Store 结算页为准。",
        official: "访问官方网站",
      }
    : {
        back: "Back to product pricing",
        eyebrow: "Regional subscription pricing",
        currentPrices: "Current plan prices",
        currentPricesHelp: "Only reviewed monthly App Store items for this region are listed. USD values are references, not the checkout currency.",
        plan: "Plan",
        localPrice: "Local price",
        usdReference: "USD reference",
        checked: "Collected",
        trust: "Trust",
        verified: "Reviewed",
        source: "Price source",
        fx: "Exchange-rate basis",
        fxUnavailable: "No exchange-rate snapshot is currently safe to display",
        fxStale: "This rate snapshot is over 18 hours old and awaits the next sync",
        tax: "Tax note",
        taxConfidence: "Tax confidence",
        history: "Local-price record",
        historicalPriceChange: "Historical price change",
        historicalChange: (plan: string, before: string, after: string) =>
          `${plan} monthly price changed from ${before} to ${after}`,
        historicalSource: "View historical source",
        noVerifiedChange: "No local-price change currently meets the publication gate. Exchange-rate movement is not treated as a price change.",
        confirmedOn: "Source checked",
        sourceEvidence: "Open App Store evidence",
        globalRank: "Global price position",
        versusUs: "Versus the US",
        nearby: "Nearby price points",
        noUsReference: "No matching US reference price",
        viewPlan: "View global plan comparison",
        decision: "How to choose",
        localContext: "How to read the local price",
        beforeSubscribe: "Before subscribing",
        dataNote: "Data note",
        dataNoteBody: "GeoSub records local list price, exchange-rate date and collection date separately. Exchange-rate movement is not described as a product price change, and the App Store checkout remains authoritative.",
        official: "Visit official website",
      };
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function getNearbyRegions(plan: ProductPlan, countryCode: string) {
  const index = plan.regions.findIndex(
    (region) => region.code.toUpperCase() === countryCode,
  );
  if (index < 0) return [];

  return [plan.regions[index - 1], plan.regions[index + 1]].filter(
    (region): region is RegionPrice => Boolean(region),
  );
}

function formatRate(value: number, locale: CountryPagePilotLocale) {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    maximumFractionDigits: value >= 100 ? 2 : 4,
  }).format(value);
}

function getTaxConfidenceLabel(
  value: RegionPrice["taxConfidence"],
  locale: CountryPagePilotLocale,
) {
  const labels = locale === "zh"
    ? { high: "高", medium: "中", low: "低", unknown: "待复核" }
    : { high: "High", medium: "Medium", low: "Low", unknown: "Review needed" };
  return labels[value || "unknown"];
}

export async function getCountryPricingPilotMetadata({
  params,
  locale,
  category,
}: CountryPricingPilotPageOptions): Promise<Metadata> {
  const { slug, country } = await params;
  const pilot = getCountryPagePilot(slug, country, category);
  if (!pilot) return {};

  const product = await getPricingDetailProduct(slug, locale);
  if (!product || product.category !== category) return {};
  const plans = getCountryPricingPlans(product.plans, pilot.countryCode);
  if (!plans.length) return {};
  const pageCopy = getCountryPageCopy(pilot, locale, plans);

  const path = getCountryPagePilotPath(pilot, locale);
  const indexApproved = isCountryPagePilotIndexApproved(pilot);
  const languages = getCountryPagePilotLanguageAlternates(pilot);
  return {
    title: pilot.title[locale],
    description: pageCopy.description,
    alternates: {
      canonical: path,
      ...(languages ? { languages } : {}),
    },
    robots: { index: indexApproved, follow: true },
  };
}

export default async function CountryPricingPilotPage({
  params,
  locale,
  category,
}: CountryPricingPilotPageOptions) {
  const { slug, country } = await params;
  const pilot = getCountryPagePilot(slug, country, category);
  if (!pilot) notFound();

  const product = await getPricingDetailProduct(slug, locale);
  if (!product || product.category !== category) notFound();

  const plans = getCountryPricingPlans(product.plans, pilot.countryCode);
  if (plans.length === 0) notFound();

  const copy = getCopy(locale);
  const pageCopy = getCountryPageCopy(pilot, locale, plans);
  const categoryPath = getCategoryPath(category);
  const productPath = `/${locale}/${categoryPath}/${product.slug}`;
  const latestCheckedAt = plans
    .map((plan) => plan.region?.lastCheckedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  const currencyCodes = [
    ...new Set(
      plans
        .map((plan) => plan.region?.currencyCode)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const exchangeRates = await getLatestUsdExchangeRates(currencyCodes);
  const primaryRegion = plans[0].region!;
  const currencyCode = primaryRegion.currencyCode;
  const exchangeRate = currencyCode ? exchangeRates[currencyCode] : undefined;
  const sourceLabel = [
    ...new Set(
      plans
        .map((plan) => plan.region?.sourceName)
        .filter((value): value is string => Boolean(value)),
    ),
  ].join(" + ") || "App Store";
  const sourceUrl = primaryRegion.sourceUrl || pilot.priceEvent?.sourceUrl;
  const historicalEvent = pilot.historicalPriceEvent;
  const eventPlanName = pilot.priceEvent
    ? plans.find((plan) => plan.slug === pilot.priceEvent?.planSlug)?.name
    : undefined;

  // Only Chinese presentation opts in; legacy English classes and attributes stay unchanged.
  const chineseCanvas = locale === "zh";
  const cn = (legacy: string, chinese: string | undefined) => chineseCanvas ? chinese : legacy;
  const renderLocalPrice = (value: string) => {
    const slash = value.lastIndexOf("/");
    return slash > 0
      ? <><span>{value.slice(0, slash)}</span><span data-gs-cycle="">{value.slice(slash)}</span></>
      : value;
  };

  return (
    <div className={cn("mx-auto max-w-6xl px-5 py-8 sm:py-12", "gs-public-unified gs-product-country gs-product-country-content")}>
      <Link
        data-gs-ui={chineseCanvas ? "button" : undefined}
        href={productPath}
        className={cn("mb-7 inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white", "gs-product-country-back")}
      >
        <ArrowLeft className={cn("h-4 w-4", undefined)} aria-hidden="true" />
        {copy.back}
      </Link>

      <header className={cn("border-b border-zinc-200 pb-8 dark:border-zinc-800", "gs-product-country-header")}>
        <div className={cn("flex items-start gap-4", "gs-product-country-identity")}>
          <BrandIcon
            product={{
              slug: product.slug,
              name: product.name,
              logoUrl: product.logoUrl,
              officialUrl: product.officialUrl,
            }}
            size="lg"
            className={chineseCanvas ? "gs-product-country-brand" : undefined}
            decorative={chineseCanvas || undefined}
            priority
            fetchPriority={chineseCanvas ? "low" : undefined}
          />
          <div className={cn("min-w-0", "gs-product-country-names")}>
            <div className={cn("text-sm font-bold text-lime-700 dark:text-lime-400", "gs-product-country-eyebrow")}>
              {chineseCanvas ? <StaticCountryFlag code={pilot.countryCode} /> : null}
              {copy.eyebrow} · {pilot.countryName[locale]}
            </div>
            <h1 className={cn("mt-2 text-3xl font-black text-zinc-950 sm:text-4xl dark:text-white", undefined)}>
              {pilot.title[locale]}
            </h1>
            <p className={cn("mt-4 max-w-3xl text-base leading-8 text-zinc-600 dark:text-zinc-300", "gs-product-country-lead")}>
              {pageCopy.description}
            </p>
            <PurchaseEligibilityNote locale={locale} productSlug={product.slug} plans={plans} />
          </div>
        </div>
      </header>

      <section data-gs-ui={chineseCanvas ? "card" : undefined} className={cn("grid border-b border-zinc-200 sm:grid-cols-2 xl:grid-cols-4 dark:border-zinc-800", "gs-product-country-summary")}>
        <div className={cn("py-6 sm:pr-6 xl:border-r xl:border-zinc-200 dark:xl:border-zinc-800", "gs-product-country-summary-item")}>
          <div className={cn("text-xs font-bold text-zinc-500 dark:text-zinc-400", "gs-product-country-summary-label")}>{copy.source}</div>
          <div className={cn("mt-2 font-black text-zinc-950 dark:text-white", "gs-product-country-summary-value")}>{sourceLabel}</div>
          {latestCheckedAt ? (
            <div className={cn("mt-1 text-xs text-zinc-500 dark:text-zinc-400", "gs-product-country-meta")}>
              {copy.checked} {latestCheckedAt}
            </div>
          ) : null}
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("mt-2 inline-flex items-center gap-1 text-xs font-bold text-zinc-950 hover:text-lime-700 dark:text-white dark:hover:text-lime-400", "gs-product-country-meta")}
            >
              {copy.sourceEvidence}
              <ExternalLink className={cn("h-3.5 w-3.5", undefined)} aria-hidden="true" />
            </a>
          ) : null}
        </div>
        <div className={cn("border-t border-zinc-200 py-6 sm:border-l sm:border-t-0 sm:px-6 xl:border-l-0 xl:border-r dark:border-zinc-800 dark:xl:border-zinc-800", "gs-product-country-summary-item")}>
          <div className={cn("text-xs font-bold text-zinc-500 dark:text-zinc-400", "gs-product-country-summary-label")}>{copy.fx}</div>
          {exchangeRate &&
          !exchangeRate.isFallback &&
          !exchangeRate.isExpired &&
          exchangeRate.rate > 0 &&
          currencyCode ? (
            <>
              <div className={cn("mt-2 font-black text-zinc-950 dark:text-white", "gs-product-country-summary-value")}>
                1 USD = {formatRate(exchangeRate.rate, locale)} {currencyCode}
              </div>
              <div className={cn("mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400", "gs-product-country-meta")}>
                {exchangeRate.rateDate || primaryRegion.fxRateDate || "-"}
                {exchangeRate.isStale ? ` · ${copy.fxStale}` : ""}
              </div>
            </>
          ) : (
            <div className={cn("mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300", "gs-product-country-summary-value")}>
              {copy.fxUnavailable}
            </div>
          )}
        </div>
        <div className={cn("border-t border-zinc-200 py-6 sm:pr-6 xl:border-r xl:border-t-0 xl:px-6 dark:border-zinc-800", "gs-product-country-summary-item")}>
          <div className={cn("text-xs font-bold text-zinc-500 dark:text-zinc-400", "gs-product-country-summary-label")}>{copy.tax}</div>
          <div className={cn("mt-2 font-black text-zinc-950 dark:text-white", "gs-product-country-summary-value")}>{primaryRegion.tax}</div>
          <div className={cn("mt-1 text-xs text-zinc-500 dark:text-zinc-400", "gs-product-country-meta")}>
            {copy.taxConfidence} · {getTaxConfidenceLabel(primaryRegion.taxConfidence, locale)}
          </div>
        </div>
        <div className={cn("border-t border-zinc-200 py-6 sm:border-l sm:pl-6 xl:border-l-0 xl:pl-6 dark:border-zinc-800", "gs-product-country-summary-item")}>
          <div className={cn("text-xs font-bold text-zinc-500 dark:text-zinc-400", "gs-product-country-summary-label")}>
            {historicalEvent ? copy.historicalPriceChange : copy.history}
          </div>
          {historicalEvent ? (
            <div className={cn("mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-200", "gs-product-country-summary-value")}>
              <div className="font-bold text-zinc-950 dark:text-white">
                {copy.historicalChange(historicalEvent.planName, historicalEvent.previousLocalPrice, historicalEvent.priceAfterChange)}
              </div>
              <div className={cn("mt-1 text-xs text-zinc-500 dark:text-zinc-400", "gs-product-country-meta")}>
                {copy.confirmedOn} <time dateTime={historicalEvent.confirmedAt}>{historicalEvent.confirmedAt}</time>
              </div>
              <a
                href={historicalEvent.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn("inline-flex min-h-11 items-center gap-1 text-xs font-bold text-zinc-950 hover:text-lime-700 dark:text-zinc-100 dark:hover:text-lime-400", "gs-product-country-meta inline-flex min-h-11 items-center gap-1")}
              >
                {copy.historicalSource}
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </a>
            </div>
          ) : pilot.priceEvent ? (
            <div className={cn("mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-200", "gs-product-country-summary-value")}>
              <div className={cn("font-bold text-zinc-950 dark:text-white", undefined)}>
                {eventPlanName || pilot.priceEvent.planSlug}: {chineseCanvas ? (
                  <>
                    <span className="gs-product-country-event-price">{pilot.priceEvent.previousLocalPrice}</span>{" "}
                    <span className="gs-product-country-event-next">
                      <ArrowRight aria-hidden="true" />
                      {pilot.priceEvent.currentLocalPrice}
                    </span>
                  </>
                ) : (
                  <>
                    {pilot.priceEvent.previousLocalPrice}
                    <ArrowRight className="mx-1 inline h-4 w-4" aria-hidden="true" />
                    {pilot.priceEvent.currentLocalPrice}
                  </>
                )}
              </div>
              <div className={cn("mt-1 text-xs text-zinc-500 dark:text-zinc-400", "gs-product-country-meta")}>
                {copy.confirmedOn} {pilot.priceEvent.confirmedAt}
              </div>
            </div>
          ) : (
            <div className={cn("mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300", "gs-product-country-summary-value")}>
              {copy.noVerifiedChange}
            </div>
          )}
        </div>
      </section>

      <section className={cn("border-b border-zinc-200 py-8 dark:border-zinc-800", "gs-product-country-prices")}>
        <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between", "gs-product-country-section-head")}>
          <div className={chineseCanvas ? "gs-product-country-section-copy" : undefined}>
            <h2 className={cn("text-2xl font-black text-zinc-950 dark:text-white", undefined)}>
              {copy.currentPrices}
            </h2>
            <p className={cn("mt-2 max-w-3xl text-sm leading-6 text-zinc-500 dark:text-zinc-400", undefined)}>
              {copy.currentPricesHelp}
            </p>
            {pageCopy.currentPriceNote ? (
              <p className={cn("mt-2 max-w-3xl text-sm leading-6 text-zinc-500 dark:text-zinc-400", undefined)}>
                {pageCopy.currentPriceNote}
              </p>
            ) : null}
          </div>
          {latestCheckedAt ? (
            <div className={cn("text-sm font-medium text-zinc-500 dark:text-zinc-400", "gs-product-country-updated")}>
              {copy.checked} {latestCheckedAt}
            </div>
          ) : null}
        </div>

        <div className={cn("mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800", "gs-product-country-table-panel")}>
          <table className={cn("w-full min-w-[860px] border-collapse text-left", "gs-product-country-table")}>
            <thead className={cn("bg-zinc-50 text-xs font-bold text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400", undefined)}>
              <tr>
                <th className={cn("px-5 py-3", undefined)}>{copy.plan}</th>
                <th className={cn("px-5 py-3", undefined)}>{copy.localPrice}</th>
                <th className={cn("px-5 py-3", undefined)}>{copy.usdReference}</th>
                <th className={cn("px-5 py-3", undefined)}>{copy.trust}</th>
                <th className={cn("px-5 py-3", undefined)} aria-label={copy.viewPlan} />
              </tr>
            </thead>
            <tbody className={cn("divide-y divide-zinc-200 dark:divide-zinc-800", undefined)}>
              {plans.map((plan) => {
                const region = plan.region!;
                const planPath = `${productPath}/${plan.slug}`;
                const usRegion = plan.regions.find(
                  (candidate) => candidate.code.toUpperCase() === "US",
                );
                const usDifference = usRegion && usRegion.priceUsd > 0
                  ? Math.round(((region.priceUsd - usRegion.priceUsd) / usRegion.priceUsd) * 100)
                  : null;
                const nearbyRegions = getNearbyRegions(plan, pilot.countryCode);
                return (
                  <tr key={plan.slug} data-gs-motion-row={chineseCanvas ? "" : undefined} className={cn("bg-white dark:bg-zinc-950", undefined)}>
                    <td data-gs-motion-row={chineseCanvas ? "" : undefined} className={cn("px-5 py-4 font-bold text-zinc-950 dark:text-white", "gs-product-country-plan")}>
                      {plan.name}
                    </td>
                    <td data-gs-motion-row={chineseCanvas ? "" : undefined} className={cn("px-5 py-4 font-semibold text-zinc-950 dark:text-white", "gs-product-country-local")}>
                      <div
                        className={chineseCanvas ? "gs-product-country-number" : undefined}
                        data-gs-number={chineseCanvas ? "" : undefined}
                        data-gs-price-cycle={chineseCanvas && region.localPrice.includes("/") ? "true" : undefined}
                      >{chineseCanvas ? renderLocalPrice(region.localPrice) : region.localPrice}</div>
                      <div className={cn("mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400", "gs-product-country-meta")}>
                        {copy.globalRank} {region.rank}/{plan.regions.length}
                      </div>
                    </td>
                    <td data-gs-motion-row={chineseCanvas ? "" : undefined} className={cn("px-5 py-4 text-zinc-600 dark:text-zinc-300", "gs-product-country-usd")}>
                      <div className={chineseCanvas ? "gs-product-country-number" : undefined} data-gs-number={chineseCanvas ? "" : undefined}>{formatUsd(region.priceUsd)}</div>
                      <div className={cn("mt-1 text-xs text-zinc-500 dark:text-zinc-400", "gs-product-country-meta")}>
                        {usDifference === null
                          ? copy.noUsReference
                          : `${copy.versusUs} ${usDifference > 0 ? "+" : ""}${usDifference}%`}
                      </div>
                      {nearbyRegions.length > 0 ? (
                        <div className={cn("mt-1 max-w-60 text-xs leading-5 text-zinc-500 dark:text-zinc-400", "gs-product-country-meta")}>
                          {copy.nearby} · {nearbyRegions
                            .map((candidate) => `${candidate.country} ${formatUsd(candidate.priceUsd)}`)
                            .join(" · ")}
                        </div>
                      ) : null}
                    </td>
                    <td data-gs-motion-row={chineseCanvas ? "" : undefined} className={cn("px-5 py-4", "gs-product-country-trust")}>
                      <span data-gs-ui={chineseCanvas ? "tag" : undefined} className={cn("inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400", "gs-product-country-status")}>
                        <ShieldCheck className={cn("h-4 w-4", undefined)} aria-hidden="true" />
                        {copy.verified}
                      </span>
                    </td>
                    <td data-gs-motion-row={chineseCanvas ? "" : undefined} className={cn("px-5 py-4 text-right", "gs-product-country-action")}>
                      <TrackedLink
                        data-gs-ui={chineseCanvas ? "button" : undefined}
                        href={planPath}
                        eventKey="click_related_plan"
                        eventName="Open plan from country page"
                        buttonKey={plan.slug}
                        placement="country_page_price_table"
                        source="country_page"
                        className={cn("inline-flex items-center gap-1.5 text-sm font-bold text-zinc-950 hover:text-lime-700 dark:text-white dark:hover:text-lime-400", "gs-product-country-plan-link")}
                      >
                        {copy.viewPlan}
                        <ArrowRight className={cn("h-4 w-4", undefined)} aria-hidden="true" />
                      </TrackedLink>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={cn("grid gap-0 border-b border-zinc-200 py-2 md:grid-cols-3 dark:border-zinc-800", "gs-product-country-decisions")}>
        {[
          [copy.decision, pageCopy.decisionSummary],
          [copy.localContext, pilot.localContext[locale]],
          [copy.beforeSubscribe, pilot.availabilityCaution[locale]],
        ].map(([title, body], index) => (
          <div
            key={title}
            data-gs-ui={chineseCanvas ? "card" : undefined}
            className={cn(`py-7 md:px-7 ${index > 0 ? "border-t border-zinc-200 md:border-l md:border-t-0 dark:border-zinc-800" : ""}`, "gs-product-country-decision")}
          >
            <h2 className={cn("text-lg font-black text-zinc-950 dark:text-white", undefined)}>{title}</h2>
            <p className={cn("mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300", undefined)}>{body}</p>
          </div>
        ))}
      </section>

      <section data-gs-ui={chineseCanvas ? "card" : undefined} className={cn("flex flex-col gap-5 py-8 sm:flex-row sm:items-center sm:justify-between", "gs-product-country-note")}>
        <div>
          <h2 className={cn("text-lg font-black text-zinc-950 dark:text-white", undefined)}>{copy.dataNote}</h2>
          <p className={cn("mt-2 max-w-3xl text-sm leading-7 text-zinc-500 dark:text-zinc-400", undefined)}>
            {copy.dataNoteBody}
          </p>
        </div>
        {product.officialUrl ? (
          <TrackedLink
            data-gs-ui={chineseCanvas ? "button" : undefined}
            data-gs-variant={chineseCanvas ? "primary" : undefined}
            href={product.officialUrl}
            eventKey="click_official"
            eventName="Open official website from country page"
            buttonKey={pilot.countryCode.toLowerCase()}
            placement="country_page_footer"
            source="country_page"
            className={cn("inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-5 text-sm font-bold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200", "gs-product-country-official")}
            target="_blank"
            rel="noopener noreferrer"
          >
            {copy.official}
            <ExternalLink className={cn("h-4 w-4", undefined)} aria-hidden="true" />
          </TrackedLink>
        ) : null}
      </section>
    </div>
  );
}
