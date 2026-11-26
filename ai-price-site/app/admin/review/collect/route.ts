import { safeAdminReturnTo } from "@/lib/admin-workflow-context";
import {
  adminRouteJson,
  adminRouteRedirect,
  guardAdminRoute,
  logAdminRouteError,
  requestWantsJson,
} from "../../../../lib/admin-route-guard";
import { buildCollectionRedirectPath } from "../collection-status";
import { queueAndRunAppStoreCollection } from "../collection-runner";

export async function POST(request: Request) {
  const guard = await guardAdminRoute(request, {
    capability: "manage",
    verifyOrigin: true,
    forbiddenMessage: "当前账号没有采集权限。",
    routeName: "/admin/review/collect",
  });
  if (!guard.ok) return guard.response;

  const formData = await request.formData();
  const productSlug = String(formData.get("productSlug") ?? "").trim();
  const wantsJson = requestWantsJson(request);
  let redirectPath: string;
  let ok = true;
  let queuedCount = 0;
  let runStatus = "failed";
  let requestId: string | undefined;

  try {
    const result = await queueAndRunAppStoreCollection(productSlug);
    queuedCount = result.queuedCount;
    runStatus = result.runStatus;
    redirectPath = buildCollectionRedirectPath(result, productSlug);
  } catch (error) {
    ok = false;
    requestId = logAdminRouteError("/admin/review/collect", error, {
      actorId: guard.admin.id,
      target: productSlug || null,
    });
    redirectPath = buildCollectionRedirectPath(
      {
        queuedCount: 0,
        runStatus: "failed",
      },
      productSlug,
    );
  }

  if (formData.get("returnTo")) {
    const url = new URL(redirectPath, "http://admin.local");
    url.searchParams.set(
      "returnTo",
      safeAdminReturnTo(formData.get("returnTo"), "/admin/pipeline"),
    );
    redirectPath = url.pathname + url.search + url.hash;
  }

  if (wantsJson) {
    return adminRouteJson(
      {
        ok,
        redirectPath,
        queuedCount,
        runStatus,
        ...(requestId ? { requestId } : {}),
      },
      {
        status: ok ? 200 : 500,
      },
    );
  }

  return adminRouteRedirect(redirectPath, 303);
}
