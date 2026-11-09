/** Shared display-price policy for the rebuilt public pages. Currency selection
 * still shows ISO codes; this formatter changes presentation, never conversion. */
const symbols: Readonly<Record<string, string>> = {
  CNY: "¥", USD: "$", JPY: "JP¥", HKD: "HK$", TWD: "NT$", EUR: "€", GBP: "£",
};
// Prices in a matrix share the same locale/precision. Reuse the formatter
// across cells and animation frames; bound memory for nonstandard callers.
const numberFormats = new Map<string, Intl.NumberFormat>();
export function formatPublicPrice(value: number, currency: string, locale = "zh-CN", fractionDigits = 2) {
  if (!Number.isFinite(value)) return "";
  const code = currency.trim().toUpperCase();
  const key = JSON.stringify([locale, fractionDigits]);
  let number = numberFormats.get(key);
  if (!number) {
    number = new Intl.NumberFormat(locale, {
      minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits,
    });
    if (numberFormats.size >= 32) numberFormats.delete(numberFormats.keys().next().value!);
    numberFormats.set(key, number);
  }
  const amount = number.format(value);
  return `${symbols[code] ?? code} ${amount}`;
}
export function publicBillingLabel(cycle: string) {
  const normalized = cycle.toLowerCase();
  return ({ monthly: "月", yearly: "年", weekly: "周" } as Record<string, string>)[normalized] ?? cycle;
}
