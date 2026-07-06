import { requireAdmin } from "../../../../lib/admin-auth";
import { buildCollectionRedirectPath } from "../collection-status";
import { queueAndRunAppStoreCollection } from "../collection-runner";

export async function POST(request: Request) {
  await requireAdmin();

  const formData = await request.formData();
  const productSlug = String(formData.get("productSlug") ?? "").trim();
  let redirectPath: string;

  try {
    const result = await queueAndRunAppStoreCollection(productSlug);
    redirectPath = buildCollectionRedirectPath(result, productSlug);
  } catch {
    redirectPath = buildCollectionRedirectPath(
      {
        queuedCount: 0,
        runStatus: "failed",
      },
      productSlug,
    );
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: redirectPath,
    },
  });
}
