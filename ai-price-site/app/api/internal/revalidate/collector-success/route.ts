import { revalidatePath } from "next/cache";
import { isValidInternalRevalidationToken } from "../../../../../lib/internal-revalidation-auth";
import { prisma } from "../../../../../lib/prisma";
import { invalidatePublicPricingFromRoute } from "../../../../../lib/public-pricing-cache-actions";
import { getCollectionRevalidationPaths } from "../../../../../app/admin/review/collection-revalidation";

export const dynamic = "force-dynamic";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (
    !isValidInternalRevalidationToken(
      request.headers.get("x-geosub-internal-revalidation"),
    )
  ) {
    return new Response(null, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const jobId =
    body && typeof body === "object" && "jobId" in body
      ? String(body.jobId)
      : "";
  if (!uuidPattern.test(jobId)) {
    return Response.json({ error: "invalid_job_id" }, { status: 400 });
  }

  const job = await prisma.collectorJob.findUnique({
    where: { id: jobId },
    select: {
      product: {
        select: {
          slug: true,
          plans: {
            select: { slug: true },
          },
        },
      },
    },
  });
  const productSlug = job?.product?.slug ?? null;
  const planSlugs = job?.product?.plans.map((plan) => plan.slug) ?? [];

  invalidatePublicPricingFromRoute(productSlug);
  for (const pathToRevalidate of getCollectionRevalidationPaths(
    productSlug,
    planSlugs,
  )) {
    revalidatePath(pathToRevalidate);
  }

  return new Response(null, { status: 204 });
}
