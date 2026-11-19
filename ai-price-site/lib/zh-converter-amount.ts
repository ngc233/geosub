import { canDisplayConverterRate } from "./converter-display.ts";
import { getDisplayCurrencyFractionDigits, type DisplayCurrency } from "./display-currency.ts";
import { formatPublicPrice } from "./public-price-format.ts";

export const zhConverterMaximumAmount = "9,999,999,999.99";
const maximumCents = BigInt(zhConverterMaximumAmount.replace(/[,.]/g, ""));
const hundred = BigInt(100);
const two = BigInt(2);

type Decimal = { numerator: bigint; divisor: bigint };
type Amount = { status: "ok"; text: string; decimal: Decimal };
type ParsedAmount = Amount | { status: "invalid" | "too-large" };
type Rate = { rate: number; isExpired: boolean };

const powerOfTen = (exponent: number) => BigInt(10) ** BigInt(exponent);

// Read decimal digits directly. Internally supplied rates may use exponential notation.
function decimalFromText(text: string): Decimal {
  const [mantissa, exponent = "0"] = text.split("e");
  const [whole, fraction = ""] = mantissa.split(".");
  const coefficient = BigInt(whole + fraction);
  const scale = fraction.length - Number(exponent);
  return scale >= 0
    ? { numerator: coefficient, divisor: powerOfTen(scale) }
    : { numerator: coefficient * powerOfTen(-scale), divisor: BigInt(1) };
}

function exceedsLimit({ numerator, divisor }: Decimal) {
  return numerator * hundred > maximumCents * divisor;
}

export function parseZhConverterAmount(input: string): ParsedAmount {
  const text = input.trim();
  if (!/^(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d*)?|\.\d+)$/.test(text)) {
    return { status: "invalid" };
  }

  const [whole, fraction = ""] = text.replaceAll(",", "").split(".");
  const integerDigits = whole.replace(/^0+/, "") || "0";
  if (integerDigits.length > 10) return { status: "too-large" };
  const fractionalDigits = fraction.replace(/0+$/, "");
  const normalized = fractionalDigits ? `${integerDigits}.${fractionalDigits}` : integerDigits;
  const decimal = decimalFromText(normalized);
  return exceedsLimit(decimal) ? { status: "too-large" } : { status: "ok", text: normalized, decimal };
}

function roundToMinorUnits({ numerator, divisor }: Decimal, units: bigint) {
  // Amounts are non-negative. Keep the half-unit comparison exact.
  return (numerator * units * two + divisor) / (divisor * two);
}

export function convertZhAmount(amount: Amount, from: Rate | undefined, to: Rate | undefined, currency: DisplayCurrency) {
  if (!from || !to || !canDisplayConverterRate(from) || !canDisplayConverterRate(to)) {
    return { status: "unavailable" } as const;
  }
  const sourceRate = decimalFromText(String(from.rate));
  const targetRate = decimalFromText(String(to.rate));
  const converted = {
    numerator: amount.decimal.numerator * sourceRate.divisor * targetRate.numerator,
    divisor: amount.decimal.divisor * sourceRate.numerator * targetRate.divisor,
  };
  if (exceedsLimit(converted)) return { status: "too-large" } as const;

  const units = powerOfTen(getDisplayCurrencyFractionDigits(currency));
  const minorUnits = roundToMinorUnits(converted, units);
  // For whole-unit currencies, rounding can move an in-range value over the limit.
  if (minorUnits * hundred > maximumCents * units) return { status: "too-large" } as const;
  return { status: "ok", value: Number(minorUnits) / Number(units) } as const;
}

export function formatZhSourceAmount(amount: Amount, currency: DisplayCurrency) {
  const digits = getDisplayCurrencyFractionDigits(currency);
  const units = powerOfTen(digits);
  const minorUnits = roundToMinorUnits(amount.decimal, units);
  if (minorUnits === BigInt(0) && amount.decimal.numerator > BigInt(0)) {
    // Keep a tiny positive source amount legible instead of labeling it as zero.
    return formatPublicPrice(0, currency, "zh-CN", 0).replace(/0$/, amount.text);
  }
  return formatPublicPrice(Number(minorUnits) / Number(units), currency, "zh-CN", digits);
}
