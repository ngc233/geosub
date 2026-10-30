"use server";
import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "../../../lib/admin-auth";
import { LEGACY_CONTENT_TARGET, getRegisteredContentTarget, assertContentTargetRuntime, parseOverviewContent } from "../../../lib/managed-content";
import { contentStore } from "../../../lib/managed-content-store";
import { contentDistributionConfig, distributeContentAttempt } from "../../../lib/content-distribution";
export type ContentActionState = { message: string; ok: boolean };
export async function contentAction(_: ContentActionState, form: FormData): Promise<ContentActionState> {
  const admin = await requireAdmin(form.get("operation") === "draft" ? "draft" : "manage");
  try {
    const target = getRegisteredContentTarget(String(form.get("targetId") || LEGACY_CONTENT_TARGET));
    assertContentTargetRuntime(target.id);
    const { claimContentDistribution, mutateContent, retryContentDistribution } = contentStore(target.id);
    const expected = Number(form.get("generation"));
    const operation = String(form.get("operation"));
    const distributionConfig = operation === "draft" ? null : contentDistributionConfig();
    let receipt: "origin_invalidated" | "verified" | null = null;
    let state;
    if (operation === "draft") {
      const sections = Array.from({ length: 4 }, (_, i) => ({ heading: String(form.get(`section${i}heading`) || ""), body: String(form.get(`section${i}body`) || "") })).filter((s) => s.heading || s.body);
      const faqs = Array.from({ length: 6 }, (_, i) => ({ q: String(form.get(`faq${i}q`) || ""), a: String(form.get(`faq${i}a`) || "") })).filter((s) => s.q || s.a);
      const content = parseOverviewContent({ title: form.get("title"), heading: form.get("heading"), description: form.get("description"), sections, faqs, sources: String(form.get("sources") || "").split("\n").map((s) => s.trim()).filter(Boolean) }, target.id);
      state = await mutateContent(expected, admin.id, { type: "draft", content });
    } else if (operation === "publish" || operation === "rollback") {
      if (form.get("reviewed") !== "on") throw new Error("请确认已预览此版本并核对来源与价格口径。");
      const reason = String(form.get("reason") || "");
      state = await mutateContent(expected, admin.id, operation === "publish" ? { type: "publish", reason } : { type: "rollback", version: Number(form.get("version")), reason });
    } else if (operation === "retry") {
      state = await retryContentDistribution(expected, admin.id);
    } else throw new Error("操作无效。");
    if (operation !== "draft") {
      if (!state.attemptId) throw new Error("分发记录不存在，请刷新检查。");
      const attempt = await claimContentDistribution(state.version, state.attemptId);
      receipt = await distributeContentAttempt(attempt.id, attempt.owner!, async () => {
        updateTag(target.cacheTag);
        revalidatePath(target.canonicalPath);
      }, distributionConfig, target.id);
    }
    revalidatePath("/admin/content");
    revalidatePath("/admin/content/preview");
    return { ok: true, message: operation === "draft" ? "草稿已保存，访客页面未改变。请打开预览核对。" : receipt === "verified" ? "内容已发布，源站和公网内容核对通过，回执已保存。" : "本地版本已切换，应用缓存已失效。尚未执行公网 CDN 发布验收。" };
  } catch (error) {
    return { ok: false, message: error instanceof Error && !/prisma|postgres|connection|query|database|sql/i.test(error.message) ? error.message : "操作未完成，请刷新检查版本和回执后重试。" };
  }
}
