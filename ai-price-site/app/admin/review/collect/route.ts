import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import { queueAndRunAppStoreCollection } from "../collection-runner";

export async function POST(request: Request) {
  await requireAdmin();

  const formData = await request.formData();
  const productSlug = String(formData.get("productSlug") ?? "").trim();
  const redirectParams = new URLSearchParams();

  try {
    const { queuedCount, runStatus } = await queueAndRunAppStoreCollection(productSlug);

    redirectParams.set("collectionQueued", String(queuedCount));
    redirectParams.set("collectionRun", runStatus);
  } catch {
    redirectParams.set("collectionQueued", "0");
    redirectParams.set("collectionRun", "failed");
  }

  if (productSlug) {
    redirectParams.set("collectionScope", productSlug);
    redirectParams.set("q", productSlug);
  }

  const redirectUrl = new URL(`/admin/review?${redirectParams.toString()}`, request.url);
  return NextResponse.redirect(redirectUrl, 303);
}
