import { requireAdmin } from "../../../../lib/admin-auth";
import { reconcileStaleCollectorRuns } from "../collection-runner";
import { getCollectorRunHistoryRows } from "../collector-run-history-query";

export async function GET(request: Request) {
  await requireAdmin();
  await reconcileStaleCollectorRuns();

  const url = new URL(request.url);
  const productQuery = String(url.searchParams.get("q") ?? "").trim();
  const product=String(url.searchParams.get("product") || "").trim().slice(0,120);
  const runId=String(url.searchParams.get("runId") || "");
  if(runId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runId))return Response.json({error:"运行记录标识无效"},{status:400});
  const rows = await getCollectorRunHistoryRows(productQuery,12,{product,runId});

  return Response.json({ rows, checkedAt: new Date().toISOString() },{headers:{"Cache-Control":"no-store"}});
}
