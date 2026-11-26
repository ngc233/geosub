import type { Metadata } from "next";
import GameDetailPageView, {
  buildGameDetailMetadata,
} from "../../../../components/games/GameDetailPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return {
    ...(await buildGameDetailMetadata("en", params)),
    robots: { index: false, follow: false },
  };
}

export default function EnGameDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <GameDetailPageView locale="en" params={params} searchParams={searchParams} />;
}
