import { requireAdmin } from "../../../../lib/admin-auth";
import { buildCollectionRedirectPath } from "../collection-status";
import { queueAndRunAppStoreCollection } from "../collection-runner";

export async function POST(request: Request) {
  await requireAdmin();

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
