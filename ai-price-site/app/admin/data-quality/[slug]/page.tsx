import AdminProductContext from "../../../../components/admin/AdminProductContext";
import { notFound } from "next/navigation";
import { measureAdminWorkload } from "../../../../lib/admin-performance";
import { getCollectorRunHistoryRows } from "../../review/collector-run-history-query";
import ProductDataQualityView from "./ProductDataQualityView";
import {
  getAvailabilitySummaryRows,
  getMissingCountryRows,
  getPendingReasonRows,
  getPlanCoverageRows,
  getProductSummary,
} from "./queries";

export const dynamic = "force-dynamic";

export default async function ProductDataQualityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ page?: string;returnTo?:string }>;
}) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const product = await measureAdminWorkload("data-quality-detail.product", () =>
    getProductSummary(slug),
  );

  if (!product) {
    notFound();
  }

  const [plans, missingRows, reasonRows, availabilityRows, collectorRuns] =
    await measureAdminWorkload("data-quality-detail.page-data", () =>
      Promise.all([
        getPlanCoverageRows(product.id),
        getMissingCountryRows(product.id),
        getPendingReasonRows(product.id),
        getAvailabilitySummaryRows(product.id),
        getCollectorRunHistoryRows(product.slug, 8),
      ]),
    );

  return (
    <>
    <AdminProductContext id={product.id} slug={product.slug} name={product.name} returnTo={query.returnTo} />
    <ProductDataQualityView
      returnTo={query.returnTo}
      listPage={query.page}
      product={product}
      plans={plans}
      missingRows={missingRows}
      reasonRows={reasonRows}
      availabilityRows={availabilityRows}
      collectorRuns={collectorRuns}
    />
    </>
  );
}