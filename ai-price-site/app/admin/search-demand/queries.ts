import {
  getSearchDemandSummary,
  type SearchDemandRange,
} from "../../../lib/admin-search-demand";
import { getSearchOpportunityRecords } from "../../../lib/admin-search-opportunities";
import { getSearchAliasRecords } from "../../../lib/admin-search-aliases";
import { getSearchConversionDiagnostics } from "../../../lib/admin-search-conversion-diagnostics";
import { measureAdminWorkload } from "../../../lib/admin-performance";
import { getCachedProductSeoQualityAudits } from "../../../lib/product-seo-quality-data";
import { getSearchConversionRepairRecords } from "../../../lib/admin-search-conversion-repairs";
import { getAuthorityCoverageTaskRecords } from "../../../lib/admin-authority-coverage-tasks";

export async function loadSearchDemandData(days: SearchDemandRange) {
  const summaryPromise = measureAdminWorkload("search-demand.summary", () =>
    getSearchDemandSummary(days),
  );
  const productAuditsPromise = getCachedProductSeoQualityAudits();
  const workflowRecordsPromise = getSearchOpportunityRecords();
  const aliasRecordsPromise = getSearchAliasRecords();
  const summary = await summaryPromise;
  const [
    workflowRecords,
    aliasRecords,
    conversionDiagnostics,
    repairRecords,
    productAudits,
    authorityTaskRecords,
  ] = await measureAdminWorkload(
    "search-demand.supporting-data",
    () => Promise.all([
      workflowRecordsPromise,
      aliasRecordsPromise,
      productAuditsPromise.then((audits) =>
        getSearchConversionDiagnostics(summary.conversionTerms, audits)
      ),
      getSearchConversionRepairRecords(summary.conversionTerms),
      productAuditsPromise,
      productAuditsPromise.then((audits) => getAuthorityCoverageTaskRecords(audits)),
    ]),
  );

  return {
    summary,
    workflowRecords,
    aliasRecords,
    conversionDiagnostics,
    repairRecords,
    productAudits,
    authorityTaskRecords,
  };
}

export type SearchDemandPageData = Awaited<
  ReturnType<typeof loadSearchDemandData>
>;
