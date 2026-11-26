"use client";
import Link from "next/link";
import { useCallback, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { HomepageRepresentative } from "../lib/homepage-summary";
import type { HomepageGameSavings } from "../lib/homepage-game-savings";
import { names as gameNames } from "../lib/game-offers.ts";
import { savingsPercent } from "../lib/homepage-display";
import { getLocalizedRegionName } from "../lib/locale-format.ts";
import {
  canvasDefaultCurrency,
  canvasIntlLocale,
  canvasUiCopy,
  type CanvasLocale,
} from "../lib/canvas-ui-copy.ts";
import PublicCurrencySelect, { usePublicCurrency, usePageDisplayRates } from "./PublicCurrencySelect";
import { PublicSegments, PublicComparisonBar, PublicExpandButton } from "./PublicControls";
import PublicPriceNumber from "./PublicPriceNumber";
import PublicIcon from "./PublicIcon";
import HomepageProductMark from "./HomepageProductMark";
import HomepageCountryFlag from "./HomepageCountryFlag";
import HomepageMap from "./HomepageMap";

const rankingPageSize = 6;

export default function HomepagePricing({
  products,
  rates,
  map,
  recentChanges,
  gameCategoryHref,
  gameSavings,
  locale = "zh",
}: {
  recentChanges?: ReactNode;
  gameCategoryHref?: string;
  gameSavings?: HomepageGameSavings | null;
  products: HomepageRepresentative[];
  rates: Record<string, number>;
  map: { land: string; points: Record<string, number[]> };
  locale?: CanvasLocale;
}) {
  usePageDisplayRates(rates);
  const copy = canvasUiCopy[locale];
  const intlLocale = canvasIntlLocale(locale);
  const defaultCurrency = canvasDefaultCurrency(locale, rates);
  const [preferred] = usePublicCurrency(defaultCurrency);
  const [category, setCategory] = useState("all");
  const rankingId = useId();
  const [visibleCount, setVisibleCount] = useState(rankingPageSize);
  const ranking = useRef<HTMLDivElement>(null);
  const nextFocus = useRef<number | null>(null);
  const rankingViewport = useRef<HTMLDivElement>(null);

  const finishRankingResize = useCallback(() => {
    if (rankingViewport.current) delete rankingViewport.current.dataset.heightChanging;
    if (nextFocus.current === null) return;
    ranking.current
      ?.querySelectorAll<HTMLAnchorElement>(".gs-home-ranking-link")
      [nextFocus.current]?.focus({ preventScroll: true });
    nextFocus.current = null;
  }, []);

  useLayoutEffect(() => {
    const viewport = rankingViewport.current;
    const content = ranking.current;
    if (!viewport || !content) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    viewport.style.setProperty("--gs-ranking-height", `${content.getBoundingClientRect().height}px`);
    const update = () => {
      const height = content.getBoundingClientRect().height;
      const moving = !reduced.matches && Math.abs(viewport.getBoundingClientRect().height - height) > 0.5;
      if (moving) viewport.dataset.heightChanging = "true";
      viewport.style.setProperty("--gs-ranking-height", `${height}px`);
      if (!moving) finishRankingResize();
    };
    const observer = new ResizeObserver(update);
    observer.observe(content);
    const preference = () => {
      if (reduced.matches) finishRankingResize();
    };
    reduced.addEventListener("change", preference);
    return () => {
      observer.disconnect();
      reduced.removeEventListener("change", preference);
    };
  }, [products.length, finishRankingResize]);

  const chooseCategory = (value: string) => {
    nextFocus.current = null;
    setCategory(value);
    setVisibleCount(rankingPageSize);
  };
  const currency = rates[preferred] > 0 ? preferred : "USD";
  const rate = rates[currency] ?? 1;
  const ranked = [...products].sort((a, b) => b.saving - a.saving || a.slug.localeCompare(b.slug));
  const rows = ranked.filter((row) => category === "all" || row.category === category);
  if (!products.length && !gameCategoryHref) {
    return recentChanges ? <div className="gs-home-section">{recentChanges}</div> : null;
  }

  return (
    <>
      {products.length > 0 && (
        <>
          <section data-gs-enter="a" className="gs-home-map-panel" aria-label={copy.home.mapRegionAria}>
            {currency !== preferred && (
              <p role="status">{copy.common.fxFallbackStatus(preferred)}</p>
            )}
            <HomepageMap
              products={products}
              map={map}
              currency={currency}
              rate={rate}
              locale={locale}
              controls={<PublicCurrencySelect displayCurrency={currency} locale={locale} />}
            />
          </section>
          <section data-gs-enter="a" className="gs-home-section" aria-labelledby="home-ranking">
            <div className="gs-home-section-heading">
              <div>
                <h2 id="home-ranking">{copy.home.rankingHeading}</h2>
                <p>{copy.home.rankingDesc}</p>
              </div>
              <PublicSegments
                label={copy.home.rankingSegmentLabel}
                options={[
                  { value: "all", label: copy.common.all },
                  { value: "ai", label: copy.common.ai },
                  { value: "streaming", label: copy.common.streaming },
                ]}
                value={category}
                onChange={chooseCategory}
              />
            </div>
            <div className="gs-home-ranking">
              <div className="gs-home-ranking-head" aria-hidden="true">
                {copy.home.rankingCols.map((col) => (
                  <span key={col}>{col}</span>
                ))}
              </div>
              <div
                ref={rankingViewport}
                className="gs-home-ranking-viewport"
                onTransitionEnd={(event) => {
                  if (event.target === event.currentTarget && event.propertyName === "height") {
                    finishRankingResize();
                  }
                }}
              >
                <div ref={ranking} id={rankingId} role="list" aria-label={copy.home.rankingListAria}>
                  {rows.map((product, index) => (
                    <div
                      key={product.slug}
                      role="listitem"
                      className="gs-home-ranking-row"
                      hidden={index >= visibleCount}
                      data-gs-motion-row
                    >
                      <span className="gs-home-rank">{index + 1}</span>
                      <Link className="gs-home-product-name gs-home-ranking-link" href={product.href}>
                        <HomepageProductMark product={product} className="gs-home-ranking-mark" />
                        <span>
                          <strong>{product.name}</strong>
                          {product.plan.toLowerCase() !== product.name.toLowerCase() && (
                            <small>{product.plan}</small>
                          )}
                        </span>
                      </Link>
                      <div className="gs-home-region-price">
                        <span className="gs-home-country-name">
                          <HomepageCountryFlag code={product.lowest.code} />
                          {getLocalizedRegionName(product.lowest.code, locale) ?? product.lowest.code}
                        </span>
                        <span className="gs-home-row-price">
                          <PublicPriceNumber
                            value={product.lowest.usd * rate}
                            currency={currency}
                            locale={intlLocale}
                            cycle="monthly"
                            changeKey={currency}
                          />
                        </span>
                      </div>
                      <PublicComparisonBar
                        hideValue
                        label={`${savingsPercent(product.saving)}%`}
                        value={savingsPercent(product.saving)}
                        maximum={100}
                        tone={product.saving > 0 ? "low" : "baseline"}
                      />
                    </div>
                  ))}
                  {!rows.length && (
                    <p>
                      {copy.home.rankingEmpty}{" "}
                      <button data-gs-ui="button" onClick={() => chooseCategory("all")}>
                        {copy.home.rankingViewAll}
                      </button>
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="gs-home-ranking-more" data-has-more={rows.length > visibleCount}>
              {rows.length > visibleCount && (
                <PublicExpandButton
                  label={copy.home.loadMore}
                  hint={copy.home.loadMoreHint(rows.length - visibleCount)}
                  controls={rankingId}
                  onClick={() => {
                    nextFocus.current = visibleCount;
                    setVisibleCount((count) => Math.min(count + rankingPageSize, rows.length));
                  }}
                />
              )}
              <span role="status" className="gs-sr-only">
                {copy.home.loadMoreStatus(Math.min(visibleCount, rows.length), rows.length)}
              </span>
            </div>
          </section>
        </>
      )}
      <section data-gs-enter="a" className="gs-home-section gs-home-discovery" aria-labelledby="home-categories">
        <div className="gs-home-category-panel">
          <h2 id="home-categories">{copy.home.categoriesHeading}</h2>
          <div className="gs-home-categories">
            {(["ai", "streaming"] as const).map((kind) => {
              const items = ranked.filter((p) => p.category === kind);
              if (!items.length) return null;
              return (
                <article key={kind} className="gs-home-card" data-gs-motion-card>
                  <div className="gs-home-brand-stack gs-home-category-avatars">
                    {items.slice(0, 3).map((p) => (
                      <Link
                        key={p.slug}
                        className="gs-home-category-product-link"
                        href={p.href}
                        prefetch={false}
                        aria-label={p.planDisplayName}
                      >
                        <HomepageProductMark product={p} className="gs-home-category-avatar" />
                      </Link>
                    ))}
                    {items.length > 3 && <span className="gs-home-brand-more">+{items.length - 3}</span>}
                  </div>
                  <Link
                    className="gs-home-category-link"
                    href={`/${locale}/${kind === "ai" ? "ai-pricing" : "streaming-pricing"}/`}
                  >
                    <div className="gs-home-category-title">
                      <h3>{kind === "ai" ? copy.common.ai : copy.common.streaming}</h3>
                      <p>{copy.home.categoryProductsCount(items.length)}</p>
                    </div>
                    <p className="gs-home-category-saving">
                      {copy.home.categoryMaxSavingPrefix}
                      <strong>{savingsPercent(items[0].saving)}%</strong>
                      <span className="gs-sr-only"> · {items[0].planDisplayName}</span>
                    </p>
                    <span className="gs-home-category-action gs-sr-only">
                      {copy.home.categoryViewAll(kind)}
                      <PublicIcon name="ArrowRight" size={20} />
                    </span>
                  </Link>
                </article>
              );
            })}
            {gameCategoryHref && (
              <article className="gs-home-card gs-home-game-category" data-gs-motion-card>
                <div className="gs-home-brand-stack gs-home-category-avatars gs-home-game-avatars">
                  <HomepageProductMark product={{ slug: "gta-6", name: "GTA 6" }} className="gs-home-game-avatar" />
                </div>
                <Link href={gameCategoryHref} className="gs-home-category-link" prefetch={false}>
                  <div className="gs-home-category-title">
                    <h3>游戏</h3>
                    <p>GTA 6 · 官方买断</p>
                  </div>
                  {gameSavings && (
                    <div className="gs-home-game-saving-group">
                      <p className="gs-home-category-saving">
                        最多能省 <strong>{gameSavings.percent}%</strong>
                      </p>
                      <p className="gs-home-game-edition-hint">
                        {gameNames[gameSavings.platform]} {gameNames[gameSavings.edition]}
                      </p>
                    </div>
                  )}
                  <span className={gameSavings ? "gs-home-category-action gs-sr-only" : "gs-home-category-action"}>
                    查看游戏比价 <PublicIcon name="ArrowRight" size={16} />
                  </span>
                </Link>
              </article>
            )}
          </div>
        </div>
        {recentChanges ?? <div className="gs-home-recent-placeholder" aria-hidden="true" />}
      </section>
    </>
  );
}
