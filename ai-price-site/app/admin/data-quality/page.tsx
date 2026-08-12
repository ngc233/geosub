import { measureAdminWorkload } from "../../../lib/admin-performance";
import { readAdminReadModel } from "../../../lib/admin-read-model-cache";
import { DataQualityOverview } from "./DataQualityOverview";
import {
  countByHealth,
  getProductHealth,
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
  const goodCount = countByHealth(rows, "good");
  const infoCount = countByHealth(rows, "info");
  const warningCount = countByHealth(rows, "warning");
  const dangerCount = countByHealth(rows, "danger");
  const autoClosedTotal = rows.reduce(
    (sum, row) => sum + row.auto_closed_observation_count,
    0,
  );
  const autoRepairProductCount = rows.filter(
    (row) =>
      row.anomaly_refresh_status === "active" ||
      row.stale_refresh_status === "active" ||
      row.coverage_refresh_status === "active" ||
      (row.hard_anomaly_count > 0 && row.anomaly_refresh_success_count < 3) ||
      (row.stale_published_count > 0 && row.stale_refresh_success_count < 3) ||
      (row.missing_pair_count > 0 && row.coverage_refresh_success_count < 3) ||
      row.pending_stability_count > 0,
  ).length;
  const needsConfigurationCount = rows.filter(
    (row) =>
      row.active_app_store_job_count <= 0 || row.latest_run_status === "failed",
  ).length;
  const coverageGapProductCount = rows.filter(
    (row) => row.missing_pair_count > 0,
  ).length;

  return (
    <DataQualityOverview
      rows={rows}
      latestRepairCycle={latestRepairCycle}
      goodCount={goodCount}
      infoCount={infoCount}
      warningCount={warningCount}
      dangerCount={dangerCount}
      autoClosedTotal={autoClosedTotal}
      autoRepairProductCount={autoRepairProductCount}
      needsConfigurationCount={needsConfigurationCount}
      coverageGapProductCount={coverageGapProductCount}
    />
  );
}