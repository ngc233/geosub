import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CurrencyConverterPage, {
  getCurrencyConverterMetadata,
} from "./CurrencyConverterPage";
import { getCurrencyPair } from "../lib/currency-pairs";
import type { SiteLocale } from "../lib/site-locale";

export function getCurrencyPairRouteMetadata(
  locale: SiteLocale,
  pairSlug: string,
): Metadata {
  const pair = getCurrencyPair(locale, pairSlug);

  if (!pair) {
    return {
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return getCurrencyConverterMetadata(locale, pair);
}

export default function CurrencyPairRoutePage({
  locale,
  pairSlug,
}: {
  locale: SiteLocale;
  pairSlug: string;
}) {
  const pair = getCurrencyPair(locale, pairSlug);
  if (!pair) notFound();

  return <CurrencyConverterPage locale={locale} pair={pair} />;
}
