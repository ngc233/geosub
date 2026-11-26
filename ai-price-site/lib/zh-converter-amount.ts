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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseZhConverterAmount(
  input: string,
  separators?: { decimal?: string; group?: string },
): ParsedAmount {
  const decimal = separators?.decimal || ".";
  const rawGroup = separators?.group ?? (decimal === "," ? "." : ",");
  const group = rawGroup === decimal ? (decimal === "," ? "." : ",") : rawGroup;
  const trimmed = input.trim();
  const normalizedInput = /\s/.test(group)
    ? trimmed.replace(/[\s\u00a0\u202f]+/g, group)
    : trimmed;
  const escDecimal = escapeRegExp(decimal);
  const escGroup = escapeRegExp(group);
  const pattern = new RegExp(
    `^(?:(?:\\d+|\\d{1,3}(?:${escGroup}\\d{3})+)(?:${escDecimal}\\d*)?|${escDecimal}\\d+)$`,
  );
  if (!pattern.test(normalizedInput)) {
    return { status: "invalid" };
  }

  const withoutGroups = group ? normalizedInput.replaceAll(group, "") : normalizedInput;
  const [whole, fraction = ""] = withoutGroups.split(decimal);
  const integerDigits = whole.replace(/^0+/, "") || "0";
  if (integerDigits.length > 10) return { status: "too-large" };
  const fractionalDigits = fraction.replace(/0+$/, "");
  const normalized = fractionalDigits ? `${integerDigits}.${fractionalDigits}` : integerDigits;
  const parsedDecimal = decimalFromText(normalized);
  return exceedsLimit(parsedDecimal)
    ? { status: "too-large" }
    : { status: "ok", text: normalized, decimal: parsedDecimal };
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

export function formatZhSourceAmount(
  amount: Amount,
  currency: DisplayCurrency,
  intlLocale = "zh-CN",
) {
  const digits = getDisplayCurrencyFractionDigits(currency);
  const units = powerOfTen(digits);
  const minorUnits = roundToMinorUnits(amount.decimal, units);
  if (minorUnits === BigInt(0) && amount.decimal.numerator > BigInt(0)) {
    const decimalSeparator =
      new Intl.NumberFormat(intlLocale)
        .formatToParts(1.1)
        .find((part) => part.type === "decimal")?.value || ".";
    const localizedText =
      decimalSeparator === "."
        ? amount.text
        : amount.text.replace(".", decimalSeparator);
    // Keep a tiny positive source amount legible instead of labeling it as zero.
    return formatPublicPrice(0, currency, intlLocale, 0).replace(/0$/, localizedText);
  }
  return formatPublicPrice(Number(minorUnits) / Number(units), currency, intlLocale, digits);
}
