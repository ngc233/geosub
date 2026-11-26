import {
  adminRouteJson,
  adminRouteRedirect,
  guardAdminRoute,
  logAdminRouteError,
  requestWantsJson,
} from "../../../../lib/admin-route-guard";
import { queueBatchAppStoreCollections } from "../../review/collection-runner";
import { normalizeBatchProductSlugs } from "../batch-collection";

export async function POST(request: Request) {
  const guard = await guardAdminRoute(request, {
    capability: "manage",
    verifyOrigin: true,
    forbiddenMessage: "当前账号没有采集权限。",
    routeName: "/admin/pipeline/collect",
  });
  if (!guard.ok) return guard.response;

  const formData = await request.formData();
  const productSlugs = normalizeBatchProductSlugs(formData.getAll("productSlugs"));
  const wantsJson = requestWantsJson(request);

  if (productSlugs.length === 0) {
    const payload = {
      ok: false,
      message: "请至少选择一个产品。",
      redirectPath: "/admin/pipeline?batchError=empty",
    };

    return wantsJson
      ? adminRouteJson(payload, { status: 400 })
      : adminRouteRedirect(payload.redirectPath, 303);
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
      ? adminRouteJson(payload)
      : adminRouteRedirect(redirectPath, 303);
  } catch (error) {
    const requestId = logAdminRouteError("/admin/pipeline/collect", error, {
      actorId: guard.admin.id,
      target: productSlugs.slice(0, 10).join(","),
    });
    const payload = {
      ok: false,
      message: "批量采集任务未能加入队列，请查看系统状态后重试。",
      redirectPath: "/admin/pipeline?batchError=failed",
      requestId,
    };

    return wantsJson
      ? adminRouteJson(payload, { status: 500 })
      : adminRouteRedirect(payload.redirectPath, 303);
  }
}
