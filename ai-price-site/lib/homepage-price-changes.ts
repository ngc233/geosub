import { getPriceChanges, type PriceObservationRecord } from "./price-records.ts";

export const HOMEPAGE_CHANGE_DAYS = 30;
export const HOMEPAGE_CHANGE_LIMIT = 6;
const day = 86_400_000;
/** Historical local-price changes, never changes caused by FX conversion.
 * The caller retains rejected/ambiguous records as sequence boundaries. */
export function homepagePriceChanges(records: PriceObservationRecord[], now = new Date(), truncated = false) {
  if (truncated) return [];
  const end = now.getTime(), start = end - HOMEPAGE_CHANGE_DAYS * day;
  return getPriceChanges(records.filter(row => Date.parse(row.observedAt) <= end))
    .filter(event => Date.parse(event.after.observedAt) >= start)
    .slice(0, HOMEPAGE_CHANGE_LIMIT)
    .map(({ before, after, direction, percent }) => ({
      id: after.id, productSlug: after.productSlug, productName: after.productName,
      planName: after.planName, countryCode: after.countryCode, observedAt: after.observedAt,
      before: before.amount, after: after.amount, currency: after.currency,
      billingCycle: after.billingCycle, direction, percent,
      href: `/zh/price-history/${after.productSlug}`,
    }));
}
export type HomepagePriceChange = ReturnType<typeof homepagePriceChanges>[number];
