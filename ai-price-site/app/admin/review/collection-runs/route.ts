import {
  adminRouteJson,
  guardAdminRoute,
} from "../../../../lib/admin-route-guard";
import { reconcileStaleCollectorRuns } from "../collection-runner";
import { getCollectorRunHistoryRows } from "../collector-run-history-query";

export async function GET(request: Request) {
  const guard = await guardAdminRoute(request, {
    capability: "read",
    forceJson: true,
    routeName: "/admin/review/collection-runs",
  });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const productQuery = String(url.searchParams.get("q") ?? "").trim();
  const product = String(url.searchParams.get("product") || "")
    .trim()
    .slice(0, 120);
  const runId = String(url.searchParams.get("runId") || "");
  if (
    runId &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      runId,
    )
  ) {
    return adminRouteJson({ error: "运行记录标识无效" }, { status: 400 });
  }

  await reconcileStaleCollectorRuns();
  const rows = await getCollectorRunHistoryRows(productQuery, 12, {
    product,
    runId,
  });

  return adminRouteJson({ rows, checkedAt: new Date().toISOString() });
}
