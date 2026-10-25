import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getCountryHubRows, type CountryHubPrice } from "./country-hubs";

type CountryRow = Omit<CountryHubPrice, "amount"> & { amount: unknown };
export async function getCountryHub(countryCode: string) {
  const prices = await prisma.$queryRaw<CountryRow[]>`
      SELECT p.slug AS "productSlug", p.name AS "productName", p.category::text AS category,
        pl.slug AS "planSlug", pl.name AS "planName", c.code AS "countryCode",
        rp.local_price AS amount, rp.currency, rp.billing_platform::text AS platform,
        pl.billing_cycle::text AS "billingCycle", rp.price_type::text AS "priceType",
        rp.data_quality::text AS quality, rp.confidence_score AS confidence,
        to_char(rp.last_checked_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "checkedAt",
        evidence.source_url AS "sourceUrl",
        CASE WHEN jsonb_typeof(evidence.raw_payload #> '{raw_snapshot,inAppPurchases}') = 'array'
          AND UPPER(evidence.raw_payload #>> '{raw_snapshot,country}') = c.code
          AND evidence.raw_payload #>> '{raw_snapshot,planSpecSlug}' = pl.slug
          THEN evidence.id::text ELSE NULL END AS "observationId"
      FROM region_prices rp
      JOIN products p ON p.id = rp.product_id AND p.status = 'published' AND p.category IN ('ai', 'streaming')
      JOIN plans pl ON pl.id = rp.plan_id AND pl.product_id = p.id AND pl.status = 'published'
      JOIN countries c ON c.id = rp.country_id
      JOIN LATERAL (
        SELECT po.id, po.source_url, po.raw_payload FROM price_observations po
        WHERE po.plan_id = pl.id AND po.product_id = p.id AND po.country_id = c.id
          AND po.source_id = rp.primary_source_id AND po.billing_platform = rp.billing_platform
          AND po.price_type = rp.price_type AND po.raw_price = rp.local_price AND po.currency = rp.currency
          AND po.status = 'approved' AND NOT po.anomaly_flag AND po.confidence_score >= 80
          AND po.observed_at <= NOW()
        ORDER BY po.observed_at DESC, po.id DESC LIMIT 1
      ) evidence ON TRUE
      WHERE c.code IN (${countryCode}, 'US') AND rp.status = 'published'
        AND rp.data_quality = 'verified' AND rp.confidence_score >= 80
        AND rp.billing_platform = 'ios' AND rp.price_type = 'list_price' AND pl.billing_cycle = 'monthly'
        -- The original approval may be old: routine same-price rechecks are
        -- ignored by the reviewer. Require both an approved baseline above
        -- and a recent, identical confirmation; never publish an ignored row.
        AND EXISTS (
          SELECT 1 FROM price_observations confirmed
          WHERE confirmed.product_id = rp.product_id AND confirmed.plan_id = rp.plan_id
            AND confirmed.country_id = rp.country_id AND confirmed.source_id = rp.primary_source_id
            AND confirmed.billing_platform = rp.billing_platform AND confirmed.price_type = rp.price_type
            AND confirmed.raw_price = rp.local_price AND confirmed.currency = rp.currency
            AND LOWER(confirmed.source_url) LIKE 'https://apps.apple.com/' || LOWER(c.code) || '/%'
            AND NOT confirmed.anomaly_flag AND confirmed.confidence_score >= 80
            AND confirmed.observed_at BETWEEN NOW() - INTERVAL '14 days' AND NOW()
            AND (confirmed.status = 'approved' OR (
              confirmed.status = 'ignored'
              AND confirmed.raw_payload ->> 'auto_review_reason_code' = 'superseded_by_published_price'
            ))
        )
      ORDER BY p.slug, pl.slug, c.code
    `;
  const currencies = [...new Set(prices.map(price => price.currency).filter(currency => currency !== "USD"))];
  // Keep UTC text across the raw-query adapter boundary. A database session in
  // another timezone must not make evidence appear eight hours in the future.
  const rateRows = currencies.length ? await prisma.$queryRaw<Array<{
    currency: string; rate: unknown; source: string | null; rateDate: string; fetchedAt: string;
  }>>(Prisma.sql`
    SELECT DISTINCT ON (quote_currency) quote_currency AS currency, rate, source,
      rate_date::text AS "rateDate",
      to_char(fetched_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "fetchedAt"
    FROM exchange_rates WHERE base_currency = 'USD' AND status = 'active'
      AND quote_currency IN (${Prisma.join(currencies)})
    ORDER BY quote_currency, rate_date DESC, fetched_at DESC
  `) : [];
  const rates = Object.fromEntries(rateRows.map(rate => [rate.currency, { ...rate, rate: Number(rate.rate), isFallback: false }]));
  return getCountryHubRows(prices.map(price => ({ ...price, amount: Number(price.amount) })), countryCode, rates);
}
