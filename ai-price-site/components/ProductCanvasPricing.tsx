"use client";
import Link from "next/link";
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { productSaving, sortProductRows } from "../lib/product-canvas-order";
import type { ProductCanvasModel } from "../lib/product-canvas";
import { formatPublicPrice, publicBillingLabel } from "../lib/public-price-format";
import PublicCurrencySelect, { usePageDisplayRates, usePublicCurrency } from "./PublicCurrencySelect";
import { PublicSegments } from "./PublicControls";
import PublicPriceNumber from "./PublicPriceNumber";
import HomepageCountryFlag from "./HomepageCountryFlag";
import PublicIcon from "./PublicIcon";

function Savings({ value, compact = false }: { value: number | null; compact?: boolean }) {
  if (value === null) return null;
  const pct = Math.round(Math.abs(value) * 100);
  if (pct === 0) {
    return <span className="gs-product-saving" data-tone="baseline">{compact ? "持平" : "与美国同价"}</span>;
  }
  const higher = value < 0;
  return (
    <span className="gs-product-saving" data-tone={higher ? "high" : "low"}>
      {compact ? `${higher ? "+" : "−"}${pct}%` : `比美国${higher ? "高" : "低"} ${pct}%`}
    </span>
  );
}

export default function ProductCanvasPricing({ model, rates, hero }: { model: ProductCanvasModel; rates: Record<string, number>; hero: ReactNode }) {
  usePageDisplayRates(rates);
  const defaultCurrency = rates.CNY > 0 ? "CNY" : "USD";
  const [preferred] = usePublicCurrency(defaultCurrency), currency = rates[preferred] > 0 ? preferred : "USD", rate = rates[currency] ?? 1;
  // Keep cross-letter kerning (e.g. HK$) intact by using the original face
  // for the whole price whenever its currency prefix contains Latin letters.
  const priceFont = /[a-z]/i.test(formatPublicPrice(0, currency)) ? "latin" : "numerals";
  const [column, setColumn] = useState(model.defaultPlan), [direction, setDirection] = useState<"asc" | "desc">("asc");
  const rows = sortProductRows(model.rows, column, direction), selected = model.plans[column], featured = model.plans[model.defaultPlan];
  const nonUsRows = rows.filter(row => row.code !== "US");
  const usRow = rows.find(row => row.code === "US");
  const topSampleRows = nonUsRows.slice(0, 5);
  const previewRows = usRow ? [...topSampleRows, usRow] : rows.slice(0, 6);
  const table = useRef<HTMLDivElement>(null);
  const before = useRef<Map<string, number>>(new Map());
  const remember = () => { before.current = new Map([...table.current?.querySelectorAll<HTMLElement>("[data-country]") ?? []].map(row => [row.dataset.country!, row.getBoundingClientRect().top])); };
  const sort = (next: number) => { remember(); setColumn(next); setDirection(next === column && direction === "asc" ? "desc" : "asc"); };
  useLayoutEffect(() => {
    // Initial HTML is already in order; only a user sort needs FLIP work.
    if (!before.current.size) return;
    const elements = table.current?.querySelectorAll<HTMLElement>("[data-country]");
    if (!elements) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    // Cancel the previous FLIP before reading layout destinations. A rapid
    // second sort starts at its actual on-screen position, not its old offset.
    for (const row of elements) { row.dataset.flip = "start"; row.style.setProperty("--gs-product-row-offset", "0px"); }
    const destinations = new Map([...elements].map(row => [row.dataset.country!, row.getBoundingClientRect().top]));
    for (const row of elements) {
      const top = destinations.get(row.dataset.country!)!;
      const delta = reduced.matches ? 0 : (before.current.get(row.dataset.country!) ?? top) - top;
      row.dataset.flip = "start"; row.style.setProperty("--gs-product-row-offset", `${delta}px`);
    }
    // FLIP coordinates are measured here; all transforms and timing live in CSS.
    table.current?.getBoundingClientRect();
    const frame = requestAnimationFrame(() => { for (const row of elements) row.dataset.flip = "end"; });
    before.current.clear();
    return () => cancelAnimationFrame(frame);
  }, [column, direction]);
  const price = (usd: number, cycle?: string, size: "row" | "hero" = "row") => <PublicPriceNumber value={usd * rate} currency={currency} cycle={cycle} size={size} changeKey={currency}/>;
  const featuredPct = featured?.saving !== null && featured?.saving !== undefined ? Math.round(featured.saving * 100) : null;
  const featuredHasDiscount = featuredPct !== null && featuredPct > 0;
  return <>
    <section className="gs-product-hero" data-price-font={priceFont}>{hero}{featured && <aside className="gs-product-conclusion">
      <div className="gs-product-conclusion-tools">
        <span className="gs-product-conclusion-kicker">{featuredHasDiscount ? `低价结论 · ${featured.name}` : `代表套餐 · ${featured.name}`}</span>
        <PublicCurrencySelect displayCurrency={currency}/>
      </div>
      <h2>
        {featuredHasDiscount || (featured.usPrice === undefined && featured.coverage > 1)
          ? <>{featured.name} 在 <HomepageCountryFlag code={featured.lowest.code}/>{featured.lowest.country} 最便宜</>
          : <>{featured.name} · <HomepageCountryFlag code={featured.lowest.code}/>{featured.lowest.country} 基准价</>}
      </h2>
      <div className="gs-product-headline-price" data-tone={featuredHasDiscount ? "low" : "baseline"}>
        {price(featured.lowest.usd, featured.cycle, "hero")}
        {featuredHasDiscount ? <Savings value={featured.saving}/> : null}
      </div>
      {featured.usPrice !== undefined && featuredHasDiscount && <p>美国基准 {price(featured.usPrice, featured.cycle)} · 同一套餐、同一渠道</p>}
      {featured.usPrice !== undefined && !featuredHasDiscount && <p>{featured.coverage <= 1 ? "当前仅收录美区公开价格" : "当前最低价与美区基准一致"} · {featured.channel}</p>}
      <Link href={featured.href} prefetch={false} data-gs-ui="button" data-gs-variant="primary">查看 {featured.name} 各地区价格<PublicIcon name="ArrowRight" size={16}/></Link>
      {currency !== preferred && <p role="status">{preferred} 汇率不可用，当前显示 USD；可选择其他币种。</p>}
    </aside>}</section>
    {model.plans.length > 0 && <>
      <section className="gs-product-section" data-price-font={priceFont} aria-labelledby="product-plans"><h2 id="product-plans">套餐概览</h2>
        <div className="gs-product-plans" data-count={model.plans.length}>{model.plans.map(plan => {
          const pct = plan.saving !== null ? Math.round(plan.saving * 100) : null;
          const hasDiscount = pct !== null && pct > 0;
          const isHigher = pct !== null && pct < 0;
          const showLowestLabel = plan.coverage > 1 && (hasDiscount || plan.usPrice === undefined);
          return <article className="gs-product-plan" key={plan.slug} data-gs-motion-card>
            <div className="gs-product-plan-heading"><h3>{plan.name}</h3><span>{plan.channel} · 每{publicBillingLabel(plan.cycle)} · {plan.coverage} 个地区</span></div>
            <div className="gs-product-plan-bottom">
              <div>
                <p className="gs-product-country"><HomepageCountryFlag code={plan.lowest.code}/>{plan.lowest.country}{showLowestLabel ? " 最低" : plan.lowest.code === "US" ? " 基准" : ""}</p>
                <div className="gs-product-plan-price" data-tone={hasDiscount ? "low" : isHigher ? "high" : "baseline"}>{price(plan.lowest.usd, plan.cycle)}</div>
              </div>
              <div className="gs-product-plan-reference">
                {hasDiscount || isHigher ? (
                  <>
                    <Savings value={plan.saving}/>
                    {plan.usPrice !== undefined && <span>美国 {price(plan.usPrice)}</span>}
                  </>
                ) : (
                  <span className="gs-product-saving" data-tone="baseline">
                    {plan.coverage <= 1 ? "仅美区基准" : plan.usPrice !== undefined ? "与美区同价" : "暂无美区基准"}
                  </span>
                )}
              </div>
            </div>
            {(plan.bestFor || plan.difference) && (
              <dl className="gs-product-plan-traits">
                {plan.bestFor && (
                  <div>
                    <dt>适合</dt>
                    <dd>{plan.bestFor}</dd>
                  </div>
                )}
                {plan.difference && (
                  <div>
                    <dt>区别</dt>
                    <dd>{plan.difference}</dd>
                  </div>
                )}
              </dl>
            )}
            <div className="gs-product-plan-cta" aria-hidden="true">
              <span>{plan.coverage > 1 ? `查看 ${plan.name} 全部 ${plan.coverage} 个地区与本币明细` : `查看 ${plan.name} 价格与订阅说明`}</span>
              <PublicIcon name="ArrowRight" size={16}/>
            </div>
            <Link href={plan.href} prefetch={false} className="gs-product-plan-link" data-track-event="select_plan" data-track-name="Open plan country pricing" data-track-button={plan.slug} data-track-placement="product_overview_card"><span className="gs-sr-only">查看 {plan.name} 地区价格</span></Link>
          </article>;
        })}</div>
      </section>
      {previewRows.length > 1 && <section className="gs-product-section" data-price-font={priceFont} aria-labelledby="product-matrix-title">
        <div className="gs-product-section-heading"><div><h2 id="product-matrix-title">代表地区跨套餐对比</h2><p>精选前 {topSampleRows.length} 个{direction === "asc" ? "低价" : "高价"}代表地区{usRow ? "与美区基准" : ""}横向对照；点套餐列名可切换排序基准</p></div>
          <div className="gs-product-matrix-controls"><PublicSegments label="价格排序" options={[{value:"asc", label:"从低到高"}, {value:"desc", label:"从高到低"}]} value={direction} onChange={value => { remember(); setDirection(value as "asc" | "desc"); }}/></div></div>
        <div className="gs-product-table-scroll"><div role="table" aria-label="代表地区套餐价格" aria-colcount={model.plans.length + 2} aria-rowcount={previewRows.length + 1} className="gs-product-table" style={{ "--gs-product-plan-count": model.plans.length } as CSSProperties}>
          <div role="row" className="gs-product-matrix-head"><div role="columnheader">国家 / 地区</div>{model.plans.map((plan, index) => <div role="columnheader" key={plan.slug} aria-sort={index === column ? direction === "asc" ? "ascending" : "descending" : "none"}><button type="button" data-active={index === column} onClick={() => sort(index)}><span className="gs-product-matrix-coltitle">{plan.name}<PublicIcon name={index === column && direction === "desc" ? "ArrowUp" : "ArrowDown"} size={16}/></span><small>{plan.channel} · {publicBillingLabel(plan.cycle)}</small></button></div>)}<div role="columnheader" className="gs-product-matrix-head-action">详情</div></div>
          <div ref={table} role="rowgroup">
            {previewRows.map((row, index) => {
              const isSeparatedBaseline = Boolean(usRow && row.code === "US" && topSampleRows.length > 0);
              return <div role="row" key={row.code} aria-rowindex={index + 2} data-country={row.code} data-us={row.code === "US"} data-baseline-divider={isSeparatedBaseline ? "true" : undefined} className="gs-product-matrix-row" data-gs-motion-row>
                <div role="cell" className="gs-product-country"><HomepageCountryFlag code={row.code} defer={false}/><strong>{row.country}</strong>{row.code === "US" && <small className="gs-product-us-badge">基准</small>}</div>
                {row.cells.map((cell, planIndex) => {
                  const saving = cell ? productSaving(cell.usd, model.plans[planIndex].usPrice) : null;
                  const pct = saving !== null ? Math.round(saving * 100) : null;
                  const tone = row.code === "US" || pct === null || pct === 0 ? "baseline" : pct < 0 ? "high" : "low";
                  return <div role="cell" key={model.plans[planIndex].slug} className="gs-product-matrix-cell" data-selected={column === planIndex} data-tone={tone}>
                    {cell ? <>{price(cell.usd, model.plans[planIndex].cycle)}{row.code === "US" ? <small>美区基准</small> : <Savings value={saving} compact/>}</> : <span className="gs-product-matrix-empty" aria-label="没有可比价格">—</span>}
                  </div>;
                })}
                <div role="cell" className="gs-product-matrix-action-cell">{row.cells[column] && <Link href={`${selected.href}#region-${row.code}`} prefetch={false} className="gs-product-matrix-link">查看<PublicIcon name="ArrowRight" size={16}/></Link>}</div>
              </div>;
            })}
          </div>
        </div><div className="gs-product-table-footer">
        <span>仅展示 {previewRows.length} / {rows.length} 个代表地区样本 · 完整排名、本币原价与税费快照请进入单套餐页</span>
        <Link href={selected.href} prefetch={false} className="gs-product-table-drilldown">
          {selected.coverage > 1 ? `查看 ${selected.name} 全部 ${selected.coverage} 个地区完整排行` : `查看 ${selected.name} 价格详情`}
          <PublicIcon name="ArrowRight" size={16}/>
        </Link>
        </div></div>
      </section>}
    </>}
  </>;
}
