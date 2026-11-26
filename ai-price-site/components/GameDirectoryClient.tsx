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
import { getGameDirectoryCopy } from "./games/game-ui-copy";
import {
  canvasDefaultCurrency,
  canvasIntlLocale,
  resolveCanvasLocale,
  type CanvasLocale,
} from "../lib/canvas-ui-copy";
import { getDisplayCurrencyFractionDigits } from "../lib/display-currency";
import { getGameMarketName, getGameMarketStoreTag } from "../lib/game-catalog-meta";
import { getGameEditionLabel, localMoney, names } from "../lib/game-offers";
import type { GameCatalogItem, GameCatalogVariantRow } from "../lib/read-game-offers";

type PlatformFilter = "all" | "ps5" | "xbox";

function VariantRows({
  locale,
  game,
  variants,
  currency,
  rate,
  fractionDigits,
}: {
  locale: CanvasLocale;
  game: GameCatalogItem;
  variants: GameCatalogVariantRow[];
  currency: string;
  rate: number;
  fractionDigits: number;
}) {
  const copy = getGameDirectoryCopy(locale);
  const intlLocale = canvasIntlLocale(locale);

  return (
    <div className="gs-game-matrix-wrap">
      <table className="gs-game-matrix-table" aria-label={copy.matrixAriaLabel(game.meta.title)}>
        <thead>
          <tr>
            <th scope="col">{copy.matrixCols[0]}</th>
            <th scope="col">{copy.matrixCols[1]}</th>
            <th scope="col">{copy.matrixCols[2]}</th>
            <th scope="col" className="gs-game-col-local">
              {copy.matrixCols[3]}
            </th>
            <th scope="col">{copy.matrixCols[4]}</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((variant) => {
            const href = `/${locale}/games/${game.slug}?platform=${variant.platform}&edition=${variant.edition}`;
            const hasLowest = Boolean(variant.lowestMarket && variant.lowestLocalPrice);
            const editionLabel =
              game.meta.editions[variant.edition]?.label ??
              getGameEditionLabel(variant.edition, locale);
            const savingText =
              variant.savingPercent !== null
                ? copy.savingShort(variant.savingPercent)
                : variant.savingRatio === 0
                  ? copy.sameAsUsStore
                  : variant.usPrice
                    ? copy.baselineShort
                    : copy.pendingVerify;

            return (
              <tr key={`${variant.platform}:${variant.edition}`} className="gs-game-matrix-row">
                <td className="gs-game-cell-version">
                  <Link href={href} className="gs-game-row-link" prefetch={false}>
                    <strong>{names[variant.platform]}</strong>
                    <span>{editionLabel}</span>
                  </Link>
                </td>
                <td className="gs-game-cell-region">
                  {hasLowest && variant.lowestMarket ? (
                    <span className="gs-game-region-chip">
                      <HomepageCountryFlag code={variant.lowestMarket} />
                      <span>{getGameMarketName(variant.lowestMarket, locale)}</span>
                      <small>{getGameMarketStoreTag(variant.lowestMarket, locale)}</small>
                    </span>
                  ) : (
                    <span className="gs-game-muted">{copy.pendingVerify}</span>
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
                        locale={intlLocale}
                        fractionDigits={fractionDigits}
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
                        {variant.usPrice
                          ? copy.usStorePrice(localMoney("USD", variant.usPrice))
                          : copy.usStorePending}
                      </small>
                    </div>
                  ) : (
                    <span className="gs-game-muted">{copy.pendingVerify}</span>
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
  locale = "zh",
  games,
  rates,
}: {
  locale?: CanvasLocale;
  games: GameCatalogItem[];
  rates: Record<string, number>;
}) {
  const resolvedLocale = resolveCanvasLocale(locale);
  const copy = getGameDirectoryCopy(resolvedLocale);
  const intlLocale = canvasIntlLocale(resolvedLocale);

  usePageDisplayRates(rates);
  const defaultCurrency = canvasDefaultCurrency(resolvedLocale, rates);
  const [preferred] = usePublicCurrency(defaultCurrency);
  const currency = rates[preferred] > 0 ? preferred : "USD";
  const rate = rates[currency] ?? 1;
  const fractionDigits = getDisplayCurrencyFractionDigits(currency);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");

  const allMarkets = new Set(games.flatMap((game) => game.marketCodes));
  const useFeaturedLayout = games.length <= 2;

  return (
    <>
      <div className="gs-listing-toprow">
        <div className="gs-listing-intro">
          <p className="gs-listing-eyebrow">{copy.eyebrow}</p>
          <h1>{copy.heading}</h1>
          <p>{copy.intro}</p>
        </div>
        <div className="gs-listing-controls gs-game-directory-controls">
          <PublicSegments
            label={copy.platformFilterLabel}
            value={platformFilter}
            onChange={(value) => setPlatformFilter(value as PlatformFilter)}
            options={[
              { value: "all", label: copy.allPlatforms },
              { value: "ps5", label: "PS5" },
              { value: "xbox", label: "Xbox" },
            ]}
          />
          <PublicCurrencySelect locale={resolvedLocale} displayCurrency={currency} />
        </div>
      </div>

      <div className="gs-listing-sectionhead">
        <div>
          <h2>{copy.sectionHeading}</h2>
          <p>{copy.sectionDesc}</p>
        </div>
        <span className="gs-listing-count">
          {copy.countSummary(games.length, Math.max(allMarkets.size, 2))}
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
                ? `/${resolvedLocale}/games/${game.slug}`
                : `/${resolvedLocale}/games/${game.slug}?platform=${platformFilter}`;
            const bestEditionLabel = bestForFilter
              ? (game.meta.editions[bestForFilter.edition]?.label ??
                getGameEditionLabel(bestForFilter.edition, resolvedLocale))
              : "";

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
                      aria-label={copy.coverLinkAria(game.meta.title)}
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
                          <span className="gs-game-muted-badge">{copy.pcPendingBadge}</span>
                        )}
                      </div>
                      <h3 id={`game-title-${game.slug}`}>
                        <Link href={detailHref} prefetch={false}>
                          {game.meta.title}
                        </Link>
                      </h3>
                      {game.meta.englishTitle && game.meta.englishTitle !== game.meta.title && (
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
                            {copy.calloutLowestLabel(
                              getGameMarketStoreTag(bestForFilter.lowestMarket, resolvedLocale),
                              names[bestForFilter.platform],
                              bestEditionLabel,
                            )}
                          </span>
                          {game.bestSavingPercent !== null && (
                            <span className="gs-game-diff-pill" data-tone="low">
                              {copy.calloutMaxSaving(game.bestSavingPercent)}
                            </span>
                          )}
                        </div>
                        <div className="gs-game-callout-price">
                          <strong>
                            <PublicPriceNumber
                              value={bestForFilter.lowestUsd * rate}
                              currency={currency}
                              locale={intlLocale}
                              fractionDigits={fractionDigits}
                              changeKey={`${currency}:${bestForFilter.platform}:${bestForFilter.edition}`}
                              countIn
                            />
                          </strong>
                          {bestForFilter.lowestCurrency && bestForFilter.lowestLocalPrice && (
                            <small>
                              {copy.localPricePrefix}
                              {localMoney(bestForFilter.lowestCurrency, bestForFilter.lowestLocalPrice)}
                            </small>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="gs-game-muted">{copy.verifyingFallback}</p>
                    )}
                    <Link href={detailHref} className="gs-game-detail-cta" prefetch={false}>
                      <span>{copy.viewAllRegionsCta}</span>
                      <PublicIcon name="ArrowRight" size={16} />
                    </Link>
                  </div>
                </div>

                <div className="gs-game-featured-matrix">
                  <VariantRows
                    locale={resolvedLocale}
                    game={game}
                    variants={visibleVariants}
                    currency={currency}
                    rate={rate}
                    fractionDigits={fractionDigits}
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
                ? `/${resolvedLocale}/games/${game.slug}`
                : `/${resolvedLocale}/games/${game.slug}?platform=${platformFilter}`;

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
                          {game.meta.englishTitle && game.meta.englishTitle !== game.meta.title && (
                            <p className="gs-listing-plan-meta" lang="en">
                              {game.meta.englishTitle}
                            </p>
                          )}
                        </div>
                        {game.bestSavingPercent !== null && (
                          <span className="gs-game-diff-pill" data-tone="low">
                            {copy.savingShort(game.bestSavingPercent)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </header>
                <VariantRows
                  locale={resolvedLocale}
                  game={game}
                  variants={visibleVariants}
                  currency={currency}
                  rate={rate}
                  fractionDigits={fractionDigits}
                />
                <div className="gs-listing-card-foot">
                  <span className="gs-listing-updated">{copy.gridFootNote}</span>
                  <Link href={detailHref} className="gs-listing-detail" prefetch={false}>
                    {copy.gridViewDetails} <PublicIcon name="ArrowRight" size={16} />
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
