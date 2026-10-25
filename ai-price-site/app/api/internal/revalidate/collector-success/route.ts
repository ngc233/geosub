import { revalidatePath } from "next/cache";
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getCollectorPublicationClaim } from '../../../../../lib/collector-build-proof';
import { isValidInternalRevalidationToken } from "../../../../../lib/internal-revalidation-auth";
import { prisma } from "../../../../../lib/prisma";
import { invalidatePublicPricingFromRoute } from "../../../../../lib/public-pricing-cache-actions";
import { getCollectionRevalidationPaths } from "../../../../../app/admin/review/collection-revalidation";

export const dynamic = "force-dynamic";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const internalRequest = isValidInternalRevalidationToken(
      request.headers.get("x-geosub-internal-revalidation"),
    );
  let buildClaim: string | null = null;
  if (!internalRequest && request.headers.has('x-geosub-collector-publication')) {
    try {
      const preview = JSON.parse(readFileSync(path.join(process.cwd(), '.next', 'prerender-manifest.json'), 'utf8')).preview?.previewModeId;
      buildClaim = getCollectorPublicationClaim(request.headers.get('x-geosub-collector-publication'), preview || '');
    } catch { /* A missing build manifest never authorizes a request. */ }
  }
  if (!internalRequest && !buildClaim) {
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
  if (buildClaim && buildClaim !== jobId) return new Response(null, { status: 404 });

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
  if (buildClaim) {
    const allowed = await prisma.$queryRaw<{ allowed: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM collector_jobs job JOIN products product ON product.id=job.product_id
        WHERE job.id=${jobId}::uuid AND job.status='active' AND product.slug IN ('spotify','apple-music')
        AND job.job_config->>'collector_kind'='pricing_page'
        AND job.job_config->>'official_web_source_key'=product.slug) AS allowed`;
    if (!allowed[0]?.allowed) return new Response(null, { status: 404 });
  }
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
