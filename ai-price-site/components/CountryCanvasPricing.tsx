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

const countryPricingCopy: Record<
  CanvasLocale,
  {
    heading: (name: string) => string;
    subheading: string;
    categoryLabel: string;
    cols: [string, string, string, string, string];
    fxPending: string;
    noUsBaseline: string;
    sameShort: string;
    noSamePlanUs: string;
    emptyCategory: string;
    sourcesTitle: string;
    collectedPrefix: string;
    fxPrefix: string;
    compareAllRegions: string;
    originalSnapshot: string;
    officialSource: string;
    priceHistory: string;
    planCategoriesAria: string;
    categoryLinkLabel: (category: "ai" | "streaming") => string;
  }
> = {
  zh: {
    heading: (name) => `${name}的订阅价格`,
    subheading: "按比美国低多少排序 · 每月 · App Store",
    categoryLabel: "订阅分类",
    cols: ["订阅", "本地标价", "折合", "美国", "和美国比"],
    fxPending: "汇率待更新",
    noUsBaseline: "美国基准缺失",
    sameShort: "相同",
    noSamePlanUs: "暂无有效美国同套餐比较",
    emptyCategory: "当前分类没有符合条件的套餐",
    sourcesTitle: "价格来源与记录",
    collectedPrefix: "价格采集 ",
    fxPrefix: "汇率基准 ",
    compareAllRegions: "比较所有地区",
    originalSnapshot: "原始快照",
    officialSource: "官方来源",
    priceHistory: "价格历史",
    planCategoriesAria: "套餐分类",
    categoryLinkLabel: (cat) => (cat === "ai" ? "AI 订阅" : "流媒体订阅"),
  },
  "zh-tw": {
    heading: (name) => `${name}的訂閱價格`,
    subheading: "按比美國低多少排序 · 每月 · App Store",
    categoryLabel: "訂閱分類",
    cols: ["訂閱", "當地標價", "折合", "美國", "和美國比"],
    fxPending: "匯率待更新",
    noUsBaseline: "缺少美國基準",
    sameShort: "相同",
    noSamePlanUs: "暫無有效美國同方案比較",
    emptyCategory: "目前分類沒有符合條件的方案",
    sourcesTitle: "價格來源與紀錄",
    collectedPrefix: "價格採集 ",
    fxPrefix: "匯率基準 ",
    compareAllRegions: "比較所有地區",
    originalSnapshot: "原始快照",
    officialSource: "官方來源",
    priceHistory: "價格歷史",
    planCategoriesAria: "方案分類",
    categoryLinkLabel: (cat) => (cat === "ai" ? "AI 訂閱" : "串流媒體訂閱"),
  },
  en: {
    heading: (name) => `Subscription Prices in ${name}`,
    subheading: "Sorted by savings vs US · Monthly · App Store",
    categoryLabel: "Subscription category",
    cols: ["Subscription", "Local price", "Converted", "US", "vs US"],
    fxPending: "FX pending",
    noUsBaseline: "No US baseline",
    sameShort: "Same",
    noSamePlanUs: "No same-plan US baseline",
    emptyCategory: "No eligible plans in this category",
    sourcesTitle: "Price Sources & Snapshots",
    collectedPrefix: "Collected ",
    fxPrefix: "FX ",
    compareAllRegions: "Compare all regions",
    originalSnapshot: "Original snapshot",
    officialSource: "Official source",
    priceHistory: "Price history",
    planCategoriesAria: "Plan categories",
    categoryLinkLabel: (cat) => (cat === "ai" ? "AI Subscriptions" : "Streaming"),
  },
  ja: {
    heading: (name) => `${name}のサブスクリプション価格`,
    subheading: "米国基準との節約率順 · 月額 · App Store",
    categoryLabel: "カテゴリー",
    cols: ["サービス", "現地価格", "換算価格", "米国", "米国比"],
    fxPending: "為替更新待ち",
    noUsBaseline: "米国基準なし",
    sameShort: "同額",
    noSamePlanUs: "米国の同一プラン基準なし",
    emptyCategory: "このカテゴリーには該当プランがありません",
    sourcesTitle: "価格の出典とスナップショット",
    collectedPrefix: "取得日 ",
    fxPrefix: "為替基準 ",
    compareAllRegions: "すべての地域を比較",
    originalSnapshot: "元スナップショット",
    officialSource: "公式ストア",
    priceHistory: "価格履歴",
    planCategoriesAria: "プランカテゴリー",
    categoryLinkLabel: (cat) => (cat === "ai" ? "AI サブスク" : "動画配信"),
  },
  ko: {
    heading: (name) => `${name} 구독 가격`,
    subheading: "미국 대비 절약률 순 · 월간 · App Store",
    categoryLabel: "구독 카테고리",
    cols: ["서비스", "현지 정가", "환산가", "미국", "미국 대비"],
    fxPending: "환율 대기 중",
    noUsBaseline: "미국 기준 없음",
    sameShort: "동일",
    noSamePlanUs: "미국 동일 요금제 기준 없음",
    emptyCategory: "이 카테고리에 해당하는 요금제가 없습니다",
    sourcesTitle: "가격 출처 및 스냅샷",
    collectedPrefix: "수집일 ",
    fxPrefix: "환율 기준 ",
    compareAllRegions: "모든 지역 비교",
    originalSnapshot: "원본 스냅샷",
    officialSource: "공식 스토어",
    priceHistory: "가격 변동 기록",
    planCategoriesAria: "요금제 카테고리",
    categoryLinkLabel: (cat) => (cat === "ai" ? "AI 구독" : "스트리밍"),
  },
  es: {
    heading: (name) => `Precios de Suscripciones en ${name}`,
    subheading: "Ordenado por ahorro frente a EE. UU. · Mensual · App Store",
    categoryLabel: "Categoría de suscripción",
    cols: ["Suscripción", "Precio local", "Convertido", "EE. UU.", "vs EE. UU."],
    fxPending: "FX pendiente",
    noUsBaseline: "Sin base EE. UU.",
    sameShort: "Igual",
    noSamePlanUs: "Sin mismo plan en EE. UU.",
    emptyCategory: "No hay planes elegibles en esta categoría",
    sourcesTitle: "Fuentes y Capturas de Precios",
    collectedPrefix: "Capturado ",
    fxPrefix: "Cambio ",
    compareAllRegions: "Comparar todas las regiones",
    originalSnapshot: "Captura original",
    officialSource: "Fuente oficial",
    priceHistory: "Historial de precios",
    planCategoriesAria: "Categorías de planes",
    categoryLinkLabel: (cat) => (cat === "ai" ? "Suscripciones IA" : "Streaming"),
  },
};

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
  const copy = canvasUiCopy[locale];
  const localCopy = countryPricingCopy[locale];
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
            <h2 id="country-prices-title">{localCopy.heading(name)}</h2>
            <p>{localCopy.subheading}</p>
          </div>
          <div>
            <PublicCurrencySelect displayCurrency={currency} locale={locale} />
            <PublicSegments
              label={localCopy.categoryLabel}
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
            {localCopy.cols.map((col) => (
              <span key={col}>{col}</span>
            ))}
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
                const diffAria = row.saving !== null ? savingsLabel(row.saving, locale) : "";
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
                        {row.usd !== null ? price(row.usd) : <small>{localCopy.fxPending}</small>}
                      </span>
                      <span className="gs-country-us">
                        {row.usPrice !== null ? (
                          price(row.usPrice)
                        ) : (
                          <small>{localCopy.noUsBaseline}</small>
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
                                ? localCopy.sameShort
                                : `${row.saving > 0 ? "−" : "+"}${savingsPercent(row.saving)}%`}
                            </span>
                          </>
                        ) : (
                          <small>{localCopy.noSamePlanUs}</small>
                        )}
                      </div>
                    </Link>
                  </article>
                );
              })}
              {!rows.some((row) => filter === "all" || row.category === filter) && (
                <p className="gs-country-empty" role="status">
                  {localCopy.emptyCategory}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
      {support}
      <CountryDataDisclosure locale={locale}>
        {method}
        <h3 className="gs-country-source-title">{localCopy.sourcesTitle}</h3>
        {rows.map((row) => (
          <div className="gs-country-source-row" key={`${row.productSlug}:${row.planSlug}`}>
            <strong>
              {row.productName} {row.planName.replace(row.productName, "").trim()}
            </strong>
            <span>
              {localCopy.collectedPrefix}
              {row.checkedAtText}
              {row.fxText !== null && (
                <>
                  {" "}
                  · {localCopy.fxPrefix}
                  {row.fxText}
                </>
              )}
            </span>
            <Link
              href={`/${locale}/${row.category === "ai" ? "ai-pricing" : "streaming-pricing"}/${row.productSlug}/${row.planSlug}`}
            >
              {localCopy.compareAllRegions}
              <PublicIcon name="ArrowRight" size={16} />
            </Link>
            {row.observationId ? (
              <Link href={`/${locale}/price-records/${row.observationId}`}>
                {localCopy.originalSnapshot}
              </Link>
            ) : (
              <a href={row.sourceUrl} rel="noreferrer" target="_blank">
                {localCopy.officialSource}
                <PublicIcon name="ExternalLink" size={16} />
              </a>
            )}
            <Link href={`/${locale}/price-history/${row.productSlug}`}>{localCopy.priceHistory}</Link>
          </div>
        ))}
        <nav className="gs-country-category-links" aria-label={localCopy.planCategoriesAria}>
          {(["ai", "streaming"] as const)
            .filter((category) => rows.some((row) => row.category === category))
            .map((category) => (
              <a key={category} href={`#${category}-plans`} onClick={() => setFilter(category)}>
                {localCopy.categoryLinkLabel(category)}{" "}
                {rows.filter((row) => row.category === category).length}
              </a>
            ))}
        </nav>
      </CountryDataDisclosure>
    </>
  );
}
