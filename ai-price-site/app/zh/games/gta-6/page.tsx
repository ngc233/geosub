import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { selectionFrom, type GameResponse } from "@/lib/game-offers";
import { readGameOffers } from "@/lib/read-game-offers";
import GameComparison from "./GameComparison";
import "./game.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "GTA 6 地区价格对比", robots: { index: false, follow: false } };
export default async function GamePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams))
    if (typeof value === "string") query.set(key, value);
  const selection = selectionFrom(query);
  let data: GameResponse | null;
  try {
    data = await readGameOffers("gta-6", selection.platform, selection.currency);
  } catch {
    return <GameComparison initial={selection} initialData={null} />;
  }
  if (!data) notFound();
  return <GameComparison initial={selection} initialData={data} />;
}
