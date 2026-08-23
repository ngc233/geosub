import { NextResponse } from "next/server";
import { getLatestUsdExchangeRates } from "../../../../lib/exchange-rates";
import { getPricingDetailProduct } from "../../../../lib/pricing-detail-adapter";
import { buildPricingReportDataset } from "../../../../lib/pricing-report";
import { renderPricingReportPdf } from "../../../../lib/pricing-report-pdf";
import { isSiteLocale } from "../../../../lib/site-locale";

export const runtime = "nodejs";
export const revalidate = 3600;

const REPORT_SUFFIX = "-global-pricing.pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; filename: string }> },
) {
  const { locale, filename } = await params;
  if (!isSiteLocale(locale) || !filename.endsWith(REPORT_SUFFIX)) {
    return new NextResponse("Report not found", { status: 404 });
  }

  const productSlug = filename.slice(0, -REPORT_SUFFIX.length);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productSlug)) {
    return new NextResponse("Report not found", { status: 404 });
  }

  const product = await getPricingDetailProduct(productSlug, locale);
  if (!product || !product.plans.some((plan) => plan.regions.length > 0)) {
    return new NextResponse("Report not found", { status: 404 });
  }

  const currencies = product.plans.flatMap((plan) =>
    plan.regions.map((region) => region.currencyCode || "USD"),
  );
  const exchangeRates = await getLatestUsdExchangeRates(currencies);
  const dataset = buildPricingReportDataset({ product, exchangeRates, locale });
  const pdf = await renderPricingReportPdf(dataset);

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "Content-Disposition": `inline; filename="${productSlug}-${locale}-global-pricing.pdf"`,
      "Content-Type": "application/pdf",
      "Content-Language": locale,
      ETag: `"${dataset.snapshotId}-${locale}"`,
      Link: `<${dataset.canonicalReportUrl}>; rel="canonical"`,
      "X-GeoSub-Dataset-Version": dataset.datasetVersion,
      "X-GeoSub-Snapshot-Id": dataset.snapshotId,
    },
  });
}
