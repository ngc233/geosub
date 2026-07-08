import { requireAdmin } from "../../../../lib/admin-auth";
import { reconcileStaleCollectorRuns } from "../collection-runner";
import { getCollectorRunHistoryRows } from "../collector-run-history-query";

export async function GET(request: Request) {
  await requireAdmin();
  await reconcileStaleCollectorRuns();

  const url = new URL(request.url);
  const productQuery = String(url.searchParams.get("q") ?? "").trim();
  const rows = await getCollectorRunHistoryRows(productQuery);

  return Response.json({ rows });
}
