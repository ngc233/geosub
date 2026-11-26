"use client";
import Link from "next/link";
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { productSaving, sortProductRows } from "../lib/product-canvas-order";
import type { ProductCanvasModel } from "../lib/product-canvas";
import { formatPublicPrice, publicBillingLabel } from "../lib/public-price-format";
import {
  canvasDefaultCurrency,
  canvasIntlLocale,
  canvasSavingsText,
  canvasUiCopy,
  type CanvasLocale,
} from "../lib/canvas-ui-copy";
import PublicCurrencySelect, { usePageDisplayRates, usePublicCurrency } from "./PublicCurrencySelect";
import { PublicSegments } from "./PublicControls";
import PublicPriceNumber from "./PublicPriceNumber";
import HomepageCountryFlag from "./HomepageCountryFlag";
import PublicIcon from "./PublicIcon";

function Savings({
  value,
  locale,
  compact = false,
}: {
  value: number | null;
  locale: CanvasLocale;
  compact?: boolean;
}) {
  const result = canvasSavingsText(value, locale, compact);
  if (!result) return null;
  return (
    <span className="gs-product-saving" data-tone={result.tone}>
      {result.text}
    </span>
  );
}

export default function ProductCanvasPricing({
  model,
  rates,
  hero,
  locale = "zh",
}: {
  model: ProductCanvasModel;
  rates: Record<string, number>;
  hero: ReactNode;
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
  const [column, setColumn] = useState(model.defaultPlan);
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const rows = sortProductRows(model.rows, column, direction);
  const selected = model.plans[column];
  const featured = model.plans[model.defaultPlan];
  const nonUsRows = rows.filter((row) => row.code !== "US");
  const usRow = rows.find((row) => row.code === "US");
  const topSampleRows = nonUsRows.slice(0, 5);
  const previewRows = usRow ? [...topSampleRows, usRow] : rows.slice(0, 6);
  const table = useRef<HTMLDivElement>(null);
  const before = useRef<Map<string, number>>(new Map());
  const remember = () => {
    before.current = new Map(
      [...(table.current?.querySelectorAll<HTMLElement>("[data-country]") ?? [])].map((row) => [
        row.dataset.country!,
        row.getBoundingClientRect().top,
      ]),
    );
  };
  const sort = (next: number) => {
    remember();
    setColumn(next);
    setDirection(next === column && direction === "asc" ? "desc" : "asc");
  };

  useLayoutEffect(() => {
    if (!before.current.size) return;
    const elements = table.current?.querySelectorAll<HTMLElement>("[data-country]");
    if (!elements) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    for (const row of elements) {
      row.dataset.flip = "start";
      row.style.setProperty("--gs-product-row-offset", "0px");
    }
    const destinations = new Map(
      [...elements].map((row) => [row.dataset.country!, row.getBoundingClientRect().top]),
    );
    for (const row of elements) {
      const top = destinations.get(row.dataset.country!)!;
      const delta = reduced.matches ? 0 : (before.current.get(row.dataset.country!) ?? top) - top;
      row.dataset.flip = "start";
      row.style.setProperty("--gs-product-row-offset", `${delta}px`);
    }
    table.current?.getBoundingClientRect();
    const frame = requestAnimationFrame(() => {
      for (const row of elements) row.dataset.flip = "end";
    });
    before.current.clear();
    return () => cancelAnimationFrame(frame);
  }, [column, direction]);

  const price = (usd: number, cycle?: string, size: "row" | "hero" = "row") => (
    <PublicPriceNumber
      value={usd * rate}
      currency={currency}
      locale={intlLocale}
      cycle={cycle}
      size={size}
      changeKey={currency}
    />
  );

  const featuredPct =
    featured?.saving !== null && featured?.saving !== undefined
      ? Math.round(featured.saving * 100)
      : null;
  const featuredHasDiscount = featuredPct !== null && featuredPct > 0;

  return (
    <>
      <section className="gs-product-hero" data-price-font={priceFont}>
        {hero}
        {featured && (
          <aside className="gs-product-conclusion">
            <div className="gs-product-conclusion-tools">
              <span className="gs-product-conclusion-kicker">
                {featuredHasDiscount
                  ? copy.product.kickerLow(featured.name)
                  : copy.product.kickerDefault(featured.name)}
              </span>
              <PublicCurrencySelect displayCurrency={currency} locale={locale} />
            </div>
            <h2>
              {featuredHasDiscount || (featured.usPrice === undefined && featured.coverage > 1) ? (
                <>
                  {featured.name} {copy.product.cheapestInPrefix}{" "}
                  <HomepageCountryFlag code={featured.lowest.code} />
                  {featured.lowest.country}
                  {copy.product.cheapestInSuffix ? ` ${copy.product.cheapestInSuffix}` : ""}
                </>
              ) : (
                <>
                  {featured.name} · <HomepageCountryFlag code={featured.lowest.code} />
                  {featured.lowest.country} {copy.product.baselineSuffix}
                </>
              )}
            </h2>
            <div className="gs-product-headline-price" data-tone={featuredHasDiscount ? "low" : "baseline"}>
              {price(featured.lowest.usd, featured.cycle, "hero")}
              {featuredHasDiscount ? <Savings value={featured.saving} locale={locale} /> : null}
            </div>
            {featured.usPrice !== undefined && featuredHasDiscount && (
              <p>
                {copy.product.usBaselinePrefix} {price(featured.usPrice, featured.cycle)}{" "}
                {copy.product.usBaselineNote}
              </p>
            )}
            {featured.usPrice !== undefined && !featuredHasDiscount && (
              <p>
                {featured.coverage <= 1 ? copy.product.usOnlyNote : copy.product.sameAsUsNote} ·{" "}
                {featured.channel}
              </p>
            )}
            <Link href={featured.href} prefetch={false} data-gs-ui="button" data-gs-variant="primary">
              {copy.product.viewPlanRegions(featured.name)}
              <PublicIcon name="ArrowRight" size={16} />
            </Link>
            {currency !== preferred && (
              <p role="status">{copy.common.fxFallbackStatus(preferred)}</p>
            )}
          </aside>
        )}
      </section>

      {model.plans.length > 0 && (
        <>
          <section className="gs-product-section" data-price-font={priceFont} aria-labelledby="product-plans">
            <h2 id="product-plans">{copy.product.plansSectionHeading}</h2>
            <div className="gs-product-plans" data-count={model.plans.length}>
              {model.plans.map((plan) => {
                const pct = plan.saving !== null ? Math.round(plan.saving * 100) : null;
                const hasDiscount = pct !== null && pct > 0;
                const isHigher = pct !== null && pct < 0;
                const showLowestLabel = plan.coverage > 1 && (hasDiscount || plan.usPrice === undefined);
                const cycleText = publicBillingLabel(plan.cycle, intlLocale);
                return (
                  <article className="gs-product-plan" key={plan.slug} data-gs-motion-card>
                    <div className="gs-product-plan-heading">
                      <h3>{plan.name}</h3>
                      <span>{copy.product.planCardMeta(plan.channel, cycleText, plan.coverage)}</span>
                    </div>
                    <div className="gs-product-plan-bottom">
                      <div>
                        <p className="gs-product-country">
                          <HomepageCountryFlag code={plan.lowest.code} />
                          {plan.lowest.country}
                          {showLowestLabel
                            ? copy.product.lowestTag
                            : plan.lowest.code === "US"
                              ? copy.product.baselineTag
                              : ""}
                        </p>
                        <div
                          className="gs-product-plan-price"
                          data-tone={hasDiscount ? "low" : isHigher ? "high" : "baseline"}
                        >
                          {price(plan.lowest.usd, plan.cycle)}
                        </div>
                      </div>
                      <div className="gs-product-plan-reference">
                        {hasDiscount || isHigher ? (
                          <>
                            <Savings value={plan.saving} locale={locale} />
                            {plan.usPrice !== undefined && (
                              <span>
                                {copy.product.usShortPrefix}
                                {price(plan.usPrice)}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="gs-product-saving" data-tone="baseline">
                            {plan.coverage <= 1
                              ? copy.product.usOnlyBadge
                              : plan.usPrice !== undefined
                                ? copy.product.sameAsUsBadge
                                : copy.product.noUsBadge}
                          </span>
                        )}
                      </div>
                    </div>
                    {(plan.bestFor || plan.difference) && (
                      <dl className="gs-product-plan-traits">
                        {plan.bestFor && (
                          <div>
                            <dt>{copy.product.bestForDt}</dt>
                            <dd>{plan.bestFor}</dd>
                          </div>
                        )}
                        {plan.difference && (
                          <div>
                            <dt>{copy.product.differenceDt}</dt>
                            <dd>{plan.difference}</dd>
                          </div>
                        )}
                      </dl>
                    )}
                    <div className="gs-product-plan-cta" aria-hidden="true">
                      <span>
                        {plan.coverage > 1
                          ? copy.product.planCardCtaMulti(plan.name, plan.coverage)
                          : copy.product.planCardCtaSingle(plan.name)}
                      </span>
                      <PublicIcon name="ArrowRight" size={16} />
                    </div>
                    <Link
                      href={plan.href}
                      prefetch={false}
                      className="gs-product-plan-link"
                      data-track-event="select_plan"
                      data-track-name="Open plan country pricing"
                      data-track-button={plan.slug}
                      data-track-placement="product_overview_card"
                    >
                      <span className="gs-sr-only">{copy.product.planCardSrLink(plan.name)}</span>
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>

          {previewRows.length > 1 && (
            <section
              className="gs-product-section"
              data-price-font={priceFont}
              aria-labelledby="product-matrix-title"
            >
              <div className="gs-product-section-heading">
                <div>
                  <h2 id="product-matrix-title">{copy.product.matrixHeading}</h2>
                  <p>{copy.product.matrixDesc(topSampleRows.length, direction === "asc", Boolean(usRow))}</p>
                </div>
                <div className="gs-product-matrix-controls">
                  <PublicSegments
                    label={copy.product.matrixSortLabel}
                    options={[
                      { value: "asc", label: copy.common.sortAsc },
                      { value: "desc", label: copy.common.sortDesc },
                    ]}
                    value={direction}
                    onChange={(value) => {
                      remember();
                      setDirection(value as "asc" | "desc");
                    }}
                  />
                </div>
              </div>
              <div className="gs-product-table-scroll">
                <div
                  role="table"
                  aria-label={copy.product.matrixTableAria}
                  aria-colcount={model.plans.length + 2}
                  aria-rowcount={previewRows.length + 1}
                  className="gs-product-table"
                  style={{ "--gs-product-plan-count": model.plans.length } as CSSProperties}
                >
                  <div role="row" className="gs-product-matrix-head">
                    <div role="columnheader">{copy.product.matrixCountryCol}</div>
                    {model.plans.map((plan, index) => (
                      <div
                        role="columnheader"
                        key={plan.slug}
                        aria-sort={
                          index === column ? (direction === "asc" ? "ascending" : "descending") : "none"
                        }
                      >
                        <button type="button" data-active={index === column} onClick={() => sort(index)}>
                          <span className="gs-product-matrix-coltitle">
                            {plan.name}
                            <PublicIcon
                              name={index === column && direction === "desc" ? "ArrowUp" : "ArrowDown"}
                              size={16}
                            />
                          </span>
                          <small>
                            {plan.channel} · {publicBillingLabel(plan.cycle, intlLocale)}
                          </small>
                        </button>
                      </div>
                    ))}
                    <div role="columnheader" className="gs-product-matrix-head-action">
                      {copy.product.matrixActionCol}
                    </div>
                  </div>
                  <div ref={table} role="rowgroup">
                    {previewRows.map((row, index) => {
                      const isSeparatedBaseline = Boolean(
                        usRow && row.code === "US" && topSampleRows.length > 0,
                      );
                      return (
                        <div
                          role="row"
                          key={row.code}
                          aria-rowindex={index + 2}
                          data-country={row.code}
                          data-us={row.code === "US"}
                          data-baseline-divider={isSeparatedBaseline ? "true" : undefined}
                          className="gs-product-matrix-row"
                          data-gs-motion-row
                        >
                          <div role="cell" className="gs-product-country">
                            <HomepageCountryFlag code={row.code} defer={false} />
                            <strong>{row.country}</strong>
                            {row.code === "US" && (
                              <small className="gs-product-us-badge">{copy.product.usBadge}</small>
                            )}
                          </div>
                          {row.cells.map((cell, planIndex) => {
                            const saving = cell
                              ? productSaving(cell.usd, model.plans[planIndex].usPrice)
                              : null;
                            const pct = saving !== null ? Math.round(saving * 100) : null;
                            const tone =
                              row.code === "US" || pct === null || pct === 0
                                ? "baseline"
                                : pct < 0
                                  ? "high"
                                  : "low";
                            return (
                              <div
                                role="cell"
                                key={model.plans[planIndex].slug}
                                className="gs-product-matrix-cell"
                                data-selected={column === planIndex}
                                data-tone={tone}
                              >
                                {cell ? (
                                  <>
                                    {price(cell.usd, model.plans[planIndex].cycle)}
                                    {row.code === "US" ? (
                                      <small>{copy.product.usCellSub}</small>
                                    ) : (
                                      <Savings value={saving} locale={locale} compact />
                                    )}
                                  </>
                                ) : (
                                  <span
                                    className="gs-product-matrix-empty"
                                    aria-label={copy.product.emptyCellAria}
                                  >
                                    —
                                  </span>
                                )}
                              </div>
                            );
                          })}
                          <div role="cell" className="gs-product-matrix-action-cell">
                            {row.cells[column] && (
                              <Link
                                href={`${selected.href}#region-${row.code}`}
                                prefetch={false}
                                className="gs-product-matrix-link"
                              >
                                {copy.product.matrixRowView}
                                <PublicIcon name="ArrowRight" size={16} />
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="gs-product-table-footer">
                  <span>{copy.product.matrixFooterNote(previewRows.length, rows.length)}</span>
                  <Link href={selected.href} prefetch={false} className="gs-product-table-drilldown">
                    {selected.coverage > 1
                      ? copy.product.matrixDrilldownMulti(selected.name, selected.coverage)
                      : copy.product.matrixDrilldownSingle(selected.name)}
                    <PublicIcon name="ArrowRight" size={16} />
                  </Link>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
