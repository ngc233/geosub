import { prisma } from "./prisma";
import { msPerWeek, type Currency, type GameOffer, type GameResponse, type Platform } from "./game-offers";

type Result = { stamp: Date; fx_date: Date | null; kind: string | null; offer: GameOffer | null };
export async function readGameOffers(
  slug: string,
  platform: Platform,
  currency: Currency,
): Promise<GameResponse | null> {
  if (slug !== "gta-6") return null;
  // Cross rates use a single provider and effective date. Keep the native price if one leg is missing.
  const rows = await prisma.$queryRaw<Result[]>`
    WITH fx AS (
      SELECT rate_date, source, max(rate) FILTER (WHERE quote_currency='HKD') AS hkd,
             max(rate) FILTER (WHERE quote_currency='CNY') AS cny
      FROM exchange_rates WHERE base_currency='USD' AND quote_currency IN ('HKD','CNY')
        AND status='active' AND rate>0 AND rate_date <= (now() AT TIME ZONE 'UTC')::date
        AND (rate_date::timestamp AT TIME ZONE 'UTC') + interval '7 days' > now()
      GROUP BY rate_date, source ORDER BY rate_date DESC, count(DISTINCT quote_currency) DESC, source LIMIT 1
    )
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
  const now = rows[0].stamp.getTime();
  const fx = platform === "pc" ? null : (rows[0].fx_date?.toISOString() ?? null);
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
    platform_status: platform === "pc" ? "unannounced" : "listed",
    display_currency: currency,
    as_of: rows[0].stamp.toISOString(),
    fx_as_of: fx,
    next_change_at: deadlines.length ? new Date(Math.min(...deadlines)).toISOString() : null,
    full_games,
    upgrades,
  };
}
