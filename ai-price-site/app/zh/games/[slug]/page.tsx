import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCategory, PublishStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getGameCatalogMeta } from "@/lib/game-catalog-meta";
import { selectionFrom } from "@/lib/game-offers";
import {
  readGameDetailPage,
  readGameDisplayRates,
  type GameDetailBundle,
} from "@/lib/read-game-offers";
import GameCanvasClient from "./GameCanvasClient";
import "./game.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product
    .findFirst({
      where: { slug, category: ProductCategory.GAME, status: PublishStatus.PUBLISHED },
      select: { slug: true, name: true, provider: true, description: true, officialUrl: true },
    })
    .catch(() => null);

  if (!product) {
    return {
      title: "游戏比价",
      robots: { index: false, follow: false },
    };
  }

  const meta = getGameCatalogMeta(product);
  return {
    title: `${meta.title} 各区价格对比`,
    description: `对比《${meta.englishTitle ?? meta.title}》在 PS5 与 Xbox 各地区官方数字商店的公开买断价格、版本差价与汇率折算。`,
    robots: { index: false, follow: false },
  };
}

export default async function GameDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") query.set(key, value);
  }
  const selection = selectionFrom(query);
  const explicitCurrency = query.get("currency");

  let bundle: GameDetailBundle | null = null;
  let readFailed = false;
  try {
    bundle = await readGameDetailPage(slug, selection.platform, selection.currency);
  } catch {
    readFailed = true;
  }

  if (bundle) {
    return (
      <GameCanvasClient
        slug={slug}
        meta={bundle.meta}
        initial={selection}
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

  return (
    <GameCanvasClient
      slug={slug}
      meta={getGameCatalogMeta(fallbackProduct)}
      initial={selection}
      explicitUrlCurrency={explicitCurrency}
      initialData={null}
      offersByPlatform={{}}
      rates={displayRates.rates}
      rateDates={displayRates.rateDates}
    />
  );
}
