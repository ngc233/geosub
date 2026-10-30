import { safeAdminReturnTo } from "@/lib/admin-workflow-context";
import { canAdmin } from "../../../../lib/admin-permissions";
import { requireAdmin } from "../../../../lib/admin-auth";
import { buildCollectionRedirectPath } from "../collection-status";
import { queueAndRunAppStoreCollection } from "../collection-runner";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!canAdmin(admin.role, "manage")) return Response.json({ok:false,message:"当前账号没有采集权限。"},{status:403});

  const formData = await request.formData();
  const productSlug = String(formData.get("productSlug") ?? "").trim();
  const wantsJson = request.headers.get("accept")?.includes("application/json");
  let redirectPath: string;
  let ok = true;
  let queuedCount = 0;
  let runStatus = "failed";

  try {
    const result = await queueAndRunAppStoreCollection(productSlug);
    queuedCount = result.queuedCount;
    runStatus = result.runStatus;
    redirectPath = buildCollectionRedirectPath(result, productSlug);
  } catch {
    ok = false;
    redirectPath = buildCollectionRedirectPath(
      {
        queuedCount: 0,
        runStatus: "failed",
      },
      productSlug,
    );
  }

  if(formData.get("returnTo")) {
    const url=new URL(redirectPath,"http://admin.local");
    url.searchParams.set("returnTo",safeAdminReturnTo(formData.get("returnTo"),"/admin/pipeline"));
    redirectPath=url.pathname+url.search+url.hash;
  }

  if (wantsJson) {
    return Response.json(
      {
        ok,
        redirectPath,
        queuedCount,
        runStatus,
      },
      {
        status: ok ? 200 : 500,
      },
    );
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: redirectPath,
    },
  });
}
