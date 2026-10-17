import { preproductionRuntime, publicPromotion } from "../../../../lib/first-party-promotion";
import { readPromotionState, readPromotionRevision, readPromotionReview } from "../../../../lib/first-party-promotion-store";
import { prisma } from "../../../../lib/prisma";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0", "CDN-Cache-Control": "no-store", "Cloudflare-CDN-Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.search !== "?path=%2Fzh" || !preproductionRuntime()) return Response.json({ card: null }, { headers });
  try {
    const card = await prisma.$transaction(async (tx) => {
      const state = await readPromotionState(tx);
      const revision = state.revision ? await readPromotionRevision(state.revision, tx) : null;
      const review = revision ? await readPromotionReview(revision.id, tx) : null;
      return publicPromotion(state, revision, review);
    }, { isolationLevel: "RepeatableRead" });
    return Response.json({ card }, { headers });
  } catch { return Response.json({ card: null }, { headers, status: 503 }); }
}
