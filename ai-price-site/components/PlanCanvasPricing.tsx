"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ProductPlan, RegionPrice } from "../lib/public-pricing-model";
import { getPlanStats } from "../lib/public-pricing-model";
import { planDistribution, planSaving, filterPlanRegions, type planWorkHours } from "../lib/plan-canvas";
import { formatPublicPrice } from "../lib/public-price-format";
import { formatPublicDate } from "../lib/public-date";
import {
  canvasDefaultCurrency,
  canvasIntlLocale,
  canvasSavingsText,
  canvasUiCopy,
  type CanvasLocale,
} from "../lib/canvas-ui-copy";
import PublicCurrencySelect, { usePageDisplayRates, usePublicCurrency } from "./PublicCurrencySelect";
import { PublicDisclosure, PublicExpandButton, PublicSegments } from "./PublicControls";
import PublicPriceNumber from "./PublicPriceNumber";
import PublicIcon from "./PublicIcon";
import HomepageCountryFlag from "./HomepageCountryFlag";
import SharePriceModal, { type SharePriceProduct } from "./SharePriceModal";

function Country({ row, defer = false }: { row: Pick<RegionPrice, "code" | "country">; defer?: boolean }) {
  return (
    <span className="gs-plan-country">
      <HomepageCountryFlag code={row.code} defer={defer} />
      {row.country}
    </span>
  );
}

function Saving({
  usd,
  usPrice,
  locale,
}: {
  usd: number;
  usPrice?: number;
  locale: CanvasLocale;
}) {
  const saving = planSaving(usd, usPrice);
  const copy = canvasUiCopy[locale];
  if (saving === null) return <span>{copy.plan.noUsRef}</span>;
  const formatted = canvasSavingsText(saving, locale, false);
  if (!formatted || formatted.tone === "baseline") {
    return <span data-tone="low">{copy.plan.sameAsUs}</span>;
  }
  return <span data-tone={formatted.tone}>{formatted.text}</span>;
}

function compactTaxLabel(tax: string | undefined, locale: CanvasLocale) {
  const normalized = tax?.trim();
  const copy = canvasUiCopy[locale];
  if (
    !normalized ||
    normalized === "以结算页为准" ||
    normalized === "App Store 标价，税费以结算页为准" ||
    /^subject to checkout\.?$/i.test(normalized) ||
    /^app store list price[,;·—-]?\s*tax(?:es)? (?:at|depend on|subject to) checkout\.?$/i.test(normalized)
  ) {
    return copy.plan.taxAtCheckout;
  }
  if (locale === "zh") {
    return normalized.replace(/^App Store 标价，/u, "");
  }
  const stripped = normalized
    .replace(/^App Store list price[,;·—-]\s*/i, "")
    .replace(/\.$/, "");
  if (/^sales tax varies by state$/i.test(stripped)) return "Varies by state";
  if (/^taxes? depend on checkout$/i.test(stripped)) return copy.plan.taxAtCheckout;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

function PlanPriceDistribution({
  rows,
  min,
  max,
  us,
  currency,
  rate,
  locale,
  onSelect,
}: {
  rows: RegionPrice[];
  min: number;
  max: number;
  us?: RegionPrice;
  currency: Parameters<typeof formatPublicPrice>[1];
  rate: number;
  locale: CanvasLocale;
  onSelect: (code: string) => void;
}) {
  const copy = canvasUiCopy[locale];
  const intlLocale = canvasIntlLocale(locale);
  const span = max - min;
  const offset = (usd: number) => (span > 0 ? ((usd - min) / span) * 100 : 50);
  const amount = (row: RegionPrice) => formatPublicPrice(row.priceUsd * rate, currency, intlLocale);
  return (
    <div
      className="gs-plan-distribution-chart"
      role="img"
      aria-label={copy.plan.distChartAria(Boolean(us))}
    >
      <div className="gs-plan-distribution-track" aria-hidden="true" />
      {rows.map((row) => (
        <span
          key={row.code}
          className="gs-plan-dot"
          aria-hidden="true"
          data-tone={
            row.code === "US"
              ? "baseline"
              : us && row.priceUsd > us.priceUsd
                ? "high"
                : "low"
          }
          style={{ left: `${offset(row.priceUsd)}%` }}
          title={`${row.country} · ${amount(row)}`}
          onClick={() => onSelect(row.code)}
        />
      ))}
      {us && (
        <span className="gs-plan-us-marker" aria-hidden="true" style={{ left: `${offset(us.priceUsd)}%` }}>
          <span>{copy.plan.usName}</span>
        </span>
      )}
    </div>
  );
}

export type PlanKeycapOption = {
  slug: string;
  label: string;
  href: string | null;
  minUsd: number | null;
  hasDiscount: boolean;
  disabledHint?: string;
};

export function PlanKeycapSwitcher({
  overviewHref,
  productSlug,
  activeSlug,
  options,
  rates,
  locale = "zh",
}: {
  overviewHref: string;
  productSlug: string;
  activeSlug: string;
  options: PlanKeycapOption[];
  rates: Record<string, number>;
  locale?: CanvasLocale;
}) {
  const copy = canvasUiCopy[locale];
  const intlLocale = canvasIntlLocale(locale);
  const defaultCurrency = canvasDefaultCurrency(locale, rates);
  const [preferred] = usePublicCurrency(defaultCurrency);
  const currency = rates[preferred] > 0 ? preferred : "USD";
  const rate = rates[currency] ?? 1;

  return (
    <nav className="gs-plan-keycaps" aria-label={copy.plan.keycapAria}>
      <Link href={overviewHref} className="gs-plan-keycap gs-plan-keycap-overview">
        <PublicIcon name="ArrowLeft" size={16} />
        <span>{copy.plan.keycapOverview}</span>
      </Link>
      <span className="gs-plan-keycap-divider" aria-hidden="true" />
      {options.map((option) => {
        const active = option.slug === activeSlug;
        const formattedPrice =
          option.minUsd !== null ? formatPublicPrice(option.minUsd * rate, currency, intlLocale) : null;
        if (!option.href) {
          return (
            <span key={option.slug} className="gs-plan-keycap gs-plan-keycap-disabled" aria-disabled="true">
              <span>{option.label}</span>
              {option.disabledHint ? <small className="gs-plan-keycap-price">{option.disabledHint}</small> : null}
            </span>
          );
        }
        return (
          <Link
            key={option.slug}
            href={option.href}
            aria-current={active ? "page" : undefined}
            className="gs-plan-keycap"
            data-cheaper={option.hasDiscount ? "true" : undefined}
            data-track-event="select_plan"
            data-track-name="Select subscription plan"
            data-track-button={`${productSlug}:${option.slug}`}
            data-track-placement="plan_tabs"
            data-track-source="keycap_bar"
          >
            <span>{option.label}</span>
            {formattedPrice ? <small className="gs-plan-keycap-price">{formattedPrice}</small> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function PlanWorkRows({
  rows,
  rates,
  usPrice,
  lowestCode,
  locale = "zh",
}: {
  rows: ReturnType<typeof planWorkHours>["rows"];
  rates: Record<string, number>;
  usPrice?: number;
  lowestCode?: string;
  locale?: CanvasLocale;
}) {
  const copy = canvasUiCopy[locale];
  const intlLocale = canvasIntlLocale(locale);
  const defaultCurrency = canvasDefaultCurrency(locale, rates);
  const [preferred] = usePublicCurrency(defaultCurrency);
  const currency = rates[preferred] > 0 ? preferred : "USD";
  const rate = rates[currency] ?? 1;
  const maxHours = Math.max(...rows.map((row) => row.hours), 1);

  return (
    <div className="gs-plan-work-rows">
      <div className="gs-plan-work-heading">
        {copy.plan.workCols.map((col) => (
          <span key={col}>{col}</span>
        ))}
      </div>
      {rows.map((row) => (
        <div
          key={row.code}
          className="gs-plan-work-row"
          data-country={row.code}
          data-lowest={row.code === lowestCode}
        >
          <span>
            <Country row={row} />
          </span>
          <span
            className="gs-plan-work-price"
            data-tone={
              row.code === "US"
                ? "baseline"
                : usPrice !== undefined
                  ? row.usd > usPrice
                    ? "high"
                    : "low"
                  : "baseline"
            }
          >
            {formatPublicPrice(row.usd * rate, currency, intlLocale)}
          </span>
          <span className="gs-plan-work-bar" aria-hidden="true">
            <span style={{ width: `${(row.hours / maxHours) * 100}%` }} />
          </span>
          <strong>
            {row.hours.toFixed(1)} {copy.plan.hoursUnit}
          </strong>
          <small>
            {row.metric === "GNI_ATLAS" ? copy.plan.gniLabel : copy.plan.gdpLabel} · {row.year}
          </small>
        </div>
      ))}
      <small>{copy.plan.workOrderNote}</small>
    </div>
  );
}

export default function PlanCanvasPricing({
  plan,
  product,
  rates,
  rateDates,
  afterCards,
  locale = "zh",
}: {
  plan: ProductPlan;
  product: SharePriceProduct;
  rates: Record<string, number>;
  rateDates: Record<string, string | null>;
  afterCards?: ReactNode;
  locale?: CanvasLocale;
}) {
  usePageDisplayRates(rates);
  const copy = canvasUiCopy[locale];
  const intlLocale = canvasIntlLocale(locale);
  const defaultCurrency = canvasDefaultCurrency(locale, rates);
  const [preferred] = usePublicCurrency(defaultCurrency);
  const currency = rates[preferred] > 0 ? preferred : "USD";
  const rate = rates[currency] ?? 1;
  const priceFont = /[a-z]/i.test(formatPublicPrice(0, currency, intlLocale)) ? "latin" : "numerals";
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState(false);

  const distribution = planDistribution(plan);
  const { lowest, highest, us, rows } = distribution;
  const rankByCode = new Map(rows.map((row, idx) => [row.code, idx + 1]));
  const filtered = filterPlanRegions(rows, filter, query, us?.priceUsd);
  const sorted = sortOrder === "asc" ? filtered : [...filtered].reverse();
  const shown = expanded ? sorted : sorted.slice(0, 9);

  const focusCountry = (code: string) => {
    setFilter("all");
    setQuery("");
    setExpanded(true);
    requestAnimationFrame(() => {
      const target = list.current
        ?.querySelector<HTMLElement>(`[data-country="${code}"]`)
        ?.closest<HTMLElement>("[data-gs-disclosure]");
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target?.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth", block: "center" });
      target?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    });
  };

  const list = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const applyHash = () => {
      const match = window.location.hash.match(/^#region-([A-Za-z]{2})$/);
      if (match) focusCountry(match[1].toUpperCase());
    };
    const frame = requestAnimationFrame(applyHash);
    window.addEventListener("hashchange", applyHash);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", applyHash);
    };
  }, []);

  useEffect(() => {
    const inner = list.current;
    const outer = viewport.current;
    if (!inner || !outer) return;
    const observer = new ResizeObserver(() =>
      outer.style.setProperty("--gs-plan-list-height", `${inner.getBoundingClientRect().height}px`),
    );
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  const dateText = (value?: string) =>
    formatPublicDate(value, new Date(), locale)?.text ?? copy.common.notProvided;
  const price = (usd: number, cycle?: string, size: "row" | "hero" = "row", countIn?: boolean) => (
    <PublicPriceNumber
      value={usd * rate}
      currency={currency}
      locale={intlLocale}
      cycle={cycle}
      size={size}
      changeKey={currency}
      countIn={countIn}
    />
  );

  if (!lowest || !highest) {
    return (
      <section className="gs-plan-panel">
        <h2>{copy.plan.emptyTitle}</h2>
        <p>{copy.plan.emptyDesc}</p>
      </section>
    );
  }
  const max = highest.priceUsd || 1;

  return (
    <>
      <div className="gs-plan-summary" data-price-font={priceFont}>
        <section className="gs-plan-panel gs-plan-lowest" aria-label={copy.plan.lowestAria}>
          <div className="gs-plan-card-top">
            <strong>
              {copy.plan.lowestKicker}
              <Country row={lowest} defer={false} />
            </strong>
            <div className="gs-plan-tools">
              <PublicCurrencySelect displayCurrency={currency} locale={locale} />
              {us && (
                <SharePriceModal
                  unifiedTrigger
                  product={product}
                  plan={plan}
                  stats={getPlanStats(plan)}
                  locale={locale}
                />
              )}
            </div>
          </div>
          <div className="gs-plan-hero-price">{price(lowest.priceUsd, plan.billing, "hero")}</div>
          <div className="gs-plan-local">
            <span className="gs-plan-saving">
              <Saving usd={lowest.priceUsd} usPrice={us?.priceUsd} locale={locale} />
            </span>
            <span>
              {copy.plan.localPricePrefix}
              {lowest.localPrice} · {compactTaxLabel(lowest.tax, locale)}
            </span>
          </div>
          <div className="gs-plan-lowest-facts">
            <div>
              <span>{copy.plan.usSamePlan}</span>
              <strong>{us ? price(us.priceUsd, plan.billing) : copy.plan.noBaseline}</strong>
            </div>
            <div>
              <span>
                {us && lowest.priceUsd < us.priceUsd
                  ? plan.billing === "monthly"
                    ? copy.plan.annualSaved
                    : copy.plan.periodSaved
                  : copy.plan.maxMultiple}
              </span>
              <strong data-tone={us && lowest.priceUsd < us.priceUsd ? "low" : undefined}>
                {us && lowest.priceUsd < us.priceUsd
                  ? price((us.priceUsd - lowest.priceUsd) * (plan.billing === "monthly" ? 12 : 1), undefined, "row", true)
                  : distribution.multiple !== null
                    ? `${distribution.multiple.toFixed(1)}x`
                    : "—"}
              </strong>
            </div>
          </div>
          <div className="gs-plan-lowest-footer">
            <div className="gs-plan-lowest-meta">
              <span>
                {plan.freshness?.trustStatus === "verified"
                  ? copy.plan.trustVerified
                  : plan.freshness?.trustStatus === "reviewed"
                    ? copy.plan.trustReviewed
                    : copy.plan.trustPending}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {copy.plan.collectedLabel} {dateText(plan.freshness?.priceCollectedAt)}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {currency === "USD"
                  ? copy.plan.usdOriginal
                  : `${copy.plan.fxLabel} ${dateText(rateDates[currency] ?? undefined)}`}
              </span>
              {afterCards}
            </div>
          </div>
          {currency !== preferred && (
            <p role="status">{copy.common.fxFallbackStatus(preferred)}</p>
          )}
        </section>

        {distribution.visible && (
          <section className="gs-plan-panel gs-plan-distribution" aria-label={copy.plan.distAria}>
            <div className="gs-plan-card-top">
              <h2>{copy.plan.distTitle}</h2>
              <span>{copy.plan.distCount(rows.length)}</span>
            </div>
            <PlanPriceDistribution
              rows={rows}
              min={lowest.priceUsd}
              max={max}
              us={us}
              currency={currency}
              rate={rate}
              locale={locale}
              onSelect={focusCountry}
            />
            <div className="gs-plan-extremes">
              <span>
                {copy.plan.lowestPrefix}
                {lowest.country}
              </span>
              <span>
                {copy.plan.highestPrefix}
                {highest.country}
              </span>
            </div>
            <div className="gs-plan-statistics">
              <div>
                <span>
                  <strong>{copy.plan.usBaselineTitle}</strong>
                  <small>{us ? compactTaxLabel(us.tax, locale) : copy.plan.missingBaseline}</small>
                </span>
                {us ? price(us.priceUsd) : <span>{copy.plan.noneShort}</span>}
              </div>
              <div>
                <span>
                  <strong>{copy.plan.medianTitle}</strong>
                  <small>{copy.plan.medianSub}</small>
                </span>
                {price(distribution.median!)}
              </div>
              <div>
                <span>
                  <strong>
                    {copy.plan.highestPrefix}
                    {highest.country}
                  </strong>
                  <small>
                    {distribution.multiple !== null
                      ? copy.plan.multipleSub(distribution.multiple.toFixed(1))
                      : highest.localPrice}
                  </small>
                </span>
                <span data-tone="high">{price(highest.priceUsd)}</span>
              </div>
            </div>
            {distribution.cheaper !== null && (
              <p className="gs-plan-distribution-note">
                <strong>{distribution.cheaper}</strong>
                {copy.plan.cheaperNote(distribution.cheaper, rows.length)}
              </p>
            )}
          </section>
        )}
      </div>

      <section className="gs-plan-regions" data-price-font={priceFont} aria-labelledby="plan-regions-title">
        <div className="gs-plan-region-heading">
          <h2 id="plan-regions-title">{copy.plan.regionsHeading}</h2>
          <div className="gs-plan-filters">
            <PublicSegments
              label={copy.plan.filterLabel}
              value={filter}
              onChange={(value) => {
                setFilter(value);
                setExpanded(false);
              }}
              options={[
                { value: "all", label: copy.common.all },
                ...(us
                  ? [
                      { value: "low", label: copy.plan.filterCheaper },
                      { value: "high", label: copy.plan.filterHigher },
                    ]
                  : []),
              ]}
            />
            <button
              type="button"
              data-gs-ui="button"
              aria-label={copy.plan.sortToggleAria}
              onClick={() => setSortOrder((old) => (old === "asc" ? "desc" : "asc"))}
            >
              {sortOrder === "asc" ? copy.common.sortAsc : copy.common.sortDesc}
              <PublicIcon name={sortOrder === "asc" ? "ArrowDown" : "ArrowUp"} size={16} />
            </button>
            <label className="gs-plan-search" data-gs-input>
              <PublicIcon name="Search" size={16} />
              <span className="gs-sr-only">{copy.plan.searchRegionLabel}</span>
              <input
                type="search"
                aria-label={copy.plan.searchRegionLabel}
                placeholder={copy.plan.searchRegionPlaceholder}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setExpanded(false);
                }}
              />
            </label>
          </div>
        </div>
        <div className="gs-plan-region-panel">
          <div className="gs-plan-row-heading" aria-hidden="true">
            {copy.plan.cols.map((col) => (
              <span key={col}>{col}</span>
            ))}
          </div>
          <div ref={viewport} className="gs-plan-list-viewport">
            <div ref={list}>
              {shown.map((row, index) => (
                <PublicDisclosure
                  key={row.code}
                  title={
                    <span className="gs-plan-row" data-country={row.code}>
                      <span className="gs-plan-rank">{rankByCode.get(row.code)}</span>
                      <strong>
                        <Country row={row} defer={index >= 12} />
                        <small className="gs-plan-mobile-local">
                          {row.localPrice} · {compactTaxLabel(row.tax, locale)}
                        </small>
                      </strong>
                      <span
                        className="gs-plan-row-price"
                        data-tone={
                          row.code === "US"
                            ? "baseline"
                            : us && row.priceUsd > us.priceUsd
                              ? "high"
                              : "low"
                        }
                      >
                        {price(row.priceUsd, plan.billing)}
                        <small className="gs-plan-mobile-diff">
                          {row.code === "US" ? (
                            copy.plan.usBaselineMobile
                          ) : (
                            <Saving usd={row.priceUsd} usPrice={us?.priceUsd} locale={locale} />
                          )}
                        </small>
                      </span>
                      <span className="gs-plan-desktop-local">{row.localPrice}</span>
                      <span className="gs-plan-comparison">
                        <span className="gs-plan-bar" aria-hidden="true">
                          <span
                            data-tone={
                              row.code === "US"
                                ? "baseline"
                                : us && row.priceUsd > us.priceUsd
                                  ? "high"
                                  : "low"
                            }
                            style={{ width: `${(row.priceUsd / max) * 100}%` }}
                          />
                          {us && <i style={{ left: `${(us.priceUsd / max) * 100}%` }} />}
                        </span>
                        <small>
                          {row.code === "US" ? (
                            copy.plan.usBaselineShort
                          ) : (
                            <Saving usd={row.priceUsd} usPrice={us?.priceUsd} locale={locale} />
                          )}
                        </small>
                      </span>
                      <span className="gs-plan-tax">{compactTaxLabel(row.tax, locale)}</span>
                    </span>
                  }
                >
                  <div className="gs-plan-evidence">
                    <span>
                      {copy.plan.evidenceSource}
                      {row.sourceName || copy.common.notProvided}
                    </span>
                    <span>
                      {copy.plan.evidenceCollected}
                      {dateText(row.lastCheckedAt)}
                    </span>
                    <span>
                      {copy.plan.evidenceFx}
                      {dateText(row.fxRateDate)}
                    </span>
                    <span>
                      {copy.plan.evidenceStatus}
                      {row.dataQuality === "verified"
                        ? copy.plan.qualityVerified
                        : row.dataQuality === "estimated"
                          ? copy.plan.qualityEstimated
                          : copy.plan.qualityPending}
                    </span>
                    {row.sourceUrl && (
                      <a href={row.sourceUrl} target="_blank" rel="noreferrer">
                        {copy.plan.officialSource}
                        <PublicIcon name="ExternalLink" size={16} />
                      </a>
                    )}
                    {row.observationId && (
                      <Link href={`/${locale}/price-records/${row.observationId}`}>
                        {copy.plan.viewSnapshot}
                        <PublicIcon name="ArrowRight" size={16} />
                      </Link>
                    )}
                  </div>
                </PublicDisclosure>
              ))}
              {!shown.length && (
                <p role="status" className="gs-plan-empty">
                  {copy.plan.noMatchingRegions}
                </p>
              )}
            </div>
          </div>
          <div className="gs-plan-table-footer">
            <span>{copy.plan.tableFooter(shown.length, filtered.length)}</span>
            {filtered.length > 9 && (
              <PublicExpandButton
                expanded={expanded}
                label={expanded ? copy.plan.collapseRegions : copy.plan.expandRegions(filtered.length)}
                hint={expanded ? undefined : copy.plan.remainingHint(filtered.length - shown.length)}
                onClick={() => setExpanded(!expanded)}
              />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
