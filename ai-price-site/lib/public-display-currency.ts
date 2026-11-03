import { getDisplayCurrencyFractionDigits, getDisplayCurrencySymbolOverride, isSupportedDisplayCurrency, type DisplayCurrency } from "./display-currency.ts";
import type { ExchangeRateSnapshot } from "./exchange-rates";

export type PublicDisplayRates = Partial<Record<DisplayCurrency, ExchangeRateSnapshot>>;
export const PUBLIC_CURRENCY_STORAGE_KEY = "geosub.display-currency";

// Use the existing reader's eligibility flags; persistence must never revive an expired rate.
export function usableDisplayCurrency(currency: DisplayCurrency, rates: PublicDisplayRates) {
  if (currency === "USD") return true;
  const rate = rates[currency];
  return Boolean(rate && !rate.isFallback && !rate.isExpired && Number.isFinite(rate.rate) && rate.rate > 0);
}

export function publicCurrencyPreference(value: string | null): DisplayCurrency {
  return value && isSupportedDisplayCurrency(value) ? value : "CNY";
}

export function resolvePublicCurrency(preference: DisplayCurrency, rates: PublicDisplayRates): DisplayCurrency {
  return usableDisplayCurrency(preference, rates) ? preference : "USD";
}

export function formatPublicPrice(valueUsd: number, currency: DisplayCurrency, rate?: number) {
  const displayRate = currency === "USD" ? 1 : rate;
  if (!Number.isFinite(valueUsd) || displayRate === undefined || !Number.isFinite(displayRate) || displayRate <= 0) return "—";
  const options = { minimumFractionDigits: getDisplayCurrencyFractionDigits(currency), maximumFractionDigits: getDisplayCurrencyFractionDigits(currency) };
  const value = valueUsd * displayRate;
  if (currency === "USD") return `$${value.toFixed(2)}`;
  const symbol = getDisplayCurrencySymbolOverride(currency);
  return symbol ? `${symbol}${new Intl.NumberFormat("zh-CN", options).format(value)}`
    : new Intl.NumberFormat("zh-CN", { ...options, style: "currency", currency, currencyDisplay: "symbol" }).format(value);
}
