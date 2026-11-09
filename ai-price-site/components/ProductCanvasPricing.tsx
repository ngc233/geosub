"use client";
import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { productSaving, sortProductRows } from "../lib/product-canvas-order";
import type { ProductCanvasModel } from "../lib/product-canvas";
import { formatPublicPrice, publicBillingLabel } from "../lib/public-price-format";
import PublicCurrencySelect, { usePageDisplayRates, usePublicCurrency } from "./PublicCurrencySelect";
import { PublicSegments } from "./PublicControls";
import PublicPriceNumber from "./PublicPriceNumber";
import HomepageCountryFlag from "./HomepageCountryFlag";
import PublicIcon from "./PublicIcon";

function Savings({ value }: { value: number | null }) {
  if (value === null) return null;
  return <span className="gs-product-saving" data-tone={value < 0 ? "high" : "low"}>比美国{value < 0 ? "高" : "低"} {Math.round(Math.abs(value) * 100)}%</span>;
}

export default function ProductCanvasPricing({ model, rates, hero }: { model: ProductCanvasModel; rates: Record<string, number>; hero: ReactNode }) {
  usePageDisplayRates(rates);
  const [preferred] = usePublicCurrency(), currency = rates[preferred] > 0 ? preferred : "USD", rate = rates[currency] ?? 1;
  // Keep cross-letter kerning (e.g. HK$) intact by using the original face
  // for the whole price whenever its currency prefix contains Latin letters.
  const priceFont = /[a-z]/i.test(formatPublicPrice(0, currency)) ? "latin" : "numerals";
  const [column, setColumn] = useState(model.defaultPlan), [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState(false);
  const rows = sortProductRows(model.rows, column, direction), selected = model.plans[column], featured = model.plans[model.defaultPlan];
  const matrixId = useId(), table = useRef<HTMLDivElement>(null), viewport = useRef<HTMLDivElement>(null);
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
  useEffect(() => {
    const outer = viewport.current, inner = table.current;
    if (!outer || !inner) return;
    const observer = new ResizeObserver(() => {
      outer.style.setProperty("--gs-product-table-height", `${inner.getBoundingClientRect().height}px`);
    });
    observer.observe(inner); return () => observer.disconnect();
  }, []);
  const price = (usd: number, cycle?: string, size: "row" | "hero" = "row") => <PublicPriceNumber value={usd * rate} currency={currency} cycle={cycle} size={size} changeKey={currency}/>;
  return <>
    <section className="gs-product-hero" data-price-font={priceFont}>{hero}{featured && <aside className="gs-product-conclusion">
      <div className="gs-product-conclusion-tools"><span>结论 · {featured.name}</span></div>
      <h2>{featured.name} 在 <HomepageCountryFlag code={featured.lowest.code}/>{featured.lowest.country} 最便宜</h2>
      <div className="gs-product-headline-price">{price(featured.lowest.usd, featured.cycle, "hero")}<Savings value={featured.saving}/></div>
      {featured.usPrice !== undefined && <p>美国基准 {price(featured.usPrice, featured.cycle)} · 同一套餐、同一渠道</p>}
      <Link href={featured.href} prefetch={false} data-gs-ui="button" data-gs-variant="primary">查看 {featured.name} 各地区价格<PublicIcon name="ArrowRight" size={16}/></Link>
      {currency !== preferred && <p role="status">{preferred} 汇率不可用，当前显示 USD；可选择其他币种。</p>}
    </aside>}</section>
    {model.plans.length > 0 && <>
      <section className="gs-product-section" data-price-font={priceFont} aria-labelledby="product-plans"><h2 id="product-plans">套餐概览</h2>
        <div className="gs-product-plans">{model.plans.map(plan => <article className="gs-product-plan" key={plan.slug} data-gs-motion-card>
          <div className="gs-product-plan-heading"><h3>{plan.name}</h3><span>{plan.channel} · {publicBillingLabel(plan.cycle)}</span></div>
          <div className="gs-product-plan-bottom"><div><p className="gs-product-country"><HomepageCountryFlag code={plan.lowest.code} defer/>{plan.lowest.country} 最低</p><div className="gs-product-plan-price">{price(plan.lowest.usd, plan.cycle)}</div></div>
            <div className="gs-product-plan-reference"><Savings value={plan.saving}/>{plan.usPrice !== undefined && <span>美国 {price(plan.usPrice)}</span>}</div></div>
          <Link href={plan.href} prefetch={false} className="gs-product-plan-link" data-track-event="select_plan" data-track-name="Open plan country pricing" data-track-button={plan.slug} data-track-placement="product_overview_card"><span className="gs-sr-only">查看 {plan.name} 地区价格</span></Link>
        </article>)}</div>
      </section>
      <section className="gs-product-section" data-price-font={priceFont} aria-labelledby="product-matrix-title">
        <div className="gs-product-section-heading"><div><h2 id="product-matrix-title">所有地区 × 套餐</h2><p>点套餐列名切换排序；同一列按相同渠道与周期比较</p></div>
          <div className="gs-product-matrix-controls"><PublicCurrencySelect displayCurrency={currency}/><PublicSegments label="价格排序" options={[{value:"asc", label:"从低到高"}, {value:"desc", label:"从高到低"}]} value={direction} onChange={value => { remember(); setDirection(value as "asc" | "desc"); }}/></div></div>
        <div className="gs-product-table-scroll"><div role="table" aria-label="地区套餐价格" aria-colcount={model.plans.length + 2} aria-rowcount={rows.length + 1} className="gs-product-table" style={{ "--gs-product-plan-count": model.plans.length } as CSSProperties}>
          <div role="row" className="gs-product-matrix-head"><div role="columnheader">国家 / 地区</div>{model.plans.map((plan, index) => <div role="columnheader" key={plan.slug} aria-sort={index === column ? direction === "asc" ? "ascending" : "descending" : "none"}><button type="button" data-active={index === column} onClick={() => sort(index)}>{plan.name}<PublicIcon name={index === column && direction === "desc" ? "ArrowUp" : "ArrowDown"} size={16}/><small>{plan.channel} · {publicBillingLabel(plan.cycle)}</small></button></div>)}<div role="columnheader">入口</div></div>
          <div className="gs-product-table-viewport" ref={viewport}><div ref={table} role="rowgroup" id={matrixId}>
            {(expanded ? rows : rows.slice(0, 8)).map((row, index) => <div role="row" key={row.code} aria-rowindex={index + 2} data-country={row.code} data-us={row.code === "US"} className="gs-product-matrix-row" data-gs-motion-row>
              <div role="cell" className="gs-product-country"><HomepageCountryFlag code={row.code} defer/><strong>{row.country}</strong>{row.code === "US" && <small>基准</small>}</div>
              {row.cells.map((cell, planIndex) => <div role="cell" key={model.plans[planIndex].slug} className="gs-product-matrix-cell" data-selected={column === planIndex} data-tone={row.code === "US" ? "baseline" : cell && productSaving(cell.usd, model.plans[planIndex].usPrice)! < 0 ? "high" : "low"}>
                {cell ? <>{price(cell.usd, model.plans[planIndex].cycle)}{row.code === "US" ? <small>基准</small> : <Savings value={productSaving(cell.usd, model.plans[planIndex].usPrice)}/>}</> : <span className="gs-sr-only">没有可比价格</span>}
              </div>)}
              <div role="cell">{row.cells[column] && <Link href={selected.href} prefetch={false} className="gs-product-matrix-link">查看<PublicIcon name="ArrowRight" size={16}/></Link>}</div>
            </div>)}
          </div></div>
        </div><div className="gs-product-table-footer">
        <span>显示 {expanded ? rows.length : Math.min(8, rows.length)} / {rows.length} 个地区</span>
        {rows.length > 8 && <button type="button" className="gs-product-expand" aria-expanded={expanded} aria-controls={matrixId} onClick={() => setExpanded(!expanded)}>{expanded ? "收起地区" : `展开全部 ${rows.length} 个地区`}<PublicIcon name="ChevronDown" size={16}/></button>}
        <p className="gs-product-matrix-note" role="status">按 {selected.name} {direction === "asc" ? "从低到高" : "从高到低"} · {selected.channel} · 每{publicBillingLabel(selected.cycle)} · 空白格无可比价格，折算价格仅供参考。</p>
        </div></div>
      </section>
      {(model.intro || model.plans.some(plan => plan.bestFor || plan.difference)) && <section className="gs-product-section gs-product-editorial">
        <h2>套餐说明</h2>
        {(model.intro || model.summary) && <div className="gs-product-editorial-intro">
          {model.intro && <p>{model.intro}</p>}{model.summary && <p>{model.summary}</p>}
        </div>}
        {model.plans.some(plan => plan.bestFor || plan.difference) && <div className="gs-product-editorial-grid">
          {model.plans.map(plan => (plan.bestFor || plan.difference) && <article className="gs-product-editorial-plan" key={plan.slug}>
            <h3>{plan.name}</h3>
            <div>{plan.bestFor && <p>{plan.bestFor}</p>}{plan.difference && <p>{plan.difference}</p>}</div>
          </article>)}
        </div>}
      </section>}
    </>}
  </>;
}
