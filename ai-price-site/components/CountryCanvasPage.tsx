import Link from "next/link";
import { notFound } from "next/navigation";
import { loadVerifiedPriceSource } from "../lib/cached-verified-price-source";
import { getComparablePriceRows, getCountryHubRows, getPriorityCountry } from "../lib/country-hubs";
import { getPublicCountryHref, resolvePublicCountryByCode, resolvePublicCountryBySlug } from "../lib/country-route-catalog";
import { countryCanvasRows, countrySummary } from "../lib/country-canvas";
import { homepageCountries, homepageDisplayRates } from "../lib/homepage-summary";
import { savingsPercent } from "../lib/homepage-display";
import { getCoreGuideDefinition } from "../lib/core-guide-content";
import { fictionalHomepageSource, isHomepageFixtureEnabled } from "../lib/test-fixtures/homepage";
import type { CanvasLocale } from "../lib/canvas-ui-copy";
import PublicIcon from "./PublicIcon";
import PublicPriceNumber from "./PublicPriceNumber";
import CountryIdentity from "./CountryIdentity";
import { PublicComparisonBar } from "./PublicControls";
import CountryCanvasPricing from "./CountryCanvasPricing";
import CountryDataDisclosure from "./CountryDataDisclosure";

export default async function CountryCanvasPage({
  countrySlug,
  locale = "zh",
}: {
  countrySlug: string;
  locale?: CanvasLocale;
}) {
  const english = locale === "en";
  const country = getPriorityCountry(countrySlug) ?? resolvePublicCountryBySlug(countrySlug);
  if (!country) notFound();
  const countryLabel = english ? country.en : country.zh;
  let source;
  try {
    source = isHomepageFixtureEnabled() ? fictionalHomepageSource() : await loadVerifiedPriceSource();
  } catch (error) {
    console.error({ event: "country_canvas_read_failed", errorType: error instanceof Error ? "Error" : typeof error });
  }
  const now = new Date();
  const rows = source ? getCountryHubRows(source.prices, country.code, source.rates, now) : [];
  const summary = countrySummary(rows, country.code, locale);
  const peers = source
    ? homepageCountries(getComparablePriceRows(source.prices, source.rates, now), locale)
        .filter((row) => Boolean(resolvePublicCountryByCode(row.code)))
        .slice(0, 6)
    : [];

  const title = summary
    ? english
      ? `Subscriptions in ${countryLabel}: median is ${savingsPercent(summary.median)}% ${summary.median >= 0 ? "cheaper" : "higher"} than the US`
      : `在${countryLabel}订阅，一半比美国${summary.median >= 0 ? "便宜" : "贵"} ${savingsPercent(summary.median)}% 以上`
    : english
      ? `${countryLabel} Subscription Prices`
      : `${countryLabel}订阅价格`;

  const guide = getCoreGuideDefinition(locale, "payment-account");

  const method = (
    <aside className="gs-country-method">
      <p>
        {english
          ? "Includes published, verified App Store prices collected within the last 14 days. Sample counts describe this catalogue rather than national inflation. Each comparable plan carries equal weight; median savings are computed from exact USD equivalents (retaining negative values) when at least 5 comparable plans exist."
          : "仅纳入最近 14 天内采集的已发布核验价格。样本数量只描述本站收录，不代表该国全部订阅或整体物价。每个可比套餐权重相同，使用原始美元值计算节省率并取中位数，负值保留。少于 5 个可比套餐时不显示中位数结论。"}
      </p>
      <nav aria-label={english ? "Explore pricing" : "价格探索"}>
        <Link href={`/${locale}/countries`}>{english ? "Browse countries" : "按国家找订阅"}</Link>
        <Link href={`/${locale}/price-history`}>{english ? "Price history" : "价格变化记录"}</Link>
        <Link href={`/${locale}/data-sources`}>{english ? "Data sources" : "数据来源"}</Link>
      </nav>
    </aside>
  );

  const support = (
    <div className="gs-country-support">
      <section className="gs-country-panel gs-country-notes">
        <h2>
          {english ? `Before subscribing in ${countryLabel}` : `在${countryLabel}区订阅要注意`}
        </h2>
        <ol>
          {english ? (
            <>
              <li>A local store listing does not guarantee cross-region purchase eligibility.</li>
              <li>Account region, payment method, service availability, and final taxes are governed by official checkout.</li>
              <li>Conversions use FX snapshots within 18 hours without double-counting taxes; missing FX or US baselines produce no diff.</li>
            </>
          ) : (
            <>
              <li>当地商店列出价格不代表其他地区账号可购买。</li>
              <li>账号、付款方式、服务覆盖与最终税费请以官方结算页为准。</li>
              <li>折算使用 18 小时内有效汇率；税费不重复加算。缺少汇率或美国同套餐价格时不生成价差。</li>
            </>
          )}
        </ol>
        <Link href={`/${locale}/guides/payment-account`}>
          {guide.title}
          <PublicIcon name="ArrowRight" size={16} />
        </Link>
      </section>

      {peers.length > 1 && (
        <section className="gs-country-panel gs-country-peers">
          <div>
            <h2>{english ? "Compare with Other Regions" : "和其他地区比"}</h2>
            <small>{english ? "Median subscription savings vs US" : "各国订阅节省率的中位数"}</small>
          </div>
          {peers.map((peer) => {
            const target = resolvePublicCountryByCode(peer.code)!;
            const peerHref = getPublicCountryHref(peer.code, locale) ?? `/${locale}/countries`;
            return (
              <Link
                key={peer.code}
                href={peerHref}
                aria-current={peer.code === country.code ? "page" : undefined}
                data-gs-motion-card
              >
                <span className="gs-country-flag">
                  <CountryIdentity code={peer.code} defer />
                </span>
                <strong>{english ? target.en : target.zh}</strong>
                <PublicComparisonBar
                  label={english ? "Median savings" : "节省率中位数"}
                  value={Math.abs(peer.median)}
                  maximum={1}
                  tone={peer.median >= 0 ? "low" : "high"}
                  hideValue
                />
                <span data-tone={peer.median >= 0 ? "low" : "high"}>
                  {peer.median >= 0 ? "−" : "+"}
                  {savingsPercent(peer.median)}%
                </span>
                <small>
                  {english ? `Based on ${peer.count} plans` : `按 ${peer.count} 个订阅计算`}
                </small>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );

  return (
    <div className="gs-public-unified gs-country-scope">
      <div className="gs-country-page">
        <nav className="gs-country-breadcrumb" aria-label={english ? "Breadcrumb" : "面包屑"}>
          <Link href={`/${locale}/countries`}>
            {english ? "All countries & regions" : "全部国家与地区"}
          </Link>
          <span aria-hidden="true">/</span>
          <span>{countryLabel}</span>
        </nav>
        <header className="gs-country-intro">
          <div className="gs-country-lead">
            <div className="gs-country-title">
              <span className="gs-country-flag">
                <CountryIdentity code={country.code} fetchPriority="low" />
              </span>
              <h1>{title}</h1>
            </div>
            <p>
              {english ? (
                <>
                  Verified monthly App Store prices in {countryLabel}, compared plan-by-plan against the US
                  {summary && (
                    <>
                      {" "}
                      across <strong>{summary.count} subscriptions</strong>
                    </>
                  )}
                  . Exchange-rate movements affect converted totals.
                </>
              ) : (
                <>
                  按 App Store {countryLabel}区的已核验月付价格，与美国同套餐逐个比较，
                  {summary && (
                    <>
                      按 <strong>{summary.count} 个订阅</strong>计算。
                    </>
                  )}
                  汇率变化会影响折算价。
                </>
              )}
            </p>
          </div>
          {summary && (
            <div
              className="gs-country-metrics"
              aria-label={english ? "Subscription price metrics" : "订阅价格统计"}
            >
              <div data-highlight={summary.median >= 0}>
                <strong>
                  <PublicPriceNumber
                    value={savingsPercent(summary.median)}
                    fractionDigits={0}
                    locale={english ? "en-US" : "zh-CN"}
                    prefix={summary.median >= 0 ? "−" : "+"}
                    suffix="%"
                    countIn
                  />
                </strong>
                <span>
                  {english
                    ? `Median plan is ${summary.median >= 0 ? "lower" : "higher"}`
                    : `一半订阅至少${summary.median >= 0 ? "低" : "高"}这么多`}
                </span>
              </div>
              <div>
                <strong>
                  <PublicPriceNumber
                    value={summary.cheaper}
                    fractionDigits={0}
                    locale={english ? "en-US" : "zh-CN"}
                    countIn
                  />
                  <small>/{summary.count}</small>
                </strong>
                <span>{english ? "plans cheaper than US" : "个订阅比美国便宜"}</span>
              </div>
              <div>
                <strong data-tone={summary.best >= 0 ? "low" : "high"}>
                  <PublicPriceNumber
                    value={savingsPercent(summary.best)}
                    fractionDigits={0}
                    locale={english ? "en-US" : "zh-CN"}
                    suffix="%"
                    countIn
                  />
                </strong>
                <span>
                  {english
                    ? summary.best >= 0
                      ? "max savings"
                      : "smallest markup"
                    : summary.best >= 0
                      ? "最多能省"
                      : "最小涨幅"}
                </span>
              </div>
            </div>
          )}
        </header>
        {!source ? (
          <section className="gs-country-panel" role="status">
            <h2>{english ? "Pricing data temporarily unavailable" : "价格数据暂时无法读取"}</h2>
            <p>
              {english
                ? "Please retry shortly; unverified figures are withheld."
                : "请稍后重试；当前不显示未经核实的价格结论。"}
            </p>
          </section>
        ) : !rows.length ? (
          <section className="gs-country-panel" role="status">
            <h2>{english ? "No eligible plans currently" : "暂无符合条件的套餐"}</h2>
            <p>
              {english
                ? "Missing, stale, pending, or insufficiently sourced prices are excluded. Please check back later."
                : "缺失、过期、待审或来源证据不足的价格不参与本页。请稍后回来查看。"}
            </p>
          </section>
        ) : (
          <CountryCanvasPricing
            locale={locale}
            name={countryLabel}
            rows={countryCanvasRows(rows, now, locale)}
            rates={homepageDisplayRates(source.rates, now)}
            method={method}
            support={support}
          />
        )}
        {!rows.length && (
          <>
            {support}
            <CountryDataDisclosure locale={locale}>{method}</CountryDataDisclosure>
          </>
        )}
      </div>
    </div>
  );
}
