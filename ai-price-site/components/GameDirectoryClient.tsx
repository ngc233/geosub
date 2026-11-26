"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import BrandIcon from "./BrandIcon";
import HomepageCountryFlag from "./HomepageCountryFlag";
import PublicCurrencySelect, {
  usePageDisplayRates,
  usePublicCurrency,
} from "./PublicCurrencySelect";
import { PublicSegments } from "./PublicControls";
import PublicIcon from "./PublicIcon";
import PublicPriceNumber from "./PublicPriceNumber";
import { getGameMarketName, getGameMarketStoreTag } from "../lib/game-catalog-meta";
import { localMoney, names } from "../lib/game-offers";
import type { GameCatalogItem, GameCatalogVariantRow } from "../lib/read-game-offers";

type PlatformFilter = "all" | "ps5" | "xbox";

function VariantRows({
  game,
  variants,
  currency,
  rate,
}: {
  game: GameCatalogItem;
  variants: GameCatalogVariantRow[];
  currency: string;
  rate: number;
}) {
  return (
    <div className="gs-game-matrix-wrap">
      <table className="gs-game-matrix-table" aria-label={`${game.meta.title} 各版本价格`}>
        <thead>
          <tr>
            <th scope="col">平台 / 版本</th>
            <th scope="col">最低区服</th>
            <th scope="col">折合价</th>
            <th scope="col" className="gs-game-col-local">
              当地标价 / 美服
            </th>
            <th scope="col">相比美服</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((variant) => {
            const href = `/zh/games/${game.slug}?platform=${variant.platform}&edition=${variant.edition}`;
            const hasLowest = Boolean(variant.lowestMarket && variant.lowestLocalPrice);
            const savingText =
              variant.savingPercent !== null
                ? `低 ${variant.savingPercent}%`
                : variant.savingRatio === 0
                  ? "与美服同价"
                  : variant.usPrice
                    ? "基准"
                    : "待核验";

            return (
              <tr key={`${variant.platform}:${variant.edition}`} className="gs-game-matrix-row">
                <td className="gs-game-cell-version">
                  <Link href={href} className="gs-game-row-link" prefetch={false}>
                    <strong>{names[variant.platform]}</strong>
                    <span>{names[variant.edition]}</span>
                  </Link>
                </td>
                <td className="gs-game-cell-region">
                  {hasLowest && variant.lowestMarket ? (
                    <span className="gs-game-region-chip">
                      <HomepageCountryFlag code={variant.lowestMarket} />
                      <span>{getGameMarketName(variant.lowestMarket)}</span>
                      <small>{getGameMarketStoreTag(variant.lowestMarket)}</small>
                    </span>
                  ) : (
                    <span className="gs-game-muted">待核验</span>
                  )}
                </td>
                <td className="gs-game-cell-converted">
                  {variant.lowestUsd !== null ? (
                    <span
                      className="gs-game-converted-val"
                      data-tone={variant.savingPercent !== null ? "low" : undefined}
                    >
                      <PublicPriceNumber
                        value={variant.lowestUsd * rate}
                        currency={currency}
                        changeKey={currency}
                      />
                    </span>
                  ) : (
                    <span className="gs-game-muted">—</span>
                  )}
                </td>
                <td className="gs-game-cell-local gs-game-col-local">
                  {hasLowest && variant.lowestCurrency && variant.lowestLocalPrice ? (
                    <div className="gs-game-local-pair">
                      <span>{localMoney(variant.lowestCurrency, variant.lowestLocalPrice)}</span>
                      <small>
                        {variant.usPrice ? `美服 ${localMoney("USD", variant.usPrice)}` : "美服待核验"}
                      </small>
                    </div>
                  ) : (
                    <span className="gs-game-muted">待核验</span>
                  )}
                </td>
                <td className="gs-game-cell-diff">
                  <span className="gs-game-diff-wrap">
                    <span
                      className="gs-game-diff-pill"
                      data-tone={
                        variant.savingPercent !== null
                          ? "low"
                          : variant.savingRatio !== null && variant.savingRatio < 0
                            ? "high"
                            : "muted"
                      }
                    >
                      {savingText}
                    </span>
                    <PublicIcon name="ArrowRight" size={16} className="gs-game-row-arrow" />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function GameDirectoryClient({
  games,
  rates,
}: {
  games: GameCatalogItem[];
  rates: Record<string, number>;
}) {
  usePageDisplayRates(rates);
  const defaultCurrency = rates.CNY > 0 ? "CNY" : "USD";
  const [preferred] = usePublicCurrency(defaultCurrency);
  const currency = rates[preferred] > 0 ? preferred : "USD";
  const rate = rates[currency] ?? 1;
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");

  const allMarkets = new Set(games.flatMap((game) => game.marketCodes));
  const useFeaturedLayout = games.length <= 2;

  return (
    <>
      <div className="gs-listing-toprow">
        <div className="gs-listing-intro">
          <p className="gs-listing-eyebrow">官方数字商店买断比价</p>
          <h1>游戏比价</h1>
          <p>
            对比 PS5 与 Xbox 数字版游戏在各区官方商店的公开买断价格，同平台、同版本按实时汇率折算。
          </p>
        </div>
        <div className="gs-listing-controls gs-game-directory-controls">
          <PublicSegments
            label="游戏平台筛选"
            value={platformFilter}
            onChange={(value) => setPlatformFilter(value as PlatformFilter)}
            options={[
              { value: "all", label: "全部平台" },
              { value: "ps5", label: "PS5" },
              { value: "xbox", label: "Xbox" },
            ]}
          />
          <PublicCurrencySelect displayCurrency={currency} />
        </div>
      </div>

      <div className="gs-listing-sectionhead">
        <div>
          <h2>已收录游戏</h2>
          <p>点击任意平台版本行或详情入口，可查看各区服完整标价、税费说明与核价记录。</p>
        </div>
        <span className="gs-listing-count">
          {games.length} 款游戏 · {Math.max(allMarkets.size, 2)} 个官方商店区服
        </span>
      </div>

      {useFeaturedLayout ? (
        <div className="gs-game-featured-list">
          {games.map((game) => {
            const visibleVariants = game.variants.filter(
              (v) => platformFilter === "all" || v.platform === platformFilter,
            );
            const bestForFilter =
              visibleVariants
                .filter((v) => v.lowestUsd !== null)
                .sort((a, b) => (a.lowestUsd ?? Infinity) - (b.lowestUsd ?? Infinity))[0] ??
              game.bestVariant;
            const detailHref =
              platformFilter === "all"
                ? `/zh/games/${game.slug}`
                : `/zh/games/${game.slug}?platform=${platformFilter}`;

            return (
              <article
                key={game.id}
                className="gs-game-featured-card"
                aria-labelledby={`game-title-${game.slug}`}
              >
                <div className="gs-game-featured-info">
                  <div className="gs-game-featured-identity">
                    <Link
                      href={detailHref}
                      className="gs-game-cover-link"
                      prefetch={false}
                      aria-label={`查看 ${game.meta.title} 地区比价`}
                    >
                      {game.meta.coverSrc ? (
                        <Image
                          unoptimized
                          src={game.meta.coverSrc}
                          alt={game.meta.coverAlt}
                          width={96}
                          height={140}
                          className="gs-game-directory-cover"
                        />
                      ) : (
                        <BrandIcon
                          product={{ slug: game.slug, name: game.meta.title }}
                          className="gs-game-directory-brand"
                          decorative
                        />
                      )}
                    </Link>
                    <div className="gs-game-featured-titles">
                      <div className="gs-game-title-badges">
                        <span className="gs-listing-plan">PS5 / Xbox</span>
                        {game.meta.unannouncedPlatforms.pc && (
                          <span className="gs-game-muted-badge">PC 待官宣</span>
                        )}
                      </div>
                      <h3 id={`game-title-${game.slug}`}>
                        <Link href={detailHref} prefetch={false}>
                          {game.meta.title}
                        </Link>
                      </h3>
                      {game.meta.englishTitle && (
                        <p className="gs-game-english-sub" lang="en">
                          {game.meta.englishTitle}
                        </p>
                      )}
                      <p className="gs-game-meta-line">
                        {game.meta.publisher}
                        {game.meta.releaseLabel ? ` · ${game.meta.releaseLabel}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="gs-game-featured-callout">
                    {bestForFilter && bestForFilter.lowestUsd !== null && bestForFilter.lowestMarket ? (
                      <>
                        <div className="gs-game-callout-top">
                          <span className="gs-game-callout-label">
                            <HomepageCountryFlag code={bestForFilter.lowestMarket} />
                            {getGameMarketStoreTag(bestForFilter.lowestMarket)}最低 ·{" "}
                            {names[bestForFilter.platform]} {names[bestForFilter.edition]}
                          </span>
                          {game.bestSavingPercent !== null && (
                            <span className="gs-game-diff-pill" data-tone="low">
                              比美服最多低 {game.bestSavingPercent}%
                            </span>
                          )}
                        </div>
                        <div className="gs-game-callout-price">
                          <strong>
                            <PublicPriceNumber
                              value={bestForFilter.lowestUsd * rate}
                              currency={currency}
                              changeKey={`${currency}:${bestForFilter.platform}:${bestForFilter.edition}`}
                              countIn
                            />
                          </strong>
                          {bestForFilter.lowestCurrency && bestForFilter.lowestLocalPrice && (
                            <small>
                              当地标价{" "}
                              {localMoney(bestForFilter.lowestCurrency, bestForFilter.lowestLocalPrice)}
                            </small>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="gs-game-muted">官方商店报价核验中，点击查看各区商品页。</p>
                    )}
                    <Link href={detailHref} className="gs-game-detail-cta" prefetch={false}>
                      <span>查看全部区服与版本对照</span>
                      <PublicIcon name="ArrowRight" size={16} />
                    </Link>
                  </div>
                </div>

                <div className="gs-game-featured-matrix">
                  <VariantRows
                    game={game}
                    variants={visibleVariants}
                    currency={currency}
                    rate={rate}
                  />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="gs-listing-grid">
          {games.map((game) => {
            const visibleVariants = game.variants.filter(
              (v) => platformFilter === "all" || v.platform === platformFilter,
            );
            const detailHref =
              platformFilter === "all"
                ? `/zh/games/${game.slug}`
                : `/zh/games/${game.slug}?platform=${platformFilter}`;

            return (
              <article
                key={game.id}
                className="gs-listing-card gs-game-grid-card"
                aria-labelledby={`game-title-${game.slug}`}
              >
                <header className="gs-listing-card-head">
                  <div className="gs-listing-brandline gs-listing-brandline-compact">
                    <BrandIcon
                      product={{ slug: game.slug, name: game.meta.title }}
                      className="gs-listing-brand"
                      decorative
                    />
                    <div className="gs-listing-description-wrap">
                      <div className="gs-listing-card-headline gs-listing-card-headline-compact">
                        <div className="gs-listing-card-titlegroup">
                          <div className="gs-listing-card-name">
                            <h3 id={`game-title-${game.slug}`}>
                              <Link href={detailHref} prefetch={false}>
                                {game.meta.title}
                              </Link>
                            </h3>
                            <span className="gs-listing-plan">{game.meta.publisher}</span>
                          </div>
                          {game.meta.englishTitle && (
                            <p className="gs-listing-plan-meta" lang="en">
                              {game.meta.englishTitle}
                            </p>
                          )}
                        </div>
                        {game.bestSavingPercent !== null && (
                          <span className="gs-game-diff-pill" data-tone="low">
                            低 {game.bestSavingPercent}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </header>
                <VariantRows
                  game={game}
                  variants={visibleVariants}
                  currency={currency}
                  rate={rate}
                />
                <div className="gs-listing-card-foot">
                  <span className="gs-listing-updated">同平台、同版本按汇率折算</span>
                  <Link href={detailHref} className="gs-listing-detail" prefetch={false}>
                    查看各区详情 <PublicIcon name="ArrowRight" size={16} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
