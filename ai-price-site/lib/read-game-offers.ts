import { Prisma, ProductCategory, PublishStatus } from "@prisma/client";
import { prisma } from "./prisma";
import {
  editions,
  msPerWeek,
  type Currency,
  type Edition,
  type GameOffer,
  type GameResponse,
  type Market,
  type Platform,
} from "./game-offers";
import {
  getGameCatalogMeta,
  type GameCatalogMeta,
} from "./game-catalog-meta";
import { summarizeGta6HomepageOffers, type HomepageGameQuote } from "./homepage-game-savings";
import { savingsPercent } from "./homepage-display";
import { loadVerifiedPriceSource } from "./cached-verified-price-source";
import { homepageDisplayRates } from "./homepage-summary";

type Result = {
  stamp: Date;
  fx_date: Date | null;
  kind: string | null;
  offer: GameOffer | null;
};

type FxRateRow = {
  quote_currency: string;
  rate: string;
  rate_date: Date;
};

type CatalogStateRow = {
  product_id: string;
  platform: "ps5" | "xbox";
  market: Market;
  edition: Edition;
  currency: "HKD" | "USD";
  status: GameOffer["status"];
  verified_at: Date | null;
  tax_included: boolean | null;
  public_price: string | null;
  base_price: string | null;
};

export type GameCatalogVariantRow = {
  platform: "ps5" | "xbox";
  edition: Edition;
  lowestMarket: Market | null;
  lowestCurrency: string | null;
  lowestLocalPrice: string | null;
  lowestUsd: number | null;
  hongKongPrice: string | null;
  usPrice: string | null;
  usUsd: number | null;
  savingRatio: number | null;
  savingPercent: number | null;
  verifiedCount: number;
};

export type GameCatalogItem = {
  id: string;
  slug: string;
  name: string;
  meta: GameCatalogMeta;
  variants: GameCatalogVariantRow[];
  bestVariant: GameCatalogVariantRow | null;
  bestSavingPercent: number | null;
  marketCodes: string[];
  latestVerifiedAt: string | null;
};

export type GameDisplayRateBundle = {
  rates: Record<string, number>;
  rateDates: Record<string, string | null>;
};

export type GameDetailBundle = {
  product: {
    id: string;
    slug: string;
    name: string;
    provider: string | null;
    description: string | null;
    officialUrl: string | null;
  };
  meta: GameCatalogMeta;
  initialData: GameResponse;
  offersByPlatform: Partial<Record<Platform, GameResponse>>;
  displayRates: GameDisplayRateBundle;
};

// Cross rates share a provider and effective date. Missing legs stay unavailable.
const gameOffersFx = Prisma.sql`
  SELECT rate_date, max(rate) FILTER (WHERE quote_currency='HKD') AS hkd,
         max(rate) FILTER (WHERE quote_currency='CNY') AS cny
  FROM exchange_rates WHERE base_currency='USD' AND quote_currency IN ('HKD','CNY')
    AND status='active' AND rate>0 AND rate_date <= (now() AT TIME ZONE 'UTC')::date
    AND (rate_date::timestamp AT TIME ZONE 'UTC') + interval '7 days' > now()
  GROUP BY rate_date, source ORDER BY rate_date DESC, count(DISTINCT quote_currency) DESC, source LIMIT 1
`;

export async function readGameDisplayRates(): Promise<GameDisplayRateBundle> {
  const rates: Record<string, number> = { USD: 1 };
  const rateDates: Record<string, string | null> = { USD: null };

  const [verifiedSource, dbFxRows] = await Promise.all([
    loadVerifiedPriceSource().catch(() => null),
    prisma.$queryRaw<FxRateRow[]>`
      SELECT DISTINCT ON (quote_currency)
        quote_currency,
        rate::text AS rate,
        rate_date
      FROM exchange_rates
      WHERE base_currency = 'USD'
        AND status = 'active'
        AND rate > 0
        AND rate_date <= (now() AT TIME ZONE 'UTC')::date
        AND (rate_date::timestamp AT TIME ZONE 'UTC') + interval '7 days' > now()
      ORDER BY quote_currency, rate_date DESC, source ASC
    `.catch((): FxRateRow[] => []),
  ]);

  if (verifiedSource) {
    const baseRates = homepageDisplayRates(verifiedSource.rates);
    for (const [code, value] of Object.entries(baseRates)) {
      if (Number.isFinite(value) && value > 0) {
        rates[code] = value;
      }
    }
    for (const [code, row] of Object.entries(verifiedSource.rates)) {
      if (row?.rateDate) {
        rateDates[code] = row.rateDate;
      }
    }
  }

  for (const row of dbFxRows) {
    const numeric = Number(row.rate);
    if (Number.isFinite(numeric) && numeric > 0) {
      rates[row.quote_currency] = numeric;
      rateDates[row.quote_currency] = row.rate_date.toISOString();
    }
  }

  return { rates, rateDates };
}

export async function readGta6OfferSummary() {
  try {
    return await prisma.$transaction(async (db) => {
      await db.$executeRaw`SET LOCAL statement_timeout = '350ms'`;
      const quotes = await db.$queryRaw<(HomepageGameQuote & { hkd_per_usd: string | null })[]>`
        WITH fx AS (${gameOffersFx})
        SELECT offer.platform, offer.edition, offer.market, offer.price->>'public_price' AS price,
               fx.hkd::text AS hkd_per_usd
        FROM products p
        JOIN game_offer_public_state offer ON offer.product_id = p.id
        LEFT JOIN fx ON true
        WHERE p.slug = 'gta-6' AND p.category = 'game' AND p.status = 'published'
          AND offer.platform IN ('ps5', 'xbox')
          AND offer.edition IN ('standard', 'ultimate') AND offer.offer_type = 'full_game'
          AND (offer.market, offer.currency) IN (('HK', 'HKD'), ('US', 'USD'))
          AND offer.status = 'fresh'
          AND (offer.price->>'public_price')::numeric > 0
      `;
      return summarizeGta6HomepageOffers(quotes, Number(quotes[0]?.hkd_per_usd));
    }, { maxWait: 300, timeout: 500 });
  } catch {
    // The optional prices can be hidden while the price view is unavailable.
    return summarizeGta6HomepageOffers([], 0);
  }
}

export async function readGameOffers(
  slug: string,
  platform: Platform,
  currency: Currency,
): Promise<GameResponse | null> {
  const rows = await prisma.$queryRaw<Result[]>`
    WITH fx AS (${gameOffersFx})
    SELECT now() AS stamp, fx.rate_date AS fx_date, s.offer_type AS kind,
      CASE WHEN s.id IS NOT NULL THEN jsonb_build_object(
        'market',s.market,'edition',s.edition,'store_product_id',s.store_product_id,'store_url',s.store_url,
        'currency',s.currency,'status',s.status,'verified_at',s.verified_at,'valid_until',s.valid_until,
        'tax_included',s.tax_included,'price',CASE WHEN s.price IS NOT NULL THEN s.price || jsonb_build_object(
          'converted_public_price',CASE WHEN s.currency=${currency} THEN s.price->>'public_price'
          ELSE round((s.price->>'public_price')::numeric *
            CASE ${currency}::text WHEN 'CNY' THEN fx.cny WHEN 'HKD' THEN fx.hkd ELSE 1 END /
            CASE s.currency WHEN 'HKD' THEN fx.hkd WHEN 'USD' THEN 1 END,2)::text END) END) END AS offer
    FROM products p LEFT JOIN game_offer_public_state s ON s.product_id=p.id AND s.platform=${platform}
    LEFT JOIN fx ON true WHERE p.slug=${slug} AND p.category='game' AND p.status='published'
    ORDER BY s.market,s.edition,s.offer_type
  `;
  if (!rows.length) return null;

  const meta = getGameCatalogMeta({ slug, name: slug });
  const hasRows = rows.some((row) => row.offer !== null);
  const unannounced = !hasRows && (platform === "pc" || Boolean(meta.unannouncedPlatforms[platform]));
  const now = rows[0].stamp.getTime();
  const fx = unannounced ? null : (rows[0].fx_date?.toISOString() ?? null);
  const full_games: GameOffer[] = [],
    upgrades: GameOffer[] = [],
    deadlines: number[] = [];
  for (const { kind, offer } of rows) {
    if (!offer) continue;
    (kind === "full_game" ? full_games : upgrades).push(offer);
    for (const date of [offer.valid_until, offer.price?.member_ends_at])
      if (date && Date.parse(date) > now) deadlines.push(Date.parse(date));
    if (fx && offer.price?.converted_public_price && offer.currency !== currency)
      deadlines.push(Date.parse(fx) + msPerWeek);
  }
  return {
    game: slug,
    platform,
    platform_status: unannounced ? "unannounced" : "listed",
    display_currency: currency,
    as_of: rows[0].stamp.toISOString(),
    fx_as_of: fx,
    next_change_at: deadlines.length ? new Date(Math.min(...deadlines)).toISOString() : null,
    full_games,
    upgrades,
  };
}

function toUsdAmount(amountStr: string | null, currency: string, rates: Record<string, number>): number | null {
  if (!amountStr) return null;
  const amount = Number(amountStr);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (currency === "USD") return amount;
  const rate = rates[currency];
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return amount / rate;
}

export async function readPublishedGameCatalog(): Promise<{
  games: GameCatalogItem[];
  displayRates: GameDisplayRateBundle;
}> {
  const [products, displayRates] = await Promise.all([
    prisma.product.findMany({
      where: {
        category: ProductCategory.GAME,
        status: PublishStatus.PUBLISHED,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        provider: true,
        description: true,
        officialUrl: true,
      },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    readGameDisplayRates(),
  ]);

  if (!products.length) {
    return { games: [], displayRates };
  }

  const productIds = products.map((product) => product.id);
  const stateRows = await prisma.$queryRaw<CatalogStateRow[]>`
    SELECT
      s.product_id,
      s.platform,
      s.market,
      s.edition,
      s.currency,
      s.status,
      s.verified_at,
      s.tax_included,
      s.price->>'public_price' AS public_price,
      s.price->>'base_price' AS base_price
    FROM game_offer_public_state s
    WHERE s.product_id IN (${Prisma.join(productIds.map((id) => Prisma.sql`${id}::uuid`))})
      AND s.offer_type = 'full_game'
    ORDER BY s.platform, s.edition, s.market
  `.catch((): CatalogStateRow[] => []);

  const consolePlatforms = ["ps5", "xbox"] as const;
  const games: GameCatalogItem[] = products.map((product) => {
    const meta = getGameCatalogMeta(product);
    const productRows = stateRows.filter((row) => row.product_id === product.id);
    const marketSet = new Set<string>();
    let latestVerifiedMs = 0;

    for (const row of productRows) {
      marketSet.add(row.market);
      if (row.verified_at) {
        const ms = row.verified_at.getTime();
        if (ms > latestVerifiedMs) latestVerifiedMs = ms;
      }
    }

    const variants: GameCatalogVariantRow[] = editions.flatMap((edition) =>
      consolePlatforms.map((platform) => {
        const matching = productRows.filter(
          (row) => row.platform === platform && row.edition === edition,
        );
        const valid = matching
          .filter((row) => row.public_price && Number(row.public_price) > 0)
          .map((row) => ({
            row,
            usd: toUsdAmount(row.public_price, row.currency, displayRates.rates),
          }));

        const sortedByUsd = [...valid]
          .filter((entry): entry is { row: CatalogStateRow; usd: number } => entry.usd !== null)
          .sort((a, b) => a.usd - b.usd);

        const lowestEntry = sortedByUsd[0] ?? valid[0] ?? null;
        const hkRow = valid.find((entry) => entry.row.market === "HK");
        const usRow = valid.find((entry) => entry.row.market === "US");

        const savingRatio =
          lowestEntry?.usd != null &&
          usRow?.usd != null &&
          usRow.usd > 0 &&
          lowestEntry.row.market !== "US"
            ? 1 - lowestEntry.usd / usRow.usd
            : null;
        const pct = savingRatio !== null ? savingsPercent(savingRatio) : null;

        return {
          platform,
          edition,
          lowestMarket: lowestEntry?.row.market ?? null,
          lowestCurrency: lowestEntry?.row.currency ?? null,
          lowestLocalPrice: lowestEntry?.row.public_price ?? null,
          lowestUsd: lowestEntry?.usd ?? null,
          hongKongPrice: hkRow?.row.public_price ?? null,
          usPrice: usRow?.row.public_price ?? null,
          usUsd: usRow?.usd ?? null,
          savingRatio,
          savingPercent: pct !== null && pct > 0 ? pct : null,
          verifiedCount: valid.length,
        };
      }),
    );

    const pricedVariants = variants.filter((variant) => variant.lowestUsd !== null);
    const bestVariant =
      [...pricedVariants].sort((a, b) => (a.lowestUsd ?? Infinity) - (b.lowestUsd ?? Infinity))[0] ??
      variants.find((variant) => variant.lowestLocalPrice !== null) ??
      null;

    const bestSavingPercent = variants.reduce<number | null>((acc, variant) => {
      if (variant.savingPercent === null) return acc;
      return acc === null ? variant.savingPercent : Math.max(acc, variant.savingPercent);
    }, null);

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      meta,
      variants,
      bestVariant,
      bestSavingPercent,
      marketCodes: [...marketSet],
      latestVerifiedAt: latestVerifiedMs > 0 ? new Date(latestVerifiedMs).toISOString() : null,
    };
  });

  return { games, displayRates };
}

export async function readGameDetailPage(
  slug: string,
  platform: Platform,
  currency: Currency,
): Promise<GameDetailBundle | null> {
  const product = await prisma.product.findFirst({
    where: {
      slug,
      category: ProductCategory.GAME,
      status: PublishStatus.PUBLISHED,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      provider: true,
      description: true,
      officialUrl: true,
    },
  });

  if (!product) return null;

  const meta = getGameCatalogMeta(product);
  const consoleTargets = (["ps5", "xbox"] as const).filter(
    (p) => meta.supportedPlatforms.includes(p) && !meta.unannouncedPlatforms[p],
  );
  const platformsToLoad = [...new Set<Platform>([platform, ...consoleTargets])];

  const [loadedOffers, displayRates] = await Promise.all([
    Promise.all(
      platformsToLoad.map(async (targetPlatform) => [
        targetPlatform,
        await readGameOffers(slug, targetPlatform, currency),
      ] as const),
    ),
    readGameDisplayRates(),
  ]);

  const offersByPlatform: Partial<Record<Platform, GameResponse>> = {};
  for (const [targetPlatform, offerData] of loadedOffers) {
    if (offerData) {
      offersByPlatform[targetPlatform] = offerData;
    }
  }

  const initialData = offersByPlatform[platform];
  if (!initialData) return null;

  return {
    product,
    meta,
    initialData,
    offersByPlatform,
    displayRates,
  };
}
