/** Display guard only. The existing reader owns the 18h stale / 7d expiry policy. */
export function canDisplayConverterRate(rate: { rate: number; isExpired: boolean } | undefined): boolean {
  return !!rate && Number.isFinite(rate.rate) && rate.rate > 0 && !rate.isExpired;
}
