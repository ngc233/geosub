import {
  getPreparedSiteLocaleDefinition,
  type PreparedSiteLocale,
} from "./site-locale.ts";
import {
  getDisplayCurrencyFractionDigits,
  getDisplayCurrencySymbolOverride,
  isSupportedDisplayCurrency,
} from "./display-currency.ts";

export type LocalizedDateInput = Date | string | number;

function toValidDate(value: LocalizedDateInput) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getIntlLocale(locale: PreparedSiteLocale) {
  return getPreparedSiteLocaleDefinition(locale).intlLocale;
}

export function formatLocalizedDate(
  value: LocalizedDateInput,
  locale: PreparedSiteLocale,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  },
) {
  const date = toValidDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat(getIntlLocale(locale), options).format(date);
}

export function formatLocalizedNumber(
  value: number,
  locale: PreparedSiteLocale,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(getIntlLocale(locale), options).format(value);
}

export function formatLocalizedCurrency(
  value: number,
  currency: string,
  locale: PreparedSiteLocale,
  options: Omit<Intl.NumberFormatOptions, "style" | "currency"> = {},
) {
  const normalizedCurrency = currency.toUpperCase();

  if (isSupportedDisplayCurrency(normalizedCurrency)) {
    const symbolOverride =
      getDisplayCurrencySymbolOverride(normalizedCurrency);

    if (symbolOverride) {
      const fractionDigits =
        options.maximumFractionDigits ??
        getDisplayCurrencyFractionDigits(normalizedCurrency);
      return `${symbolOverride}${new Intl.NumberFormat(getIntlLocale(locale), {
        minimumFractionDigits: options.minimumFractionDigits,
        maximumFractionDigits: fractionDigits,
        ...options,
      }).format(value)}`;
    }
  }

  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "currency",
    currency: normalizedCurrency,
    currencyDisplay: "symbol",
    ...options,
  }).format(value);
}

export function formatLocalizedPercent(
  value: number,
  locale: PreparedSiteLocale,
  options: Omit<Intl.NumberFormatOptions, "style"> = {},
) {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "percent",
    maximumFractionDigits: 0,
    ...options,
  }).format(value);
}

export function getLocalizedRegionName(
  regionCode: string,
  locale: PreparedSiteLocale,
) {
  const normalizedCode = regionCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalizedCode)) return null;

  try {
    const name = new Intl.DisplayNames([getIntlLocale(locale)], {
      type: "region",
      fallback: "none",
    }).of(normalizedCode);

    return name || null;
  } catch {
    return null;
  }
}
