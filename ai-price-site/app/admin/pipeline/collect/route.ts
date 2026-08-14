import { requireAdmin } from "../../../../lib/admin-auth";
import { queueBatchAppStoreCollections } from "../../review/collection-runner";
import { normalizeBatchProductSlugs } from "../batch-collection";

export async function POST(request: Request) {
  await requireAdmin();

  const formData = await request.formData();
  const productSlugs = normalizeBatchProductSlugs(formData.getAll("productSlugs"));
  const wantsJson = request.headers.get("accept")?.includes("application/json");

  if (productSlugs.length === 0) {
    const payload = {
      ok: false,
      message: "请至少选择一个产品。",
      redirectPath: "/admin/pipeline?batchError=empty",
    };

    return wantsJson
      ? Response.json(payload, { status: 400 })
      : new Response(null, { status: 303, headers: { Location: payload.redirectPath } });
  }

  try {
    const result = await queueBatchAppStoreCollections(productSlugs);
    const params = new URLSearchParams({
      batchRequested: String(result.requestedCount),
      batchQueued: String(result.queuedCount),
      batchStarted: String(result.startedCount),
      batchProtected: String(result.protectedCount),
      batchSkipped: String(result.skippedCount),
      batchStartFailed: String(result.failedToStartCount),
    });
    const redirectPath = `/admin/pipeline?${params.toString()}`;
    const payload = { ok: true, result, redirectPath };

    return wantsJson
      ? Response.json(payload)
      : new Response(null, { status: 303, headers: { Location: redirectPath } });
  } catch {
    const payload = {
      ok: false,
      message: "批量采集任务未能加入队列，请查看系统状态后重试。",
      redirectPath: "/admin/pipeline?batchError=failed",
    };

    return wantsJson
      ? Response.json(payload, { status: 500 })
      : new Response(null, { status: 303, headers: { Location: payload.redirectPath } });
  }
}
