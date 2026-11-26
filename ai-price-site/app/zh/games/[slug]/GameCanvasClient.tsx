"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import BrandIcon from "@/components/BrandIcon";
import HomepageCountryFlag from "@/components/HomepageCountryFlag";
import PublicCurrencySelect, {
  usePageDisplayRates,
  usePublicCurrency,
} from "@/components/PublicCurrencySelect";
import { PublicDialog, PublicSegments } from "@/components/PublicControls";
import PublicIcon from "@/components/PublicIcon";
import PublicPriceNumber from "@/components/PublicPriceNumber";
import { getGameDetailCopy, type GameDetailUiCopy } from "@/components/games/game-ui-copy";
import {
  canvasDefaultCurrency,
  canvasIntlLocale,
  resolveCanvasLocale,
  type CanvasLocale,
} from "@/lib/canvas-ui-copy";
import {
  getDisplayCurrencyFractionDigits,
  isSupportedDisplayCurrency,
  type DisplayCurrency,
} from "@/lib/display-currency";
import {
  getGameMarketName,
  getGameMarketSearchTerms,
  getGameMarketStoreTag,
  getGameStoreName,
  type GameCatalogMeta,
} from "@/lib/game-catalog-meta";
import {
  currencies,
  currentOffer,
  defaults,
  editions,
  getGameEditionLabel,
  localMoney,
  markets,
  memberOf,
  names,
  selectionFrom,
  type Currency,
  type Edition,
  type GameOffer,
  type GameResponse,
  type Market,
  type Platform,
  type Selection,
} from "@/lib/game-offers";
import { formatPublicPrice } from "@/lib/public-price-format";
import { useGameOffers } from "./use-game-offers";

function statusLabel(copy: GameDetailUiCopy, row?: GameOffer) {
  if (row?.status === "unavailable") return copy.statusUnavailable;
  if (row?.status === "stale_expired") return copy.statusExpired;
  return copy.statusPending;
}

function dateText(copy: GameDetailUiCopy, value: string | null | undefined) {
  if (!value) return copy.statusPending;
  return value.slice(0, 10).replaceAll("-", ".");
}

function taxText(copy: GameDetailUiCopy, taxIncluded: boolean | null) {
  if (taxIncluded === true) return copy.taxIncluded;
  if (taxIncluded === false) return copy.taxAtCheckout;
  return copy.taxSeeCheckout;
}

function selectionUrl(
  locale: CanvasLocale,
  slug: string,
  state: Selection,
  defaultCurrency: DisplayCurrency,
  anchor?: string,
) {
  const params = new URLSearchParams();
  if (state.platform !== defaults.platform) params.set("platform", state.platform);
  if (state.edition !== defaults.edition) params.set("edition", state.edition);
  if (state.region !== defaults.region) params.set("region", state.region);
  if (state.currency !== defaultCurrency) params.set("currency", state.currency);
  return `/${locale}/games/${slug}` + (params.size ? `?${params}` : "") + (anchor ? `#${anchor}` : "");
}

function GameSourcesModalContent({
  locale,
  meta,
  slug,
  platform,
  apiCurrency,
  rows,
  data,
  offersByPlatform,
}: {
  locale: CanvasLocale;
  meta: GameCatalogMeta;
  slug: string;
  platform: Platform;
  apiCurrency: Currency;
  rows: GameOffer[];
  data: GameResponse | null;
  offersByPlatform: Partial<Record<Platform, GameResponse>>;
}) {
  const copy = getGameDetailCopy(locale);
  const other: Platform = platform === "ps5" ? "xbox" : "ps5";
  const additional = useGameOffers(
    slug,
    other,
    apiCurrency,
    offersByPlatform[other] ?? null,
    offersByPlatform,
  );
  const otherStoreName = getGameStoreName(other, false, locale);

  return (
    <div className="gs-game-sources-dialog">
      <p className="gs-game-sources-intro">{copy.sourcesIntro}</p>
      <div className="gs-game-source-list">
        {(["ps5", "xbox"] as const).map((targetPlatform) => {
          const offers =
            targetPlatform === platform ? rows : additional.data?.full_games;
          if (!offers?.length) return null;
          const platformMarkets = [...new Set(offers.map((offer) => offer.market))];
          return platformMarkets.map((market) => (
            <div key={`${targetPlatform}:${market}`} className="gs-game-source-group">
              <strong>
                {getGameStoreName(targetPlatform, false, locale)} ·{" "}
                {getGameMarketName(market, locale)}
              </strong>
              <div className="gs-game-source-links">
                {offers
                  .filter((row) => row.market === market)
                  .map((row) => (
                    <a
                      key={row.store_product_id}
                      href={row.store_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {meta.editions[row.edition]?.label ?? getGameEditionLabel(row.edition, locale)}
                      <PublicIcon name="ExternalLink" size={16} />
                    </a>
                  ))}
              </div>
            </div>
          ));
        })}
      </div>
      {!additional.data && (
        <p role="status" className="gs-game-sources-meta">
          {additional.error
            ? copy.sourcesUnavailable(otherStoreName)
            : copy.sourcesLoading(otherStoreName)}
        </p>
      )}
      <p className="gs-game-sources-meta">
        {data?.fx_as_of
          ? copy.sourcesFxDate(dateText(copy, data.fx_as_of))
          : copy.sourcesFxFallback}
      </p>
    </div>
  );
}

export default function GameCanvasClient({
  locale = "zh",
  slug,
  meta,
  initial,
  explicitUrlCurrency,
  initialData,
  offersByPlatform,
  rates,
  rateDates,
}: {
  locale?: CanvasLocale;
  slug: string;
  meta: GameCatalogMeta;
  initial: Selection;
  explicitUrlCurrency: string | null;
  initialData: GameResponse | null;
  offersByPlatform: Partial<Record<Platform, GameResponse>>;
  rates: Record<string, number>;
  rateDates: Record<string, string | null>;
}) {
  const resolvedLocale = resolveCanvasLocale(locale);
  const copy = getGameDetailCopy(resolvedLocale);
  const intlLocale = canvasIntlLocale(resolvedLocale);

  usePageDisplayRates(rates);

  const defaultCurrency: DisplayCurrency = canvasDefaultCurrency(resolvedLocale, rates);
  const [preferredCurrency, setPreferredCurrency] = usePublicCurrency(defaultCurrency);
  const [s, setSelection] = useState<Selection>(initial);
  const [query, setQuery] = useState("");
  const [openMarkets, setOpenMarkets] = useState<string[]>([]);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  // Sync an explicit ?currency= URL parameter on initial mount if valid.
  useEffect(() => {
    if (explicitUrlCurrency && isSupportedDisplayCurrency(explicitUrlCurrency)) {
      setPreferredCurrency(explicitUrlCurrency);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayCurrency: DisplayCurrency =
    explicitUrlCurrency &&
    isSupportedDisplayCurrency(explicitUrlCurrency) &&
    s.currency === explicitUrlCurrency &&
    rates[explicitUrlCurrency] > 0
      ? explicitUrlCurrency
      : rates[preferredCurrency] > 0
        ? preferredCurrency
        : rates[s.currency] > 0
          ? s.currency
          : resolvedLocale === "zh" && memberOf(currencies, s.currency)
            ? s.currency
            : defaultCurrency;

  const fractionDigits = getDisplayCurrencyFractionDigits(displayCurrency);

  const apiCurrency: Currency = memberOf(currencies, displayCurrency)
    ? displayCurrency
    : "USD";

  const { data, now, error } = useGameOffers(
    slug,
    s.platform,
    apiCurrency,
    initialData &&
      initialData.platform === s.platform &&
      initialData.display_currency === apiCurrency
      ? initialData
      : null,
    offersByPlatform,
  );

  useEffect(() => {
    const onPopState = () => {
      const searchParams = new URLSearchParams(location.search);
      const next = selectionFrom(searchParams, defaultCurrency);
      const urlCurr = searchParams.get("currency");
      if (urlCurr && isSupportedDisplayCurrency(urlCurr)) {
        setPreferredCurrency(urlCurr);
      }
      setSelection(next);
      setQuery("");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [defaultCurrency, setPreferredCurrency]);

  function change(diff: Partial<Selection>, anchor?: string) {
    const next = { ...s, ...diff };
    const url = selectionUrl(resolvedLocale, slug, next, defaultCurrency, anchor);
    if (url !== location.pathname + location.search + location.hash) {
      history.pushState(null, "", url);
    }
    setSelection(next);
  }

  function convertOfferAmount(row: GameOffer | undefined): number | null {
    if (!row?.price) return null;
    if (row.currency === displayCurrency) {
      const direct = Number(row.price.public_price);
      return Number.isFinite(direct) ? direct : null;
    }
    if (
      data &&
      data.display_currency === displayCurrency &&
      row.price.converted_public_price != null
    ) {
      const serverConverted = Number(row.price.converted_public_price);
      return Number.isFinite(serverConverted) ? serverConverted : null;
    }
    const raw = Number(row.price.public_price);
    if (!Number.isFinite(raw) || raw <= 0) return null;
    const sourceRate = row.currency === "USD" ? 1 : rates[row.currency];
    const targetRate = displayCurrency === "USD" ? 1 : rates[displayCurrency];
    if (!sourceRate || !targetRate || !data?.fx_as_of) return null;
    return Math.round(((raw * targetRate) / sourceRate) * 100) / 100;
  }

  const editionLabel = (ed: Edition) =>
    meta.editions[ed]?.label ?? getGameEditionLabel(ed, resolvedLocale);

  const unannouncedMeta = meta.unannouncedPlatforms[s.platform];
  const isUnannounced =
    data?.platform_status === "unannounced" ||
    (Boolean(unannouncedMeta) && (!data || data.full_games.length === 0));

  const allOffers = data?.full_games.map((row) => currentOffer(row, now, data)) ?? [];
  const allUpgrades = data?.upgrades.map((row) => currentOffer(row, now, data)) ?? [];

  // Compute lowest converted price per edition for the edition keycaps & right comparison card
  const editionLowestMap = new Map<Edition, { row: GameOffer; converted: number | null }>();
  for (const ed of editions) {
    const edRows = allOffers
      .filter((row) => row.edition === ed && row.price)
      .map((row) => ({ row, converted: convertOfferAmount(row) }))
      .sort((a, b) => (a.converted ?? Infinity) - (b.converted ?? Infinity));
    if (edRows[0]) {
      editionLowestMap.set(ed, edRows[0]);
    }
  }

  // Rows for the active edition
  const editionRows = allOffers.filter((row) => row.edition === s.edition);
  const filteredRows = editionRows.filter(
    (row) =>
      (s.region === "all" || row.market === s.region) &&
      getGameMarketSearchTerms(row.market, resolvedLocale)
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );

  const pricedRows = filteredRows
    .filter((row) => row.price)
    .map((row) => ({ row, converted: convertOfferAmount(row) }));

  const allComparable =
    pricedRows.length >= 2 && pricedRows.every((item) => item.converted !== null);

  const sortedRows = [...filteredRows].sort((a, b) => {
    const ca = convertOfferAmount(a);
    const cb = convertOfferAmount(b);
    if (ca !== null && cb !== null && ca !== cb) return ca - cb;
    if (a.price && !b.price) return -1;
    if (!a.price && b.price) return 1;
    return a.market.localeCompare(b.market);
  });

  const rankByMarket = new Map<string, number>();
  let rankCounter = 1;
  for (const row of sortedRows) {
    if (row.price) {
      rankByMarket.set(row.market, rankCounter++);
    }
  }

  const usOffer = editionRows.find((row) => row.market === "US" && row.price);
  const usConverted = convertOfferAmount(usOffer);

  const lowestComparable =
    allComparable && sortedRows[0]?.price
      ? (() => {
          const firstVal = convertOfferAmount(sortedRows[0]);
          const secondVal = convertOfferAmount(sortedRows[1]);
          return firstVal !== null && secondVal !== null && firstVal !== secondVal
            ? sortedRows[0]
            : null;
        })()
      : null;

  const heroRow =
    lowestComparable ??
    sortedRows.find((row) => row.price) ??
    editionRows.find((row) => row.price) ??
    null;
  const heroConverted = heroRow ? convertOfferAmount(heroRow) : null;

  const maxConverted = Math.max(
    1,
    ...sortedRows.map((row) => convertOfferAmount(row) ?? 0),
  );

  const gapCents = (convertedValue: number) =>
    usConverted !== null
      ? Math.round(usConverted * 100) - Math.round(convertedValue * 100)
      : null;

  const formatConverted = (value: number) =>
    formatPublicPrice(value, displayCurrency, intlLocale, fractionDigits);

  const currentEditionLabel = editionLabel(s.edition);

  // Build #quote-insight semantic status text (preserving full accuracy & review E2E compatibility)
  let quoteInsight: ReactNode;
  if (!data) {
    quoteInsight = error ? copy.insightError : copy.insightLoading;
  } else if (!sortedRows.length) {
    quoteInsight = copy.insightNoMatch;
  } else if (!pricedRows.length) {
    quoteInsight = copy.insightError;
  } else if (pricedRows.length === 1) {
    const only = pricedRows[0].row;
    const missingOther = sortedRows.find((item) => item.market !== only.market);
    quoteInsight = copy.insightSingleMarket({
      marketName: getGameMarketName(only.market, resolvedLocale),
      editionName: currentEditionLabel,
      localPrice: localMoney(only.currency, only.price!.public_price),
      convertedPrice:
        pricedRows[0].converted !== null ? formatConverted(pricedRows[0].converted) : null,
      missingMarketName: missingOther
        ? getGameMarketName(missingOther.market, resolvedLocale)
        : null,
    });
  } else if (!allComparable) {
    quoteInsight = copy.insightMissingFx(pricedRows.length);
  } else if (!lowestComparable) {
    quoteInsight = copy.insightEqualPrices(pricedRows.length);
  } else if (lowestComparable.market === "US") {
    quoteInsight = copy.insightUsLowest(pricedRows.length);
  } else {
    const lowestVal = convertOfferAmount(lowestComparable)!;
    const saved = (gapCents(lowestVal) ?? 0) / 100;
    quoteInsight = copy.insightLowestWithSaving({
      count: pricedRows.length,
      marketName: getGameMarketName(lowestComparable.market, resolvedLocale),
      savedNode: saved > 0 ? <strong>{formatConverted(saved)}</strong> : null,
    });
  }

  // Reference market for the unified edition comparison card (prefer lowest verified market, fallback HK -> US)
  const referenceMarket: Market =
    heroRow?.market ??
    allOffers.find((row) => row.price)?.market ??
    "HK";
  const editionPair = editions.map((ed) =>
    allOffers.find((row) => row.edition === ed && row.market === referenceMarket),
  );
  const editionDeltaCents =
    editionPair[0]?.price && editionPair[1]?.price
      ? Math.round(Number(editionPair[1].price.public_price) * 100) -
        Math.round(Number(editionPair[0].price.public_price) * 100)
      : null;

  // Conditional upgrade note: ONLY display when a purchasable price or subscription inclusion exists!
  const verifiedUpgrade =
    allUpgrades.find((u) => u.market === referenceMarket && u.price !== null) ??
    allUpgrades.find((u) => u.price !== null) ??
    null;

  const showRegionFilterBar =
    editionRows.length >= 5 || s.region !== "all" || query.trim().length > 0;

  const priceFont = /[a-z]/i.test(formatConverted(0)) ? "latin" : "numerals";

  function handleTabKeyDown<T extends string>(
    event: KeyboardEvent<HTMLButtonElement>,
    items: readonly T[],
    current: T,
    onSelect: (next: T) => void,
  ) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const index = items.indexOf(current);
    if (index < 0) return;
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + delta + items.length) % items.length;
    const nextValue = items[nextIndex];
    onSelect(nextValue);
    const parent = event.currentTarget.parentElement;
    parent?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  }

  const fxDateLabel =
    rateDates[displayCurrency] ?? data?.fx_as_of ?? null;

  return (
    <div className="gs-public-unified gs-plan-scope gs-game-scope">
      <div className="gs-plan-page gs-game-page" id="top">
        <nav className="gs-plan-breadcrumb" aria-label={copy.breadcrumbAria}>
          <Link href={`/${resolvedLocale}/games`}>{copy.breadcrumbGames}</Link>
          <span aria-hidden="true">/</span>
          <span>{meta.title}</span>
        </nav>

        <header className="gs-game-header">
          <div className="gs-game-identity-row">
            {meta.coverSrc ? (
              <Image
                unoptimized
                src={meta.coverSrc}
                width={76}
                height={110}
                alt={meta.coverAlt}
                fetchPriority="high"
                className="gs-game-cover"
              />
            ) : (
              <BrandIcon
                product={{ slug, name: meta.title }}
                className="gs-game-cover-fallback"
                decorative
              />
            )}
            <div className="gs-game-title-stack">
              <h1>{meta.title}</h1>
              {meta.englishTitle && meta.englishTitle !== meta.title && (
                <p className="gs-game-subtitle" lang="en">
                  {meta.englishTitle}
                </p>
              )}
              <p className="gs-game-byline">
                <span>{meta.publisher}</span>
                {meta.releaseLabel && (
                  <span>
                    {meta.releaseDate ? (
                      <>
                        <time dateTime={meta.releaseDate}>
                          {meta.releaseDate.replaceAll("-", ".")}
                        </time>
                        {meta.releaseLabel.replace(meta.releaseDate.replaceAll("-", "."), "")}
                      </>
                    ) : (
                      meta.releaseLabel
                    )}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="gs-game-switchers">
            <div
              className="gs-plan-keycaps gs-game-keycaps"
              role="tablist"
              aria-label={copy.platformTabsAria}
            >
              {meta.supportedPlatforms.map((p) => {
                const active = s.platform === p;
                const pendingMeta = meta.unannouncedPlatforms[p];
                return (
                  <button
                    key={p}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    data-choice={p}
                    className="gs-plan-keycap gs-game-keycap-btn"
                    onClick={() => {
                      setQuery("");
                      change({ platform: p });
                    }}
                    onKeyDown={(e) =>
                      handleTabKeyDown(e, meta.supportedPlatforms, s.platform, (nextP) => {
                        setQuery("");
                        change({ platform: nextP });
                      })
                    }
                  >
                    <span>{names[p]}</span>
                    {pendingMeta && (
                      <small className="gs-plan-keycap-price gs-game-pending-tag">
                        {pendingMeta.badge}
                      </small>
                    )}
                  </button>
                );
              })}
            </div>

            {!isUnannounced && (
              <div
                className="gs-plan-keycaps gs-game-keycaps"
                role="tablist"
                aria-label={copy.editionTabsAria}
              >
                {editions.map((ed) => {
                  const active = s.edition === ed;
                  const lowestForEd = editionLowestMap.get(ed);
                  const pricePreview =
                    lowestForEd?.converted != null
                      ? formatConverted(lowestForEd.converted)
                      : lowestForEd?.row.price
                        ? localMoney(lowestForEd.row.currency, lowestForEd.row.price.public_price)
                        : null;

                  return (
                    <button
                      key={ed}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className="gs-plan-keycap gs-game-keycap-btn"
                      data-cheaper={lowestForEd?.row.market === "HK" ? "true" : undefined}
                      onClick={() => change({ edition: ed })}
                      onKeyDown={(e) =>
                        handleTabKeyDown(e, editions, s.edition, (nextEd) =>
                          change({ edition: nextEd }),
                        )
                      }
                    >
                      <span>{editionLabel(ed)}</span>
                      {pricePreview && (
                        <small className="gs-plan-keycap-price">{pricePreview}</small>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </header>

        {isUnannounced ? (
          <section id="pc-state" className="gs-plan-panel gs-game-unannounced">
            <div className="gs-game-unannounced-copy">
              <span className="gs-game-status-pill">
                {unannouncedMeta?.badge ?? copy.unannouncedFallbackBadge}
              </span>
              <h2>
                {unannouncedMeta?.title ?? copy.unannouncedFallbackTitle(names[s.platform])}
              </h2>
              <p>{unannouncedMeta?.description ?? copy.unannouncedFallbackDesc}</p>
            </div>
            <div className="gs-game-unannounced-actions">
              {(["ps5", "xbox"] as const)
                .filter((p) => meta.supportedPlatforms.includes(p) && !meta.unannouncedPlatforms[p])
                .map((consoleKey) => (
                  <button
                    key={consoleKey}
                    type="button"
                    data-gs-ui="button"
                    data-console={consoleKey}
                    onClick={() => {
                      setQuery("");
                      change({ platform: consoleKey, region: "all" });
                    }}
                  >
                    {copy.viewPlatformOffersBtn(names[consoleKey])}
                  </button>
                ))}
              {meta.officialUrl && (
                <a
                  href={meta.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gs-game-official-link"
                >
                  {copy.viewOfficialSiteLink(meta.publisher)}
                  <PublicIcon name="ExternalLink" size={16} />
                </a>
              )}
            </div>
          </section>
        ) : (
          <>
            <div className="gs-plan-summary gs-game-summary" data-price-font={priceFont}>
              <section
                className="gs-plan-panel gs-plan-lowest gs-game-lowest-card"
                aria-label={copy.lowestCardAria}
              >
                <div className="gs-plan-card-top">
                  <strong>
                    {heroRow ? (
                      <>
                        {lowestComparable ? copy.lowestGlobalLabel : copy.currentValidQuoteLabel} ·{" "}
                        <span className="gs-plan-country">
                          <HomepageCountryFlag code={heroRow.market} />
                          {getGameMarketName(heroRow.market, resolvedLocale)}
                        </span>
                      </>
                    ) : (
                      `${names[s.platform]} · ${currentEditionLabel}`
                    )}
                  </strong>
                  <div className="gs-plan-tools">
                    <PublicCurrencySelect
                      locale={resolvedLocale}
                      displayCurrency={displayCurrency}
                      onChange={(nextCurr) => {
                        change({ currency: nextCurr });
                      }}
                    />
                  </div>
                </div>

                {heroRow?.price ? (
                  <>
                    <div className="gs-plan-hero-price">
                      {heroConverted !== null ? (
                        <PublicPriceNumber
                          value={heroConverted}
                          currency={displayCurrency}
                          locale={intlLocale}
                          fractionDigits={fractionDigits}
                          size="hero"
                          changeKey={displayCurrency}
                        />
                      ) : (
                        <span className="gs-game-hero-local-fallback">
                          {localMoney(heroRow.currency, heroRow.price.public_price)}
                        </span>
                      )}
                    </div>

                    <div className="gs-plan-local">
                      {lowestComparable &&
                        heroConverted !== null &&
                        usConverted !== null &&
                        usConverted > 0 &&
                        lowestComparable.market !== "US" && (
                          <span className="gs-plan-saving">
                            {copy.cheaperThanUsStore(
                              Math.round(
                                ((Math.round(usConverted * 100) - Math.round(heroConverted * 100)) *
                                  100) /
                                  Math.round(usConverted * 100),
                              ),
                            )}
                          </span>
                        )}
                      <span>
                        {copy.localListPrice(localMoney(heroRow.currency, heroRow.price.public_price))}{" "}
                        · {taxText(copy, heroRow.tax_included)}
                      </span>
                      {heroRow.price.base_price &&
                        heroRow.price.base_price !== heroRow.price.public_price && (
                          <span className="gs-game-base-strike">
                            {copy.originalPrice(localMoney(heroRow.currency, heroRow.price.base_price))}
                          </span>
                        )}
                    </div>

                    <div className="gs-plan-lowest-facts">
                      <div>
                        <span>{copy.usStoreSameEdition}</span>
                        <strong>
                          {usOffer?.price ? (
                            usConverted !== null ? (
                              <PublicPriceNumber
                                value={usConverted}
                                currency={displayCurrency}
                                locale={intlLocale}
                                fractionDigits={fractionDigits}
                                changeKey={displayCurrency}
                              />
                            ) : (
                              localMoney(usOffer.currency, usOffer.price.public_price)
                            )
                          ) : (
                            copy.statusPending
                          )}
                        </strong>
                      </div>
                      <div>
                        <span>
                          {lowestComparable &&
                          lowestComparable.market !== "US" &&
                          heroConverted !== null &&
                          usConverted !== null &&
                          usConverted > heroConverted
                            ? copy.saveVsUsStore
                            : copy.comparisonStatusLabel}
                        </span>
                        <strong
                          data-tone={
                            lowestComparable &&
                            lowestComparable.market !== "US" &&
                            heroConverted !== null &&
                            usConverted !== null &&
                            usConverted > heroConverted
                              ? "low"
                              : undefined
                          }
                        >
                          {lowestComparable &&
                          lowestComparable.market !== "US" &&
                          heroConverted !== null &&
                          usConverted !== null &&
                          usConverted > heroConverted ? (
                            <PublicPriceNumber
                              value={(gapCents(heroConverted) ?? 0) / 100}
                              currency={displayCurrency}
                              locale={intlLocale}
                              fractionDigits={fractionDigits}
                              changeKey={displayCurrency}
                            />
                          ) : (
                            copy.verifiedCountStatus(pricedRows.length, editionRows.length)
                          )}
                        </strong>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="gs-game-empty-hero">{copy.emptyHeroNote}</p>
                )}

                <p className="gs-game-insight-line" role="status">
                  <span id="quote-selection">
                    {names[s.platform]} · {currentEditionLabel}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span id="quote-insight">{quoteInsight}</span>
                </p>

                <div className="gs-plan-lowest-footer">
                  <div className="gs-plan-lowest-meta">
                    <span>
                      {copy.verifiedPrefix}
                      {heroRow?.verified_at ? dateText(copy, heroRow.verified_at) : copy.statusPending}
                    </span>
                    {displayCurrency !== "USD" && fxDateLabel && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          {copy.fxPrefix}
                          {dateText(copy, fxDateLabel)}
                        </span>
                      </>
                    )}
                  </div>
                  {heroRow && (
                    <a
                      href={heroRow.store_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gs-game-hero-store-btn"
                    >
                      <span>
                        {copy.goToStoreBtn(
                          getGameMarketStoreTag(heroRow.market, resolvedLocale),
                          getGameStoreName(s.platform, true, resolvedLocale),
                        )}
                      </span>
                      <PublicIcon name="ExternalLink" size={16} />
                    </a>
                  )}
                </div>
              </section>

              <section
                id="editions"
                className="gs-plan-panel gs-game-editions-card"
                aria-labelledby="edition-title"
              >
                <div className="gs-plan-card-top">
                  <h2 id="edition-title">{copy.editionsHeading}</h2>
                  <span>
                    {copy.editionsCompareSub(
                      names[s.platform],
                      getGameMarketStoreTag(referenceMarket, resolvedLocale),
                    )}
                    {editionDeltaCents !== null && editionPair[0] && (
                      <strong className="edition-premium">
                        {editionDeltaCents === 0
                          ? copy.editionsSamePrice
                          : copy.editionsPriceDiff(
                              localMoney(
                                editionPair[0].currency,
                                (Math.abs(editionDeltaCents) / 100).toFixed(2),
                              ),
                            )}
                      </strong>
                    )}
                  </span>
                </div>

                <div className="gs-game-edition-list">
                  {editions.map((ed, idx) => {
                    const row = editionPair[idx];
                    const converted = convertOfferAmount(row);
                    const active = s.edition === ed;
                    const edMeta = meta.editions[ed];

                    return (
                      <div
                        key={ed}
                        className="gs-game-edition-item"
                        data-active={active ? "true" : undefined}
                      >
                        <button
                          type="button"
                          className="gs-game-edition-select"
                          aria-pressed={active}
                          onClick={() => change({ edition: ed })}
                        >
                          <div className="gs-game-edition-top">
                            <div className="gs-game-edition-name">
                              <strong>{editionLabel(ed)}</strong>
                              {active && (
                                <span className="gs-game-active-pill">{copy.activeEditionBadge}</span>
                              )}
                              {!active && edMeta?.badge && (
                                <span className="gs-game-sub-pill">{edMeta.badge}</span>
                              )}
                            </div>
                            <div className="gs-game-edition-price">
                              {converted !== null ? (
                                <strong>
                                  <PublicPriceNumber
                                    value={converted}
                                    currency={displayCurrency}
                                    locale={intlLocale}
                                    fractionDigits={fractionDigits}
                                    changeKey={displayCurrency}
                                  />
                                </strong>
                              ) : row?.price ? (
                                <strong>{localMoney(row.currency, row.price.public_price)}</strong>
                              ) : (
                                <span className="gs-game-muted">{statusLabel(copy, row)}</span>
                              )}
                              {row?.price && converted !== null && (
                                <small>{localMoney(row.currency, row.price.public_price)}</small>
                              )}
                            </div>
                          </div>
                          <p className="gs-game-edition-desc">{edMeta?.summary}</p>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {verifiedUpgrade && (
                  <div className="gs-game-upgrade-note upgrade-note">
                    <div>
                      <strong>{copy.upgradeQuestion}</strong>
                      <span>
                        {verifiedUpgrade.price?.included_in_subscription
                          ? copy.upgradeIncludedInSub
                          : verifiedUpgrade.price
                            ? copy.upgradeBundleLabel(
                                getGameMarketStoreTag(verifiedUpgrade.market, resolvedLocale),
                                localMoney(
                                  verifiedUpgrade.currency,
                                  verifiedUpgrade.price.public_price,
                                ),
                              )
                            : ""}
                      </span>
                    </div>
                    <a
                      href={verifiedUpgrade.store_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {copy.viewUpgradeLink}
                      <PublicIcon name="ExternalLink" size={16} />
                    </a>
                  </div>
                )}
              </section>
            </div>

            <section
              id="regions"
              className="gs-plan-regions gs-game-regions"
              data-price-font={priceFont}
              aria-labelledby="plan-regions-title"
            >
              <div className="gs-plan-region-heading">
                <div className="gs-game-region-title">
                  <h2 id="plan-regions-title">{copy.regionsHeading}</h2>
                  <p>{copy.regionsDesc(names[s.platform], currentEditionLabel)}</p>
                </div>

                {showRegionFilterBar && (
                  <div className="gs-plan-filters" id="quote-filters">
                    <PublicSegments
                      label={copy.regionFilterAria}
                      value={s.region}
                      options={[
                        { value: "all", label: copy.allRegionsOption },
                        ...markets.map((m) => ({
                          value: m,
                          label: getGameMarketName(m, resolvedLocale),
                        })),
                      ]}
                      onChange={(v) => {
                        setQuery("");
                        change({ region: v as Selection["region"] });
                      }}
                    />
                    {editionRows.length >= 5 && (
                      <label className="gs-plan-search" data-gs-input>
                        <PublicIcon name="Search" size={16} />
                        <input
                          type="search"
                          aria-label={copy.searchRegionAria}
                          placeholder={copy.searchRegionPlaceholder}
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>

              <div className="gs-game-table-panel quote-sheet">
                <table className="gs-game-table" aria-label={copy.tableAria}>
                  <thead>
                    <tr>
                      <th scope="col" className="gs-game-col-rank">
                        {copy.tableCols[0]}
                      </th>
                      <th scope="col">{copy.tableCols[1]}</th>
                      <th scope="col" className="gs-game-col-num">
                        {copy.tableCols[2]}
                      </th>
                      <th scope="col" className="gs-game-col-num gs-game-col-desktop">
                        {copy.tableCols[3]}
                      </th>
                      <th scope="col" className="gs-game-col-compare gs-game-col-desktop">
                        {copy.tableCols[4]}
                      </th>
                      <th scope="col" className="gs-game-col-store">
                        {copy.tableCols[5]}
                      </th>
                    </tr>
                  </thead>
                  {sortedRows.map((row) => {
                    const { market, price } = row;
                    const marketName = getGameMarketName(market, resolvedLocale);
                    const storeTag = getGameMarketStoreTag(market, resolvedLocale);
                    const localText = price
                      ? localMoney(row.currency, price.public_price)
                      : statusLabel(copy, row);
                    const converted = convertOfferAmount(row);
                    const isDetailOpen = openMarkets.includes(market);
                    const isLowest = lowestComparable === row;
                    const rank = rankByMarket.get(market);

                    const pct =
                      allComparable &&
                      usConverted !== null &&
                      usConverted > 0 &&
                      converted !== null
                        ? Math.round(
                            (100 * (gapCents(converted) ?? 0)) / Math.round(usConverted * 100),
                          )
                        : null;

                    const diffTone =
                      market === "US" && price
                        ? "baseline"
                        : pct !== null && pct > 0
                          ? "low"
                          : pct !== null && pct < 0
                            ? "high"
                            : "muted";

                    const diffText =
                      market === "US" && price
                        ? copy.usStoreBaseline
                        : pct !== null && pct > 0
                          ? copy.diffLower(pct)
                          : pct !== null && pct < 0
                            ? copy.diffHigher(Math.abs(pct))
                            : price
                              ? copy.diffPendingCompare
                              : copy.statusPending;

                    return (
                      <tbody
                        key={market}
                        data-code={market}
                        className={isLowest ? "lowest-offer" : undefined}
                      >
                        <tr className="gs-game-row quote-main">
                          <td className="gs-game-col-rank">
                            <span className="gs-plan-rank">{rank ?? "—"}</span>
                          </td>
                          <th scope="row" className="gs-game-region-cell">
                            <button
                              type="button"
                              className="gs-game-disclosure-btn"
                              aria-label={copy.disclosureAria(marketName)}
                              aria-expanded={isDetailOpen}
                              aria-controls={`details-${market}`}
                              onClick={() =>
                                setOpenMarkets((prev) =>
                                  prev.includes(market)
                                    ? prev.filter((m) => m !== market)
                                    : [...prev, market],
                                )
                              }
                            >
                              <HomepageCountryFlag code={market} />
                              <span className="gs-game-region-names">
                                <strong>
                                  {marketName}
                                  <span className="gs-game-region-tag">{storeTag}</span>
                                </strong>
                                <small className="gs-game-mobile-local">
                                  {localText} · {taxText(copy, row.tax_included)}
                                </small>
                              </span>
                              <PublicIcon
                                name="ChevronDown"
                                size={16}
                                className="gs-game-row-chevron"
                              />
                            </button>
                          </th>
                          <td className="gs-game-col-num quote-fx">
                            {converted !== null ? (
                              <strong data-tone={diffTone === "low" ? "low" : undefined}>
                                <PublicPriceNumber
                                  value={converted}
                                  currency={displayCurrency}
                                  locale={intlLocale}
                                  fractionDigits={fractionDigits}
                                  changeKey={displayCurrency}
                                />
                              </strong>
                            ) : (
                              <strong className="gs-game-muted">—</strong>
                            )}
                            <small
                              className="gs-game-mobile-diff"
                              data-tone={diffTone === "low" ? "low" : undefined}
                            >
                              {diffText}
                            </small>
                          </td>
                          <td className="gs-game-col-num gs-game-col-desktop quote-local">
                            <span>{localText}</span>
                            {price?.base_price && price.base_price !== price.public_price && (
                              <small className="gs-game-base-strike">
                                {localMoney(row.currency, price.base_price)}
                              </small>
                            )}
                          </td>
                          <td className="gs-game-col-compare gs-game-col-desktop">
                            {converted !== null ? (
                              <span className="gs-plan-comparison">
                                <span className="gs-plan-bar" aria-hidden="true">
                                  <span
                                    data-tone={
                                      diffTone === "high"
                                        ? "high"
                                        : diffTone === "baseline"
                                          ? "baseline"
                                          : "low"
                                    }
                                    style={{ width: `${(converted / maxConverted) * 100}%` }}
                                  />
                                  {usConverted !== null && (
                                    <i style={{ left: `${(usConverted / maxConverted) * 100}%` }} />
                                  )}
                                </span>
                                <small data-tone={diffTone === "low" ? "low" : undefined}>
                                  {diffText}
                                </small>
                              </span>
                            ) : (
                              <span className="gs-game-muted">{diffText}</span>
                            )}
                          </td>
                          <td className="gs-game-col-store">
                            <div className="gs-game-store-cell">
                              <span className="gs-game-tax-label gs-game-col-desktop">
                                {taxText(copy, row.tax_included)}
                              </span>
                              <a
                                className="gs-game-shop-link shop-link"
                                href={row.store_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={copy.shopLinkAria(
                                  marketName,
                                  names[s.platform],
                                  currentEditionLabel,
                                )}
                              >
                                <span>{getGameStoreName(s.platform, true, resolvedLocale)}</span>
                                <PublicIcon name="ExternalLink" size={16} />
                              </a>
                            </div>
                          </td>
                        </tr>
                        <tr
                          className="gs-game-detail-row"
                          id={`details-${market}`}
                          hidden={!isDetailOpen}
                        >
                          <td colSpan={6}>
                            <div className="gs-plan-evidence gs-game-evidence">
                              <span>
                                {copy.evidenceSourcePrefix}
                                {getGameStoreName(s.platform, false, resolvedLocale)} ·{" "}
                                {currentEditionLabel}
                              </span>
                              <span>
                                {row.status === "stale_grace"
                                  ? copy.evidenceLastVerified
                                  : copy.evidenceVerified}
                                {row.verified_at ? (
                                  <time dateTime={row.verified_at}>
                                    {dateText(copy, row.verified_at)}
                                  </time>
                                ) : (
                                  copy.statusPending
                                )}
                              </span>
                              {converted !== null && row.currency !== displayCurrency && fxDateLabel && (
                                <span>
                                  {copy.evidenceFxPrefix}
                                  {dateText(copy, fxDateLabel)}
                                </span>
                              )}
                              <span>
                                {copy.evidenceTaxPrefix}
                                {taxText(copy, row.tax_included)}
                              </span>
                              {price?.member_price && (
                                <span>
                                  {copy.evidenceMemberPrice(
                                    price.member_tier ?? copy.evidenceMemberFallback,
                                    localMoney(row.currency, price.member_price),
                                  )}
                                </span>
                              )}
                              <a
                                href={row.store_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {copy.openOfficialStoreLink}
                                <PublicIcon name="ExternalLink" size={16} />
                              </a>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    );
                  })}
                </table>

                {data && !sortedRows.length && (
                  <p id="empty-rows" className="gs-plan-empty gs-game-empty-rows">
                    {copy.noMatchingRegions}
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        change({ region: "all" });
                      }}
                    >
                      {copy.clearFilterBtn}
                    </button>
                  </p>
                )}

                <div className="gs-plan-table-footer gs-game-table-footer">
                  <span>{copy.tableFooterSummary(sortedRows.length)}</span>
                  <button
                    type="button"
                    className="gs-game-sources-btn"
                    onClick={() => setSourcesOpen(true)}
                    aria-haspopup="dialog"
                  >
                    <span>{copy.sourcesTriggerBtn}</span>
                    <PublicIcon name="ArrowRight" size={16} />
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        <section id="guide" className="gs-canvas-panel" aria-labelledby="game-faq-title">
          <div className="gs-canvas-faq-head">
            <h2 id="game-faq-title">{copy.faqHeading}</h2>
          </div>
          {meta.faqs.map((faq) => (
            <details key={faq.question} className="gs-canvas-faq-item">
              <summary>
                <span>{faq.question}</span>
                <PublicIcon name="ChevronDown" size={16} className="gs-canvas-faq-chevron" />
              </summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </section>
      </div>

      {sourcesOpen && (
        <PublicDialog
          label={copy.sourcesDialogTitle}
          variant="currency"
          onClose={() => setSourcesOpen(false)}
        >
          <GameSourcesModalContent
            locale={resolvedLocale}
            meta={meta}
            slug={slug}
            platform={s.platform}
            apiCurrency={apiCurrency}
            rows={allOffers}
            data={data}
            offersByPlatform={offersByPlatform}
          />
        </PublicDialog>
      )}
    </div>
  );
}
