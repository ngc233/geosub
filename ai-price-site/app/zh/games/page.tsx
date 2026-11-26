import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GameDirectoryClient from "../../../components/GameDirectoryClient";
import { readPublishedGameCatalog } from "../../../lib/read-game-offers";
import { isGameNavigationPublished } from "../../../lib/site-navigation";
import "../../public-listing.css";
import "./games.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "游戏比价",
  description:
    "对比主机数字版游戏在港服、美服等官方商店的公开买断价格，同平台、同版本按实时汇率折算到手差价。",
  robots: { index: false, follow: false },
};

export default async function GamesPage() {
  if (!(await isGameNavigationPublished())) notFound();
  const { games, displayRates } = await readPublishedGameCatalog();
  if (!games.length) notFound();

  return (
    <div className="gs-public-unified gs-listing gs-game-listing">
      <GameDirectoryClient games={games} rates={displayRates.rates} />
    </div>
  );
}
