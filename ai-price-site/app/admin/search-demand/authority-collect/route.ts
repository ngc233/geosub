import {
  adminRouteJson,
  adminRouteRedirect,
  guardAdminRoute,
  logAdminRouteError,
  requestWantsJson,
} from "../../../../lib/admin-route-guard";
import { prisma } from "../../../../lib/prisma";
import { getProductSeoQualityAudit } from "../../../../lib/product-seo-quality-data";
import { buildAuthorityCoverageQueue } from "../../../../lib/search-authority-coverage";
import { startAuthorityCoverageTask } from "../../../../lib/admin-authority-coverage-tasks";
import { buildCollectionRedirectPath } from "../../review/collection-status";
import { queueAndRunAppStoreCollection } from "../../review/collection-runner";

function validProductSlug(value: FormDataEntryValue | null) {
  const slug = String(value || "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/u.test(slug)) {
    throw new Error("Invalid product slug.");
  }
  return slug;
}

export async function POST(request: Request) {
  const guard = await guardAdminRoute(request, {
    capability: "manage",
    verifyOrigin: true,
    forbiddenMessage: "当前账号没有采集权限。",
    routeName: "/admin/search-demand/authority-collect",
  });
  if (!guard.ok) return guard.response;

  const admin = guard.admin;
  const wantsJson = requestWantsJson(request);
  let redirectPath = "/admin/search-demand?authorityResult=failed";
  let status = 500;
  let productSlug = "";
  let requestId: string | undefined;

  try {
    const formData = await request.formData();
    productSlug = validProductSlug(formData.get("productSlug"));
    const audit = await getProductSeoQualityAudit(productSlug);
    const item = audit ? buildAuthorityCoverageQueue([audit], [])[0] : null;
    if (!audit || !item || item.actionKind !== "collect" || !item.gapCode) {
      throw new Error("Published product was not found.");
    }

    const result = await queueAndRunAppStoreCollection(productSlug);
    const task = await startAuthorityCoverageTask({
      audit,
      gapCode: item.gapCode,
      actionKind: item.actionKind,
      actionHref: item.actionHref,
      adminId: admin.id,
    });
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "queue_authority_coverage_collection",
        targetType: "product",
        targetId: audit.id,
        newValue: {
          productSlug,
          authorityTaskId: task.id,
          gapCode: item.gapCode,
          queuedCount: result.queuedCount,
          runStatus: result.runStatus,
        },
        note: `Started a product-scoped authority refresh for ${audit.title}.`,
      },
    });

    redirectPath = buildCollectionRedirectPath(result, productSlug);
    status = 200;
  } catch (error) {
    requestId = logAdminRouteError(
      "/admin/search-demand/authority-collect",
      error,
      {
        actorId: admin.id,
        target: productSlug || null,
      },
    );
  }

  if (wantsJson) {
    return adminRouteJson(
      { ok: status === 200, redirectPath, ...(requestId ? { requestId } : {}) },
      { status },
    );
  }

  return adminRouteRedirect(redirectPath, 303);
}
