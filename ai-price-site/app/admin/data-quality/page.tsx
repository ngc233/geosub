import { measureAdminWorkload } from "../../../lib/admin-performance";
import { readAdminReadModel } from "../../../lib/admin-read-model-cache";
import { countAdminOperationalAssessments } from "../../../lib/admin-operational-status";
import { DataQualityOverview } from "./DataQualityOverview";
import {
  getProductHealth,
  getProductCollectionState,
  getProductOperationalAssessment,
  healthPriority,
} from "./model";
import {
  getLatestRepairCycle,
  getProductQualityRows,
} from "./queries";

export const dynamic = "force-dynamic";
export default async function AdminDataQualityPage() {
  const [qualityRows, latestRepairCycle] = await measureAdminWorkload(
    "data-quality.page-data",
    () => Promise.all([
      readAdminReadModel(
        "data-quality:product-summary",
        getProductQualityRows,
        8_000,
      ),
      getLatestRepairCycle(),
    ]),
  );
  const rows = qualityRows.sort((a, b) => {
    const healthA = getProductHealth(a);
    const healthB = getProductHealth(b);
    const priorityDiff = healthPriority(healthA.level) - healthPriority(healthB.level);

    if (priorityDiff !== 0) return priorityDiff;
    if (a.pending_observation_count !== b.pending_observation_count) {
      return b.pending_observation_count - a.pending_observation_count;
    }

    return a.name.localeCompare(b.name, "zh-CN");
  });
  const operationalCounts = countAdminOperationalAssessments(
    rows.map(getProductOperationalAssessment),
  );
  const coverageGapProductCount = rows.filter((row) => {
    const collectionState = getProductCollectionState(row);
    return (
      (collectionState === "app_store_active" ||
        collectionState === "app_store_paused") &&
      row.missing_pair_count > 0
    );
  }).length;

  return (
    <DataQualityOverview
      rows={rows}
      latestRepairCycle={latestRepairCycle}
      operationalCounts={operationalCounts}
      coverageGapProductCount={coverageGapProductCount}
    />
  );
}
