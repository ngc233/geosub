import type { Metadata } from "next";
import Link from "next/link";
import SubscriptionCurrencyConverter, {
  type ConverterRate,
} from "./SubscriptionCurrencyConverter";
import { getCurrencyConverterCopy } from "../lib/currency-converter-copy";
import {
  getCurrencyPairCopy,
  getCurrencyPairLocales,
  getFeaturedCurrencyPairs,
  type CurrencyPair,
} from "../lib/currency-pairs";
import {
  getDisplayCurrencyFractionDigits,
  supportedDisplayCurrencies,
  type DisplayCurrency,
} from "../lib/display-currency";
import { getLatestUsdExchangeRates } from "../lib/exchange-rates";
import {
  getSiteLocaleDefinition,
  siteLocaleDefinitions,
  type SiteLocale,
} from "../lib/site-locale";

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
  return new Intl.NumberFormat(getSiteLocaleDefinition(locale).intlLocale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: getDisplayCurrencyFractionDigits(currency),
    maximumFractionDigits: getDisplayCurrencyFractionDigits(currency),
  }).format(value);
}

function getPairPresentation(locale: SiteLocale, pair: CurrencyPair) {
  const copy = getCurrencyPairCopy(locale);
  const fromName = getCurrencyName(pair.from, locale);
  const toName = getCurrencyName(pair.to, locale);
  const pairCode = `${pair.from}/${pair.to}`;

  return {
    copy,
    fromName,
    toName,
    title: copy.title(fromName, toName, pairCode),
    description: copy.description(
      fromName,
      toName,
      pair.from,
      pair.to,
    ),
  };
}

export function getCurrencyConverterMetadata(
  locale: SiteLocale,
  pair?: CurrencyPair,
): Metadata {
  const copy = getCurrencyConverterCopy(locale);
  const pairPresentation = pair
    ? getPairPresentation(locale, pair)
    : null;
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://geosub.org"
  ).replace(/\/$/, "");
  const pairLocales = pair ? getCurrencyPairLocales(pair.slug) : [];
  const defaultPairLocale = pairLocales.includes("en")
    ? "en"
    : pairLocales[0];
  const pairPath = pair
    ? `/tools/currency-converter/${pair.slug}`
    : null;

  return {
    title: pairPresentation?.title || copy.metadataTitle,
    description: pairPresentation?.description || copy.metadataDescription,
    robots: {
      index: true,
      follow: true,
    },
    ...(pair && pairPath
      ? {
          alternates: {
            canonical: `${siteUrl}/${siteLocaleDefinitions[locale].path}${pairPath}`,
            languages: {
              ...Object.fromEntries(
                pairLocales.map((pairLocale) => [
                  siteLocaleDefinitions[pairLocale].htmlLang,
                  `${siteUrl}/${siteLocaleDefinitions[pairLocale].path}${pairPath}`,
                ]),
              ),
              ...(defaultPairLocale
                ? {
                    "x-default": `${siteUrl}/${siteLocaleDefinitions[defaultPairLocale].path}${pairPath}`,
                  }
                : {}),
            },
          },
        }
      : {}),
  };
}

export async function getConverterRates(): Promise<ConverterRate[]> {
  const snapshots = await getLatestUsdExchangeRates(
    supportedDisplayCurrencies,
  );

  return supportedDisplayCurrencies.map((currency) => {
    if (currency === "USD") {
      return {
        currency,
        rate: 1,
        source: null,
        rateDate: null,
        fetchedAt: null,
        isStale: false,
      };
    }

    const snapshot = snapshots[currency];
    return {
      currency,
      rate: snapshot?.rate || 0,
      source: snapshot?.source || null,
      rateDate: snapshot?.rateDate || null,
      fetchedAt: snapshot?.fetchedAt || null,
      isStale: !snapshot || Boolean(snapshot.isStale),
    };
  });
}

export default async function CurrencyConverterPage({
  locale,
  pair,
}: {
  locale: SiteLocale;
  pair?: CurrencyPair;
}) {
  const copy = getCurrencyConverterCopy(locale);
  const localeDefinition = getSiteLocaleDefinition(locale);
  const rates = await getConverterRates();
  const pairPresentation = pair
    ? getPairPresentation(locale, pair)
    : null;
  const pairCopy = pairPresentation?.copy;
  const rateMap = new Map(rates.map((item) => [item.currency, item]));
  const fromRate = pair ? rateMap.get(pair.from)?.rate || 0 : 0;
  const toRate = pair ? rateMap.get(pair.to)?.rate || 0 : 0;
  const pairRate =
    pair && fromRate > 0 && toRate > 0 ? toRate / fromRate : null;
  const pairRateDate = pair
    ? [rateMap.get(pair.from), rateMap.get(pair.to)]
        .filter((item): item is ConverterRate => Boolean(item))
        .filter((item) => item.currency !== "USD")
        .map((item) => item.rateDate)
        .filter((value): value is string => Boolean(value))
        .sort()[0] || null
    : null;
  const pairQuestions =
    pair && pairCopy
      ? [
          {
            question: pairCopy.faqRate(pair.from, pair.to),
            answer: pairCopy.faqRateAnswer,
          },
          {
            question: pairCopy.faqCalculation,
            answer: pairCopy.faqCalculationAnswer(pair.from, pair.to),
          },
          {
            question: pairCopy.faqCharge,
            answer: pairCopy.faqChargeAnswer,
          },
        ]
      : copy.questions;
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://geosub.org"
  ).replace(/\/$/, "");
  const basePath = `/${localeDefinition.path}/tools/currency-converter`;
  const pageUrl = `${siteUrl}${basePath}${pair ? `/${pair.slug}` : ""}`;
  const pageTitle = pairPresentation?.title || copy.title;
  const pageDescription = pairPresentation?.description || copy.description;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: pageTitle,
      description: pageDescription,
      url: pageUrl,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any",
      isAccessibleForFree: true,
      inLanguage: localeDefinition.htmlLang,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: pairQuestions.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ];

  return (
    <main className="min-h-screen bg-[#faf8f3]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 md:py-14">
        <header className="mb-7 max-w-3xl">
          <p className="text-sm font-semibold text-lime-700">
            {pairCopy?.eyebrow || copy.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-zinc-950 md:text-4xl">
            {pageTitle}
          </h1>
          <p className="mt-4 text-base leading-7 text-zinc-600">
            {pageDescription}
          </p>
        </header>

        <SubscriptionCurrencyConverter
          rates={rates}
          locale={locale}
          copy={copy}
          initialFromCurrency={pair?.from}
          initialToCurrency={pair?.to}
        />

        {pair && pairCopy && pairPresentation ? (
          <>
            <section className="mt-8 grid gap-6 border-t border-zinc-200 pt-7 md:grid-cols-[0.9fr_1.1fr]">
              <article>
                <h2 className="text-base font-semibold text-zinc-950">
                  {pairCopy.currentRate}
                </h2>
                <p className="mt-3 text-3xl font-bold tabular-nums text-zinc-950">
                  {pairRate === null
                    ? copy.unavailable
                    : `1 ${pair.from} = ${new Intl.NumberFormat(
                        localeDefinition.intlLocale,
                        {
                          minimumFractionDigits: pairRate >= 1000 ? 0 : 2,
                          maximumFractionDigits: pairRate >= 1000 ? 2 : 6,
                        },
                      ).format(pairRate)} ${pair.to}`}
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  {pairRateDate
                    ? `${copy.rateBasis} ${pairRateDate}`
                    : copy.pending}
                </p>
              </article>

              <article>
                <h2 className="text-base font-semibold text-zinc-950">
                  {pairCopy.examplesTitle}
                </h2>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  {pairCopy.examplesDescription(pair.from, pair.to)}
                </p>
                <div className="mt-3 divide-y divide-zinc-100 border-y border-zinc-100">
                  {[5, 10, 20, 50, 100].map((amount) => (
                    <div
                      key={amount}
                      className="flex min-h-10 items-center justify-between gap-4 py-2 text-sm"
                    >
                      <span className="text-zinc-500">
                        {formatCurrency(amount, pair.from, locale)}
                      </span>
                      <strong className="tabular-nums text-zinc-950">
                        {pairRate === null
                          ? copy.unavailableShort
                          : formatCurrency(
                              amount * pairRate,
                              pair.to,
                              locale,
                            )}
                      </strong>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="mt-8 grid gap-6 border-t border-zinc-200 pt-7 md:grid-cols-2">
              <article>
                <h2 className="text-sm font-semibold text-zinc-950">
                  {pairCopy.methodologyTitle}
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {pairCopy.methodology}
                </p>
              </article>
              <article>
                <h2 className="text-sm font-semibold text-zinc-950">
                  {pairCopy.paymentTitle}
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {pairCopy.paymentNote}
                </p>
              </article>
            </section>

            <section className="mt-8 border-t border-zinc-200 pt-7">
              <h2 className="text-sm font-semibold text-zinc-950">
                {pairCopy.popularPairs}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {getFeaturedCurrencyPairs(locale)
                  .filter((item) => item.slug !== pair.slug)
                  .map((item) => (
                    <Link
                      key={item.slug}
                      href={`${basePath}/${item.slug}`}
                      className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-600 transition hover:border-lime-300 hover:bg-lime-50 hover:text-lime-800"
                    >
                      {item.from}/{item.to}
                    </Link>
                  ))}
                <Link
                  href={basePath}
                  className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-950"
                >
                  {pairCopy.backToConverter}
                </Link>
              </div>
            </section>
          </>
        ) : (
          <section className="mt-8 border-t border-zinc-200 pt-7">
            <h2 className="text-sm font-semibold text-zinc-950">
              {getCurrencyPairCopy(locale).popularPairs}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {getFeaturedCurrencyPairs(locale).map((item) => (
                <Link
                  key={item.slug}
                  href={`${basePath}/${item.slug}`}
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-600 transition hover:border-lime-300 hover:bg-lime-50 hover:text-lime-800"
                >
                  {item.from}/{item.to}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8 border-t border-zinc-200 pt-7">
          <div className="grid gap-x-8 gap-y-7 md:grid-cols-3">
            {pairQuestions.map((item) => (
              <article key={item.question}>
                <h2 className="text-sm font-semibold text-zinc-950">
                  {item.question}
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
