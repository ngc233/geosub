import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GameDirectoryClient from "../GameDirectoryClient";
import { getGamesDirectoryMetadataCopy } from "./game-ui-copy";
import { resolveCanvasLocale, type CanvasLocale } from "../../lib/canvas-ui-copy";
import { readPublishedGameCatalog } from "../../lib/read-game-offers";
import { isGameNavigationPublished } from "../../lib/site-navigation";
import "../../app/public-listing.css";
import "../../app/zh/games/games.css";

export function getGamesDirectoryMetadata(locale: CanvasLocale): Metadata {
  const copy = getGamesDirectoryMetadataCopy(locale);
  return {
    title: copy.title,
    description: copy.description,
    robots: { index: false, follow: false },
  };
}

export default async function GamesDirectoryPage({
  locale,
}: {
  locale: CanvasLocale;
}) {
  const resolvedLocale = resolveCanvasLocale(locale);
  if (!(await isGameNavigationPublished())) notFound();
  const { games, displayRates } = await readPublishedGameCatalog(resolvedLocale);
  if (!games.length) notFound();

  return (
    <div className="gs-public-unified gs-listing gs-game-listing">
      <GameDirectoryClient
        locale={resolvedLocale}
        games={games}
        rates={displayRates.rates}
      />
    </div>
  );
}
