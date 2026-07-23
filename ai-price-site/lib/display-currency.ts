export const supportedDisplayCurrencies = [
  "USD",
  "CNY",
  "TWD",
  "HKD",
  "SGD",
  "EUR",
  "JPY",
  "KRW",
  "AUD",
  "CAD",
  "MYR",
  "IDR",
  "THB",
  "PHP",
  "VND",
  "TRY",
  "SAR",
  "GBP",
  "CHF",
  "INR",
  "BRL",
  "MXN",
  "AED",
  "NZD",
  "ZAR",
] as const;

export type DisplayCurrency = (typeof supportedDisplayCurrencies)[number];

const displayCurrencySymbolOverrides: Partial<
  Record<DisplayCurrency, string>
> = {
  TWD: "NT$",
  HKD: "HK$",
  SGD: "S$",
  AUD: "A$",
  CAD: "C$",
  NZD: "NZ$",
  MYR: "RM",
  IDR: "Rp",
  THB: "฿",
  PHP: "₱",
  VND: "₫",
};

const zeroFractionDisplayCurrencies = new Set<DisplayCurrency>([
  "JPY",
  "KRW",
  "IDR",
  "VND",
]);

export function isSupportedDisplayCurrency(
  currency: string,
): currency is DisplayCurrency {
  return supportedDisplayCurrencies.includes(currency as DisplayCurrency);
}

export function getDisplayCurrencySymbolOverride(
  currency: DisplayCurrency,
) {
  return displayCurrencySymbolOverrides[currency] || null;
}

export function getDisplayCurrencyFractionDigits(
  currency: DisplayCurrency,
) {
  return zeroFractionDisplayCurrencies.has(currency) ? 0 : 2;
}
