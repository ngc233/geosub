"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { decideGameOffer } from "./game-review-store";

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function reviewGameOffer(form: FormData) {
  const actor = await requireAdmin("manage");
  const runId = form.get("runId");
  const expectedPrior = form.get("expectedPrior");
  const decision = form.get("decision");
  const rawReason = form.get("reason");
  if (
    typeof runId !== "string" ||
    !uuid.test(runId) ||
    typeof expectedPrior !== "string" ||
    (expectedPrior !== "" && !uuid.test(expectedPrior)) ||
    (decision !== "approved" && decision !== "rejected")
  ) {
    return { error: "审核请求无效，请刷新重试。" };
  }
  const reason = typeof rawReason === "string" ? rawReason.trim() : "";
  if (!reason || reason.length > 500) return { error: "请填写 1 至 500 字的审核理由。" };
  const result = await decideGameOffer({
    runId,
    expectedPrior,
    decision,
    reason,
    actorId: actor.id,
    reviewer: actor.name || actor.email,
  });
  if (result.ok) revalidatePath("/admin/review");
  return result;
}
