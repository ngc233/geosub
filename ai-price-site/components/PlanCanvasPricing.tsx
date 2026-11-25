"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ProductPlan, RegionPrice } from "../lib/public-pricing-model";
import { getPlanStats } from "../lib/public-pricing-model";
import { planDistribution, planSaving, filterPlanRegions, type planWorkHours } from "../lib/plan-canvas";
import { formatPublicPrice } from "../lib/public-price-format";
import { formatPublicDate } from "../lib/public-date";
import PublicCurrencySelect, { usePageDisplayRates, usePublicCurrency } from "./PublicCurrencySelect";
import { PublicDisclosure, PublicExpandButton, PublicSegments } from "./PublicControls";
import PublicPriceNumber from "./PublicPriceNumber";
import PublicIcon from "./PublicIcon";
import HomepageCountryFlag from "./HomepageCountryFlag";
import SharePriceModal, { type SharePriceProduct } from "./SharePriceModal";

function Country({ row, defer = false }: { row: Pick<RegionPrice, "code" | "country">; defer?: boolean }) {
  return <span className="gs-plan-country"><HomepageCountryFlag code={row.code} defer={defer}/>{row.country}</span>;
}
function Saving({ usd, usPrice }: { usd: number; usPrice?: number }) {
  const saving = planSaving(usd, usPrice);
  return saving === null ? <span>美国基准缺失</span> : <span data-tone={saving < 0 ? "high" : "low"}>{saving === 0 ? "与美国相同" : `比美国${saving < 0 ? "高" : "低"} ${Math.round(Math.abs(saving) * 100)}%`}</span>;
}
const date = (value?: string) => formatPublicDate(value)?.text ?? "未提供";

function compactTaxLabel(tax?: string) {
  const normalized = tax?.trim();
  if (!normalized || normalized === "以结算页为准" || normalized === "App Store 标价，税费以结算页为准") {
    return "结算页计税";
  }
  return normalized.replace(/^App Store 标价，/u, "");
}

function PlanPriceDistribution({ rows, min, max, us, currency, rate, onSelect }: {
  rows: RegionPrice[]; min: number; max: number; us?: RegionPrice;
  currency: Parameters<typeof formatPublicPrice>[1]; rate: number; onSelect: (code: string) => void;
}) {
  const span = max - min;
  const offset = (usd: number) => (span > 0 ? ((usd - min) / span) * 100 : 50);
  const amount = (row: RegionPrice) => formatPublicPrice(row.priceUsd * rate, currency);
  return (
    <div className="gs-plan-distribution-chart" role="img" aria-label={`各地区价格从低到高分布${us ? "，竖线为美国价格" : "，没有美国基准"}`}>
      <div className="gs-plan-distribution-track" aria-hidden="true"/>
      {rows.map(row => (
        <span
          key={row.code}
          className="gs-plan-dot"
          aria-hidden="true"
          data-tone={row.code === "US" ? "baseline" : us && row.priceUsd > us.priceUsd ? "high" : "low"}
          style={{ left: `${offset(row.priceUsd)}%` }}
          title={`${row.country} · ${amount(row)}`}
          onClick={() => onSelect(row.code)}
        />
      ))}
      {us && <span className="gs-plan-us-marker" aria-hidden="true" style={{ left: `${offset(us.priceUsd)}%` }}><span>美国</span></span>}
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

export function PlanKeycapSwitcher({ overviewHref, productSlug, activeSlug, options, rates }: {
  overviewHref: string;
  productSlug: string;
  activeSlug: string;
  options: PlanKeycapOption[];
  rates: Record<string, number>;
}) {
  const defaultCurrency = rates.CNY > 0 ? "CNY" : "USD";
  const [preferred] = usePublicCurrency(defaultCurrency);
  const currency = rates[preferred] > 0 ? preferred : "USD";
  const rate = rates[currency] ?? 1;

  return (
    <nav className="gs-plan-keycaps" aria-label="同产品套餐切换">
      <Link href={overviewHref} className="gs-plan-keycap gs-plan-keycap-overview">
        <PublicIcon name="ArrowLeft" size={16} />
        <span>套餐总览</span>
      </Link>
      <span className="gs-plan-keycap-divider" aria-hidden="true" />
      {options.map((option) => {
        const active = option.slug === activeSlug;
        const formattedPrice = option.minUsd !== null ? formatPublicPrice(option.minUsd * rate, currency) : null;
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

export function PlanWorkRows({ rows, rates, usPrice, lowestCode }: {
  rows: ReturnType<typeof planWorkHours>["rows"]; rates: Record<string, number>; usPrice?: number; lowestCode?: string;
}) {
  const [preferred] = usePublicCurrency(), currency = rates[preferred] > 0 ? preferred : "USD", rate = rates[currency] ?? 1;
  const maxHours = Math.max(...rows.map(row => row.hours), 1);
  return <div className="gs-plan-work-rows">
    <div className="gs-plan-work-heading"><span>地区</span><span>月费折合</span><span>当地人要工作多久</span></div>
    {rows.map(row => <div key={row.code} className="gs-plan-work-row" data-country={row.code} data-lowest={row.code === lowestCode}>
      <span><Country row={row}/></span>
      <span className="gs-plan-work-price" data-tone={row.code === "US" ? "baseline" : usPrice !== undefined ? row.usd > usPrice ? "high" : "low" : "baseline"}>{formatPublicPrice(row.usd * rate, currency)}</span>
      <span className="gs-plan-work-bar" aria-hidden="true"><span style={{ width: `${row.hours / maxHours * 100}%` }}/></span><strong>{row.hours.toFixed(1)} 小时</strong><small>{row.metric === "GNI_ATLAS" ? "人均国民收入" : "名义人均 GDP"} · {row.year}</small>
    </div>)}<small>按工作时长从短到长排列；灰色条不表示购买推荐。</small>
  </div>;
}

export default function PlanCanvasPricing({ plan, product, rates, rateDates, afterCards }: {
  plan: ProductPlan; product: SharePriceProduct; rates: Record<string, number>; rateDates: Record<string, string | null>;
  afterCards?: ReactNode;
}) {
  usePageDisplayRates(rates);
  const defaultCurrency = rates.CNY > 0 ? "CNY" : "USD";
  const [preferred] = usePublicCurrency(defaultCurrency), currency = rates[preferred] > 0 ? preferred : "USD", rate = rates[currency] ?? 1;
  const priceFont = /[a-z]/i.test(formatPublicPrice(0, currency)) ? "latin" : "numerals";
  const [filter, setFilter] = useState("all"), [query, setQuery] = useState(""), [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc"), [expanded, setExpanded] = useState(false);
  const distribution = planDistribution(plan), { lowest, highest, us, rows } = distribution;
  const rankByCode = new Map(rows.map((row, idx) => [row.code, idx + 1]));
  const filtered = filterPlanRegions(rows, filter, query, us?.priceUsd);
  const sorted = sortOrder === "asc" ? filtered : [...filtered].reverse();
  const shown = expanded ? sorted : sorted.slice(0, 9);
  const focusCountry = (code: string) => {
    setFilter("all");
    setQuery("");
    setExpanded(true);
    requestAnimationFrame(() => {
      const target = list.current?.querySelector<HTMLElement>(`[data-country="${code}"]`)?.closest<HTMLElement>("[data-gs-disclosure]");
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target?.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth", block: "center" });
      target?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    });
  };
  const list = useRef<HTMLDivElement>(null), viewport = useRef<HTMLDivElement>(null);
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
    const inner = list.current, outer = viewport.current;if (!inner || !outer) return;
    const observer = new ResizeObserver(() => outer.style.setProperty("--gs-plan-list-height", `${inner.getBoundingClientRect().height}px`));
    observer.observe(inner);return () => observer.disconnect();
  }, []);
  const price = (usd: number, cycle?: string, size: "row" | "hero" = "row") => <PublicPriceNumber value={usd * rate} currency={currency} cycle={cycle} size={size} changeKey={currency}/>;
  if (!lowest || !highest) return <section className="gs-plan-panel"><h2>暂无已发布价格</h2><p>当前没有可比较的地区价格。</p></section>;
  const max = highest.priceUsd || 1;
  return <>
    <div className="gs-plan-summary" data-price-font={priceFont}>
      <section className="gs-plan-panel gs-plan-lowest" aria-label="最低价">
        <div className="gs-plan-card-top"><strong>全球最低 · <Country row={lowest} defer={false}/></strong><div className="gs-plan-tools"><PublicCurrencySelect displayCurrency={currency}/>
          {us && <SharePriceModal unifiedTrigger product={product} plan={plan} stats={getPlanStats(plan)} locale="zh"/>}</div></div>
        <div className="gs-plan-hero-price">{price(lowest.priceUsd, plan.billing, "hero")}</div>
        <div className="gs-plan-local"><span className="gs-plan-saving"><Saving usd={lowest.priceUsd} usPrice={us?.priceUsd}/></span><span>本地标价 {lowest.localPrice} · {compactTaxLabel(lowest.tax)}</span></div>
        <div className="gs-plan-lowest-facts">
          <div>
            <span>美国同套餐</span>
            <strong>{us ? price(us.priceUsd, plan.billing) : "暂无基准"}</strong>
          </div>
          <div>
            <span>{us && lowest.priceUsd < us.priceUsd ? (plan.billing === "monthly" ? "按 12 个月折算少付" : "较美国单期少付") : "最高价倍数"}</span>
            <strong data-tone={us && lowest.priceUsd < us.priceUsd ? "low" : undefined}>
              {us && lowest.priceUsd < us.priceUsd
                ? price((us.priceUsd - lowest.priceUsd) * (plan.billing === "monthly" ? 12 : 1))
                : distribution.multiple !== null ? `${distribution.multiple.toFixed(1)}x` : "—"}
            </strong>
          </div>
        </div>
        <div className="gs-plan-lowest-footer">
          <div className="gs-plan-lowest-meta">
            <span>{plan.freshness?.trustStatus === "verified" ? "已核验" : plan.freshness?.trustStatus === "reviewed" ? "已审核" : "待复核"}</span>
            <span aria-hidden="true">·</span>
            <span>采集 {date(plan.freshness?.priceCollectedAt)}</span>
            <span aria-hidden="true">·</span>
            <span>{currency === "USD" ? "美元原价" : `汇率 ${date(rateDates[currency] ?? undefined)}`}</span>
            {afterCards}
          </div>
        </div>
        {currency !== preferred && <p role="status">{preferred} 汇率不可用，当前显示 USD；可选择其他币种。</p>}
      </section>
      {distribution.visible && <section className="gs-plan-panel gs-plan-distribution" aria-label="各地区价格分布">
        <div className="gs-plan-card-top"><h2>各地区价格分布</h2><span>已收录 {rows.length} 个地区</span></div>
        <PlanPriceDistribution rows={rows} min={lowest.priceUsd} max={max} us={us} currency={currency} rate={rate} onSelect={focusCountry}/>
        <div className="gs-plan-extremes"><span>最低 · {lowest.country}</span><span>最贵 · {highest.country}</span></div>
        <div className="gs-plan-statistics">
          <div><span><strong>美国基准</strong><small>{us ? compactTaxLabel(us.tax) : "缺少基准"}</small></span>{us ? price(us.priceUsd) : <span>暂无</span>}</div>
          <div><span><strong>中位数</strong><small>半数地区更便宜</small></span>{price(distribution.median!)}</div>
          <div><span><strong>最贵 · {highest.country}</strong><small>{distribution.multiple !== null ? `最低价的 ${distribution.multiple.toFixed(1)} 倍` : highest.localPrice}</small></span><span data-tone="high">{price(highest.priceUsd)}</span></div>
        </div>
        {distribution.cheaper !== null && <p className="gs-plan-distribution-note"><strong>{distribution.cheaper}</strong> / {rows.length} 个地区比美国便宜</p>}
      </section>}
    </div>
    <section className="gs-plan-regions" data-price-font={priceFont} aria-labelledby="plan-regions-title">
      <div className="gs-plan-region-heading"><h2 id="plan-regions-title">地区价格</h2><div className="gs-plan-filters">
        <PublicSegments label="地区价格筛选" value={filter} onChange={value => { setFilter(value);setExpanded(false); }} options={[{ value: "all", label: "全部" }, ...(us ? [{ value: "low", label: "比美国便宜" }, { value: "high", label: "比美国贵" }] : [])]}/>
        <button type="button" data-gs-ui="button" aria-label="切换价格排序" onClick={() => setSortOrder(old => old === "asc" ? "desc" : "asc")}>{sortOrder === "asc" ? "从低到高" : "从高到低"}<PublicIcon name={sortOrder === "asc" ? "ArrowDown" : "ArrowUp"} size={16}/></button>
        <label className="gs-plan-search" data-gs-input><PublicIcon name="Search" size={16}/><span className="gs-sr-only">找地区</span><input type="search" aria-label="找地区" placeholder="找地区，例如 日本" value={query} onChange={e => { setQuery(e.target.value);setExpanded(false); }}/></label>
      </div></div>
      <div className="gs-plan-region-panel">
        <div className="gs-plan-row-heading" aria-hidden="true"><span>#</span><span>地区</span><span>折合</span><span>本地标价</span><span>和美国比</span><span>税费说明</span></div>
        <div ref={viewport} className="gs-plan-list-viewport"><div ref={list}>
          {shown.map((row, index) => <PublicDisclosure key={row.code} title={<span className="gs-plan-row" data-country={row.code}>
            <span className="gs-plan-rank">{rankByCode.get(row.code)}</span>
            <strong><Country row={row} defer={index >= 12}/><small className="gs-plan-mobile-local">{row.localPrice} · {compactTaxLabel(row.tax)}</small></strong>
            <span className="gs-plan-row-price" data-tone={row.code === "US" ? "baseline" : us && row.priceUsd > us.priceUsd ? "high" : "low"}>{price(row.priceUsd, plan.billing)}<small className="gs-plan-mobile-diff">{row.code === "US" ? "美国基准" : <Saving usd={row.priceUsd} usPrice={us?.priceUsd}/>}</small></span>
            <span className="gs-plan-desktop-local">{row.localPrice}</span>
            <span className="gs-plan-comparison"><span className="gs-plan-bar" aria-hidden="true"><span data-tone={row.code === "US" ? "baseline" : us && row.priceUsd > us.priceUsd ? "high" : "low"} style={{ width: `${row.priceUsd / max * 100}%` }}/>{us && <i style={{ left: `${us.priceUsd / max * 100}%` }}/>}</span><small>{row.code === "US" ? "基准" : <Saving usd={row.priceUsd} usPrice={us?.priceUsd}/>}</small></span>
            <span className="gs-plan-tax">{compactTaxLabel(row.tax)}</span>
          </span>}>
            <div className="gs-plan-evidence"><span>来源：{row.sourceName || "未提供"}</span><span>采集：{date(row.lastCheckedAt)}</span><span>汇率：{date(row.fxRateDate)}</span><span>状态：{row.dataQuality === "verified" ? "已核验" : row.dataQuality === "estimated" ? "估算" : "待核验"}</span>
              {row.sourceUrl && <a href={row.sourceUrl} target="_blank" rel="noreferrer">官方来源<PublicIcon name="ExternalLink" size={16}/></a>}
              {row.observationId && <Link href={`/zh/price-records/${row.observationId}`}>查看当时的原始套餐快照<PublicIcon name="ArrowRight" size={16}/></Link>}
            </div>
          </PublicDisclosure>)}
          {!shown.length && <p role="status" className="gs-plan-empty">没有符合条件的地区价格</p>}
        </div></div>
        <div className="gs-plan-table-footer"><span>显示 {shown.length} / {filtered.length} 个地区 · 均为平台公开标价，最终税费以结算页为准</span>{filtered.length > 9 && <PublicExpandButton expanded={expanded} label={expanded ? "收起地区" : `展开全部 ${filtered.length} 个地区`} hint={expanded ? undefined : `还有 ${filtered.length - shown.length} 个`} onClick={() => setExpanded(!expanded)} />}</div>
      </div>
    </section>
  </>;
}
