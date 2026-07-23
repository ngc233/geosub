"use client";

import { ArrowLeftRight, Check, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getDisplayCurrencySymbolOverride,
  getDisplayCurrencyFractionDigits,
  supportedDisplayCurrencies,
  type DisplayCurrency,
} from "../lib/display-currency";
import {
  getSiteLocaleDefinition,
  type SiteLocale,
} from "../lib/site-locale";
import type { CurrencyConverterCopy } from "../lib/currency-converter-copy";

export type ConverterRate = {
  currency: DisplayCurrency;
  rate: number;
  source: string | null;
  rateDate: string | null;
  fetchedAt: string | null;
  isStale: boolean;
};

const quickAmounts = [4.99, 9.99, 19.99, 24.99];

function getCurrencyName(currency: DisplayCurrency, locale: SiteLocale) {
  try {
    return (
      new Intl.DisplayNames([getSiteLocaleDefinition(locale).intlLocale], {
        type: "currency",
        fallback: "code",
      }).of(currency) || currency
    );
  } catch {
    return currency;
  }
}

function formatCurrency(
  value: number,
  currency: DisplayCurrency,
  locale: SiteLocale,
) {
  const intlLocale = getSiteLocaleDefinition(locale).intlLocale;
  const formatter = new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: getDisplayCurrencyFractionDigits(currency),
    maximumFractionDigits: getDisplayCurrencyFractionDigits(currency),
  });
  const symbolOverride = getDisplayCurrencySymbolOverride(currency);

  if (!symbolOverride) return formatter.format(value);

  return formatter
    .formatToParts(value)
    .map((part) => (part.type === "currency" ? symbolOverride : part.value))
    .join("");
}

function getCurrencySymbol(currency: DisplayCurrency, locale: SiteLocale) {
  const symbolOverride = getDisplayCurrencySymbolOverride(currency);
  if (symbolOverride) return symbolOverride;

  return (
    new Intl.NumberFormat(getSiteLocaleDefinition(locale).intlLocale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value || currency
  );
}

function formatRate(value: number, locale: SiteLocale) {
  return new Intl.NumberFormat(getSiteLocaleDefinition(locale).intlLocale, {
    minimumFractionDigits: value >= 1000 ? 0 : 2,
    maximumFractionDigits: value >= 1000 ? 2 : 6,
  }).format(value);
}

function getNumberSeparators(locale: SiteLocale) {
  const parts = new Intl.NumberFormat(
    getSiteLocaleDefinition(locale).intlLocale,
  ).formatToParts(12345.6);

  return {
    decimal: parts.find((part) => part.type === "decimal")?.value || ".",
    group: parts.find((part) => part.type === "group")?.value || ",",
  };
}

function parseAmount(value: string, locale: SiteLocale) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const { decimal, group } = getNumberSeparators(locale);
  const normalized = trimmed
    .replace(/\s|\u00a0|\u202f/g, "")
    .replaceAll(group, "")
    .replace(decimal, ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function ConverterCurrencySelect({
  value,
  onChange,
  label,
  disabledCurrencies,
  locale,
  align = "start",
}: {
  value: DisplayCurrency;
  onChange: (currency: DisplayCurrency) => void;
  label: string;
  disabledCurrencies: DisplayCurrency[];
  locale: SiteLocale;
  align?: "start" | "end";
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={[
          "flex h-12 w-full items-center justify-between gap-2 rounded-md border px-3 text-start text-sm font-semibold shadow-sm outline-none transition-all duration-200 ease-out",
          open
            ? "border-lime-400 bg-white text-zinc-950 ring-4 ring-lime-500/10"
            : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50",
        ].join(" ")}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="w-7 shrink-0 text-center text-zinc-400">
            {getCurrencySymbol(value, locale)}
          </span>
          <span className="truncate">{getCurrencyName(value, locale)}</span>
          <span className="shrink-0 text-xs font-medium text-zinc-400">
            {value}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={[
            "size-4 shrink-0 text-zinc-400 transition-transform duration-200 ease-out",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={label}
          className={[
            "absolute top-14 z-[70] max-h-[344px] w-[480px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-900/10",
            align === "end" ? "end-0" : "start-0",
          ].join(" ")}
        >
          <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
            {supportedDisplayCurrencies.map((currency) => {
              const active = currency === value;
              const disabled = disabledCurrencies.includes(currency);

              return (
                <button
                  key={currency}
                  type="button"
                  disabled={disabled}
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    if (!disabled) {
                      onChange(currency);
                      setOpen(false);
                    }
                  }}
                  className={[
                    "grid min-h-10 w-full grid-cols-[30px_minmax(0,1fr)_38px_14px] items-center gap-2 rounded-md px-2.5 py-1.5 text-start text-[13px] font-semibold transition-colors duration-200 ease-out",
                    active
                      ? "bg-lime-50 text-lime-800"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950",
                    disabled ? "cursor-not-allowed opacity-35" : "",
                  ].join(" ")}
                >
                  <span className="text-center text-zinc-400">
                    {getCurrencySymbol(currency, locale)}
                  </span>
                  <span className="min-w-0 truncate">
                    {getCurrencyName(currency, locale)}
                  </span>
                  <span className="text-end text-[11px] font-medium tabular-nums text-zinc-400">
                    {currency}
                  </span>
                  {active ? (
                    <Check aria-hidden="true" className="size-3.5 text-lime-600" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function SubscriptionCurrencyConverter({
  rates,
  locale,
  copy,
  initialFromCurrency = "USD",
  initialToCurrency,
}: {
  rates: ConverterRate[];
  locale: SiteLocale;
  copy: CurrencyConverterCopy;
  initialFromCurrency?: DisplayCurrency;
  initialToCurrency?: DisplayCurrency;
}) {
  const localeDefinition = getSiteLocaleDefinition(locale);
  const preferredCurrency = localeDefinition.defaultCurrency as DisplayCurrency;
  const initialTarget =
    initialToCurrency ||
    (preferredCurrency === initialFromCurrency ? "EUR" : preferredCurrency);
  const [amount, setAmount] = useState(() =>
    new Intl.NumberFormat(localeDefinition.intlLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(19.99),
  );
  const [fromCurrency, setFromCurrency] =
    useState<DisplayCurrency>(initialFromCurrency);
  const [toCurrency, setToCurrency] =
    useState<DisplayCurrency>(initialTarget);

  const rateMap = useMemo(
    () => new Map(rates.map((item) => [item.currency, item])),
    [rates],
  );
  const disabledCurrencies = supportedDisplayCurrencies.filter((currency) => {
    const rate = rateMap.get(currency);
    return !rate || rate.rate <= 0 || rate.isStale;
  });

  function convert(
    value: number,
    from: DisplayCurrency,
    to: DisplayCurrency,
  ) {
    const fromRate = rateMap.get(from)?.rate || 0;
    const toRate = rateMap.get(to)?.rate || 0;
    if (fromRate <= 0 || toRate <= 0) return null;
    return (value / fromRate) * toRate;
  }

  const numericAmount = parseAmount(amount, locale);
  const convertedAmount =
    numericAmount === null
      ? null
      : convert(numericAmount, fromCurrency, toCurrency);
  const pairRate = convert(1, fromCurrency, toCurrency);
  const involvedRates = [rateMap.get(fromCurrency), rateMap.get(toCurrency)]
    .filter((item): item is ConverterRate => Boolean(item))
    .filter((item) => item.currency !== "USD");
  const rateDate =
    involvedRates
      .map((item) => item.rateDate)
      .filter((value): value is string => Boolean(value))
      .sort()[0] || null;
  const pairIsStale = involvedRates.some((item) => item.isStale);
  const comparisonCurrencies = Array.from(
    new Set<DisplayCurrency>([
      preferredCurrency,
      "USD",
      "EUR",
      "CNY",
      "JPY",
      "KRW",
      "TWD",
      "HKD",
      "SGD",
    ]),
  );

  function swapCurrencies() {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  }

  return (
    <div className="overflow-visible rounded-lg border border-zinc-200 bg-white shadow-sm shadow-zinc-950/[0.04]">
      <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)] md:items-end md:gap-3 md:p-7">
        <div>
          <label
            htmlFor="converter-amount"
            className="mb-2 block text-sm font-semibold text-zinc-700"
          >
            {copy.amountLabel}
          </label>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_190px]">
            <input
              id="converter-amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              aria-label={copy.amountAria}
              className="h-12 min-w-0 rounded-md border border-zinc-300 bg-white px-4 text-lg font-semibold tabular-nums text-zinc-950 outline-none transition focus:border-lime-500 focus:ring-2 focus:ring-lime-100"
            />
            <ConverterCurrencySelect
              value={fromCurrency}
              onChange={setFromCurrency}
              label={copy.fromAria}
              disabledCurrencies={disabledCurrencies}
              locale={locale}
              align="end"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={swapCurrencies}
          title={copy.swap}
          aria-label={copy.swapAria}
          className="mx-auto inline-flex size-10 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition hover:border-lime-300 hover:bg-lime-50 hover:text-lime-700 focus:outline-none focus:ring-2 focus:ring-lime-200 md:mb-1"
        >
          <ArrowLeftRight aria-hidden="true" size={18} />
        </button>

        <div>
          <span className="mb-2 block text-sm font-semibold text-zinc-700">
            {copy.toLabel}
          </span>
          <ConverterCurrencySelect
            value={toCurrency}
            onChange={setToCurrency}
            label={copy.toAria}
            disabledCurrencies={disabledCurrencies}
            locale={locale}
          />
        </div>
      </div>

      <div
        className="border-y border-lime-200 bg-lime-50 px-4 py-6 sm:px-6 md:px-7"
        aria-live="polite"
      >
        <p className="text-sm text-lime-800">
          {numericAmount === null
            ? copy.invalidAmount
            : `${formatCurrency(numericAmount, fromCurrency, locale)} ${copy.approximately}`}
        </p>
        <div className="mt-1 break-words text-3xl font-bold tabular-nums text-lime-800 md:text-4xl">
          {convertedAmount === null
            ? copy.unavailable
            : formatCurrency(convertedAmount, toCurrency, locale)}
        </div>
        {pairRate !== null ? (
          <p className="mt-3 text-sm tabular-nums text-lime-700">
            1 {fromCurrency} = {formatRate(pairRate, locale)} {toCurrency}
          </p>
        ) : null}
      </div>

      <div className="grid gap-7 p-4 sm:p-6 md:grid-cols-[1fr_1.35fr] md:p-7">
        <div>
          <h2 className="text-base font-semibold text-zinc-950">
            {copy.quickTitle}
          </h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            {copy.quickDescription}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {quickAmounts.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setAmount(
                    new Intl.NumberFormat(localeDefinition.intlLocale, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(value),
                  );
                  setFromCurrency(initialFromCurrency);
                }}
                className="h-10 rounded-md border border-zinc-200 bg-white text-sm font-semibold tabular-nums text-zinc-700 transition hover:border-lime-300 hover:bg-lime-50 hover:text-lime-700"
              >
                {formatCurrency(value, initialFromCurrency, locale)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold text-zinc-950">
            {copy.comparisonTitle}
          </h2>
          <div className="mt-3 divide-y divide-zinc-100 border-y border-zinc-100">
            {comparisonCurrencies
              .filter((currency) => currency !== fromCurrency)
              .slice(0, 5)
              .map((currency) => {
                const value =
                  numericAmount === null
                    ? null
                    : convert(numericAmount, fromCurrency, currency);
                return (
                  <div
                    key={currency}
                    className="flex min-h-11 items-center justify-between gap-4 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate text-zinc-500">
                      {getCurrencyName(currency, locale)}{" "}
                      <span className="text-xs">{currency}</span>
                    </span>
                    <strong className="shrink-0 tabular-nums text-zinc-950">
                      {value === null
                        ? copy.unavailableShort
                        : formatCurrency(value, currency, locale)}
                    </strong>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 border-t border-zinc-100 bg-zinc-50 px-4 py-4 text-xs leading-5 text-zinc-500 sm:px-6 md:flex-row md:items-center md:justify-between md:px-7">
        <span>
          {pairIsStale
            ? copy.stale
            : `${copy.rateBasis} ${rateDate || copy.pending}`}
        </span>
        <span>{copy.resultNote}</span>
      </div>
    </div>
  );
}
