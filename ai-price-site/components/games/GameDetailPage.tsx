import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCategory, PublishStatus } from "@prisma/client";
import GameCanvasClient from "../../app/zh/games/[slug]/GameCanvasClient";
import { getGameDetailMetadataCopy } from "./game-ui-copy";
import {
  canvasDefaultCurrency,
  resolveCanvasLocale,
  type CanvasLocale,
} from "../../lib/canvas-ui-copy";
import { getGameCatalogMeta } from "../../lib/game-catalog-meta";
import { currencies, memberOf, selectionFrom, type Currency } from "../../lib/game-offers";
import { prisma } from "../../lib/prisma";
import {
  readGameDetailPage,
  readGameDisplayRates,
  type GameDetailBundle,
} from "../../lib/read-game-offers";
import "../../app/zh/games/[slug]/game.css";

export async function buildGameDetailMetadata(
  locale: CanvasLocale,
  params: Promise<{ slug: string }>,
): Promise<Metadata> {
  const resolvedLocale = resolveCanvasLocale(locale);
  const { slug } = await params;
  const product = await prisma.product
    .findFirst({
      where: { slug, category: ProductCategory.GAME, status: PublishStatus.PUBLISHED },
      select: { slug: true, name: true, provider: true, description: true, officialUrl: true },
    })
    .catch(() => null);

  if (!product) {
    return {
      ...getGameDetailMetadataCopy(resolvedLocale, null),
      robots: { index: false, follow: false },
    };
  }

  const meta = getGameCatalogMeta(product, resolvedLocale);
  return {
    ...getGameDetailMetadataCopy(resolvedLocale, meta),
    robots: { index: false, follow: false },
  };
}

export default async function GameDetailPageView({
  locale,
  params,
  searchParams,
}: {
  locale: CanvasLocale;
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedLocale = resolveCanvasLocale(locale);
  const { slug } = await params;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") query.set(key, value);
  }

  const initialDefaultCurrency = canvasDefaultCurrency(resolvedLocale);
  const selection = selectionFrom(query, initialDefaultCurrency);
  const explicitCurrency = query.get("currency");
  const apiCurrency: Currency = memberOf(currencies, selection.currency)
    ? selection.currency
    : "USD";

  let bundle: GameDetailBundle | null = null;
  let readFailed = false;
  try {
    bundle = await readGameDetailPage(slug, selection.platform, apiCurrency, resolvedLocale);
  } catch {
    readFailed = true;
  }

  if (bundle) {
    const resolvedSelection = selectionFrom(
      query,
      canvasDefaultCurrency(resolvedLocale, bundle.displayRates.rates),
    );
    return (
      <GameCanvasClient
        locale={resolvedLocale}
        slug={slug}
        meta={bundle.meta}
        initial={resolvedSelection}
        explicitUrlCurrency={explicitCurrency}
        initialData={bundle.initialData}
        offersByPlatform={bundle.offersByPlatform}
        rates={bundle.displayRates.rates}
        rateDates={bundle.displayRates.rateDates}
      />
    );
  }

  if (!readFailed) {
    notFound();
  }

  const fallbackProduct = await prisma.product
    .findFirst({
      where: { slug, category: ProductCategory.GAME, status: PublishStatus.PUBLISHED },
      select: { slug: true, name: true, provider: true, description: true, officialUrl: true },
    })
    .catch(() => null);
  if (!fallbackProduct) {
    notFound();
  }

  const displayRates = await readGameDisplayRates().catch(() => ({
    rates: { USD: 1 },
    rateDates: { USD: null },
  }));
  const fallbackSelection = selectionFrom(
    query,
    canvasDefaultCurrency(resolvedLocale, displayRates.rates),
  );

  return (
    <GameCanvasClient
      locale={resolvedLocale}
      slug={slug}
      meta={getGameCatalogMeta(fallbackProduct, resolvedLocale)}
      initial={fallbackSelection}
      explicitUrlCurrency={explicitCurrency}
      initialData={null}
      offersByPlatform={{}}
      rates={displayRates.rates}
      rateDates={displayRates.rateDates}
    />
  );
}
