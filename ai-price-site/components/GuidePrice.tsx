"use client";
import { usePublicCurrency } from "./PublicCurrencySelect";
import { formatPublicPrice, publicBillingLabel } from "../lib/public-price-format";
import { canvasDefaultCurrency, canvasIntlLocale, type CanvasLocale } from "../lib/canvas-ui-copy";
import { getGuideArticleUiCopy } from "../lib/guide-hub-copy";

export default function GuidePrice({
  usd,
  cycle,
  rates,
  locale = "zh",
}: {
  usd: number;
  cycle: string;
  rates: Record<string, number>;
  locale?: CanvasLocale;
}) {
  const intlLocale = canvasIntlLocale(locale);
  const [preferred] = usePublicCurrency(canvasDefaultCurrency(locale, rates));
  const currency = rates[preferred] > 0 ? preferred : "USD";
  return (
    <span className="gs-guide-price flex flex-col gap-0.5 min-w-0 text-right">
      <span data-gs-number>
        {formatPublicPrice(usd * (rates[currency] ?? 1), currency, intlLocale)}{" "}
        <small>/ {publicBillingLabel(cycle, intlLocale)}</small>
      </span>
      {currency !== preferred && (
        <small>{getGuideArticleUiCopy(locale).fxFallbackUsd}</small>
      )}
    </span>
  );
}
