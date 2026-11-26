"use client";
import Link from "next/link";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import type { countryCanvasRows } from "../lib/country-canvas";
import { formatPublicPrice } from "../lib/public-price-format";
import { savingsLabel, savingsPercent } from "../lib/homepage-display";
import {
  canvasDefaultCurrency,
  canvasIntlLocale,
  canvasUiCopy,
  type CanvasLocale,
} from "../lib/canvas-ui-copy";
import BrandIcon from "./BrandIcon";
import PublicIcon from "./PublicIcon";
import PublicPriceNumber from "./PublicPriceNumber";
import CountryDataDisclosure from "./CountryDataDisclosure";
import { PublicComparisonBar, PublicSegments } from "./PublicControls";
import PublicCurrencySelect, { usePageDisplayRates, usePublicCurrency } from "./PublicCurrencySelect";

export default function CountryCanvasPricing({
  name,
  rows,
  rates,
  method,
  support,
  locale = "zh",
}: {
  name: string;
  rows: ReturnType<typeof countryCanvasRows>;
  rates: Record<string, number>;
  method: ReactNode;
  support: ReactNode;
  locale?: CanvasLocale;
}) {
  usePageDisplayRates(rates);
  const english = locale === "en";
  const copy = canvasUiCopy[locale];
  const intlLocale = canvasIntlLocale(locale);
  const defaultCurrency = canvasDefaultCurrency(locale, rates);
  const [preferred] = usePublicCurrency(defaultCurrency);
  const currency = rates[preferred] > 0 ? preferred : "USD";
  const rate = rates[currency] ?? 1;
  const [filter, setFilter] = useState("all");
  const inner = useRef<HTMLDivElement>(null);
  const outer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!inner.current || !outer.current) return;
    const observer = new ResizeObserver(() =>
      outer.current?.style.setProperty(
        "--gs-country-list-height",
        `${inner.current!.getBoundingClientRect().height}px`,
      ),
    );
    observer.observe(inner.current);
    return () => observer.disconnect();
  }, []);

  const price = (usd: number) => (
    <PublicPriceNumber
      value={usd * rate}
      currency={currency}
      locale={intlLocale}
      cycle="monthly"
      changeKey={currency}
    />
  );

  return (
    <>
      <section className="gs-country-pricing" aria-labelledby="country-prices-title">
        <div className="gs-country-table-tools">
          <div>
            <h2 id="country-prices-title">
              {english ? `Subscription Prices in ${name}` : `${name}的订阅价格`}
            </h2>
            <p>
              {english
                ? "Sorted by savings vs US · Monthly · App Store"
                : "按比美国低多少排序 · 每月 · App Store"}
            </p>
          </div>
          <div>
            <PublicCurrencySelect displayCurrency={currency} locale={locale} />
            <PublicSegments
              label={english ? "Subscription category" : "订阅分类"}
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: copy.common.all },
                { value: "ai", label: copy.common.ai },
                { value: "streaming", label: copy.common.streaming },
              ]}
            />
          </div>
        </div>
        {currency !== preferred && (
          <p role="status">{copy.common.fxFallbackStatus(preferred)}</p>
        )}
        <div className="gs-country-table">
          <div className="gs-country-columns" aria-hidden="true">
            <span>{english ? "Subscription" : "订阅"}</span>
            <span>{english ? "Local price" : "本地标价"}</span>
            <span>{english ? "Converted" : "折合"}</span>
            <span>{english ? "US" : "美国"}</span>
            <span>{english ? "vs US" : "和美国比"}</span>
          </div>
          <div ref={outer} className="gs-country-list-viewport">
            <div ref={inner}>
              {rows.map((row, index) => {
                const path = `/${locale}/${row.category === "ai" ? "ai-pricing" : "streaming-pricing"}/${row.productSlug}/${row.planSlug}`;
                const tone =
                  row.saving === null || row.saving === 0
                    ? "baseline"
                    : row.saving > 0
                      ? "low"
                      : "high";
                const diffAria =
                  row.saving !== null
                    ? english
                      ? row.saving === 0
                        ? "Same as US"
                        : `${savingsPercent(row.saving)}% ${row.saving > 0 ? "cheaper" : "higher"} than US`
                      : savingsLabel(row.saving)
                    : "";
                return (
                  <article
                    id={
                      rows.find((item) => item.category === row.category) === row
                        ? `${row.category}-plans`
                        : undefined
                    }
                    key={`${row.productSlug}:${row.planSlug}`}
                    className="gs-country-item"
                    hidden={filter !== "all" && filter !== row.category}
                    data-category={row.category}
                  >
                    <Link
                      href={path}
                      prefetch={false}
                      className="gs-country-row"
                      data-gs-enter={filter === "ai" ? "b" : "a"}
                      style={{ "--gs-stagger": `calc(${index} * var(--gs-motion-stagger))` } as CSSProperties}
                    >
                      <span className="gs-country-product">
                        <BrandIcon
                          product={{ slug: row.productSlug, name: row.productName }}
                          size="sm"
                          decorative
                          defer={index > 1}
                          fetchPriority="low"
                        />
                        <span>
                          <strong>
                            {row.productName} {row.planName.replace(row.productName, "").trim()}
                          </strong>
                          <small>{row.category === "ai" ? copy.common.ai : copy.common.streaming}</small>
                        </span>
                      </span>
                      <span className="gs-country-local">
                        {formatPublicPrice(row.amount, row.currency, intlLocale)}
                      </span>
                      <span className="gs-country-price" data-tone={tone}>
                        {row.usd !== null ? (
                          price(row.usd)
                        ) : (
                          <small>{english ? "FX pending" : "汇率待更新"}</small>
                        )}
                      </span>
                      <span className="gs-country-us">
                        {row.usPrice !== null ? (
                          price(row.usPrice)
                        ) : (
                          <small>{english ? "No US baseline" : "美国基准缺失"}</small>
                        )}
                      </span>
                      <div className="gs-country-saving">
                        {row.saving !== null ? (
                          <>
                            <PublicComparisonBar
                              label={diffAria}
                              value={Math.abs(row.saving)}
                              maximum={1}
                              tone={tone}
                              hideValue
                            />
                            <span data-tone={tone} aria-label={diffAria}>
                              {row.saving === 0
                                ? english
                                  ? "Same"
                                  : "相同"
                                : `${row.saving > 0 ? "−" : "+"}${savingsPercent(row.saving)}%`}
                            </span>
                          </>
                        ) : (
                          <small>
                            {english ? "No same-plan US baseline" : "暂无有效美国同套餐比较"}
                          </small>
                        )}
                      </div>
                    </Link>
                  </article>
                );
              })}
              {!rows.some((row) => filter === "all" || row.category === filter) && (
                <p className="gs-country-empty" role="status">
                  {english ? "No eligible plans in this category" : "当前分类没有符合条件的套餐"}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
      {support}
      <CountryDataDisclosure locale={locale}>
        {method}
        <h3 className="gs-country-source-title">
          {english ? "Price Sources & Snapshots" : "价格来源与记录"}
        </h3>
        {rows.map((row) => (
          <div className="gs-country-source-row" key={`${row.productSlug}:${row.planSlug}`}>
            <strong>
              {row.productName} {row.planName.replace(row.productName, "").trim()}
            </strong>
            <span>
              {english ? "Collected " : "价格采集 "}
              {row.checkedAtText}
              {row.fxText !== null && (
                <>
                  {" "}
                  · {english ? "FX " : "汇率基准 "}
                  {row.fxText}
                </>
              )}
            </span>
            <Link
              href={`/${locale}/${row.category === "ai" ? "ai-pricing" : "streaming-pricing"}/${row.productSlug}/${row.planSlug}`}
            >
              {english ? "Compare all regions" : "比较所有地区"}
              <PublicIcon name="ArrowRight" size={16} />
            </Link>
            {row.observationId ? (
              <Link href={`/${locale}/price-records/${row.observationId}`}>
                {english ? "Original snapshot" : "原始快照"}
              </Link>
            ) : (
              <a href={row.sourceUrl} rel="noreferrer" target="_blank">
                {english ? "Official source" : "官方来源"}
                <PublicIcon name="ExternalLink" size={16} />
              </a>
            )}
            <Link href={`/${locale}/price-history/${row.productSlug}`}>
              {english ? "Price history" : "价格历史"}
            </Link>
          </div>
        ))}
        <nav className="gs-country-category-links" aria-label={english ? "Plan categories" : "套餐分类"}>
          {(["ai", "streaming"] as const)
            .filter((category) => rows.some((row) => row.category === category))
            .map((category) => (
              <a key={category} href={`#${category}-plans`} onClick={() => setFilter(category)}>
                {category === "ai"
                  ? english
                    ? "AI Subscriptions"
                    : "AI 订阅"
                  : english
                    ? "Streaming"
                    : "流媒体订阅"}{" "}
                {rows.filter((row) => row.category === category).length}
              </a>
            ))}
        </nav>
      </CountryDataDisclosure>
    </>
  );
}
