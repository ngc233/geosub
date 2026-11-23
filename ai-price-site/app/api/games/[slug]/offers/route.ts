import { currencies, memberOf, platforms } from "@/lib/game-offers";
import { readGameOffers } from "@/lib/read-game-offers";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const query = new URL(request.url).searchParams;
  const platform = query.get("platform"),
    currency = query.get("display_currency") ?? "CNY";
  if (!memberOf(platforms, platform) || !memberOf(currencies, currency))
    return Response.json({ error: "invalid_selection" }, { status: 400, headers });
  try {
    const { slug } = await context.params;
    const data = await readGameOffers(slug, platform, currency);
    return data
      ? Response.json(data, { headers })
      : Response.json({ error: "game_not_found" }, { status: 404, headers });
  } catch {
    return Response.json({ error: "offers_unavailable" }, { status: 503, headers });
  }
}
