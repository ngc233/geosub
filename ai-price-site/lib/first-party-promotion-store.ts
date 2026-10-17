import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { requireAdmin } from "./admin-auth";
import { EMPTY_STATE, preproductionRuntime, approvedDestination, canPromote, eligible, promotionRuntime, iso, parseDraft, plain, type PromotionState, type Revision, type Review } from "./first-party-promotion";
type DB = Pick<Prisma.TransactionClient, "$queryRaw" | "$executeRaw">;
export async function readPromotionState(db: DB = prisma): Promise<PromotionState> {
  if (!promotionRuntime()) return { ...EMPTY_STATE };
  const rows = await db.$queryRaw<PromotionState[]>`SELECT generation, enabled, placement_enabled AS "placementEnabled", revision FROM promotion_config WHERE id=true`;
  return rows[0] || { ...EMPTY_STATE };
}
export async function readPromotionRevision(id: string, db: DB = prisma) {
  const rows = await db.$queryRaw<Revision[]>`SELECT id, campaign, author, digest, content FROM promotion_revisions WHERE id=${id}::uuid`;
  return rows[0] || null;
}
export async function readPromotionReview(id: string, db: DB = prisma) {
  const rows = await db.$queryRaw<{ payload: Review }[]>`SELECT payload FROM promotion_reviews WHERE revision=${id}::uuid ORDER BY id DESC LIMIT 1`;
  return rows[0]?.payload || null;
}
export async function readPromotionAdmin() {
  const actor = await requireAdmin();
  if (!canPromote(actor.role, "read")) throw Error("无查看权限。");
  if (!promotionRuntime()) return { state: { ...EMPTY_STATE }, revisions: [] as Revision[], available: false, readAt: Date.now() };
  const state = await readPromotionState();
  const revisions = await prisma.$queryRaw<Revision[]>`SELECT id, campaign, author, digest, content FROM promotion_revisions ORDER BY created_at DESC LIMIT 30`;
  return { state, revisions, available: true, readAt: Date.now() };
}
export async function mutatePromotion(form: FormData) {
  const actor = await requireAdmin();
  try { return await mutatePromotionAsActor(form, actor); }
  catch (error) {
    // Keep failed attempts out of the rolled-back business transaction. No submitted
    // content, evidence, destination, credentials or database error is logged.
    if (promotionRuntime()) {
      const submitted = String(form.get("operation"));
      const operation = ["draft", "review", "enable", "pause", "off"].includes(submitted) ? submitted : "invalid";
      try { await prisma.auditLog.create({ data: { actorId: actor.id, action: "promotion_failed", targetType: "promotion", note: "操作未完成", newValue: { operation } } }); }
      catch { console.error("[promotion] failure audit unavailable"); }
    }
    throw error;
  }
}
async function mutatePromotionAsActor(form: FormData, actor: Awaited<ReturnType<typeof requireAdmin>>) {
  const operation = String(form.get("operation"));
  if (!["draft", "review", "enable", "pause", "off"].includes(operation)) throw Error("写操作无效。");
  if (!canPromote(actor.role, operation)) throw Error("当前角色无此操作权限。");
  if (!promotionRuntime()) throw Error("请配置受支持的推广基础运行环境。");
  if (!/^\d+$/.test(String(form.get("generation")))) throw Error("版本无效，请刷新。");
  if (operation === "enable" && !preproductionRuntime()) throw Error("本版本仅部署基础功能，真实推广禁止启用。");
  const expected = Number(form.get("generation"));
  if (!Number.isSafeInteger(expected) || expected < 0) throw Error("版本无效，请刷新。");
  const reason = plain(form.get("reason"), 300);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(721091115)`;
    const state = await readPromotionState(tx);
    if (state.generation !== expected && operation !== "off") throw Error("配置已更新，请刷新后重试。");
    let next = { ...state, generation: state.generation + 1 };
    let revisionId: string | null = null;
    if (operation === "draft") {
      const content = parseDraft(Object.fromEntries(form.entries()));
      revisionId = randomUUID();
      const campaign = plain(form.get("campaign"), 36, true) || randomUUID();
      if (!/^[0-9a-f-]{36}$/.test(campaign)) throw Error("活动标识无效。");
      const digest = createHash("sha256").update(JSON.stringify(content)).digest("hex");
      await tx.$executeRaw`INSERT INTO promotion_revisions(id,campaign,author,digest,content) VALUES(${revisionId}::uuid,${campaign}::uuid,${actor.id}::uuid,${digest},${JSON.stringify(content)}::jsonb)`;
      // Conservative policy: any new draft pauses the current placement before review.
      next = { ...next, placementEnabled: false };
    } else if (operation === "off" || operation === "pause") {
      next = { ...next, enabled: operation === "off" ? false : state.enabled, placementEnabled: false };
    } else {
      revisionId = plain(form.get("revision"), 36);
      if (!/^[0-9a-f-]{36}$/.test(revisionId)) throw Error("版本标识无效。");
      const revision = await readPromotionRevision(revisionId, tx);
      if (!revision) throw Error("版本不存在。");
      if (operation === "review") {
        const status = String(form.get("status"));
        if (!["approved", "rejected", "revoked"].includes(status)) throw Error("审核状态无效。");
        const previous = await readPromotionReview(revisionId, tx);
        if (previous?.status === "revoked") throw Error("已撤销版本不能重新批准；请创建新版本。");
        if (status === "approved" && (revision.author === actor.id || !approvedDestination(revision.content.destination) || revision.content.placement !== "zh_home_brand")) throw Error("无法批准：禁止自审，且须有已核准落地页及真实页面绑定。");
        const review: Review = { revision: revisionId, digest: revision.digest, actor: actor.id, status: status as Review["status"], evidence: plain(form.get("reviewEvidence"), 160), termsDate: iso(form.get("termsDate")), expiresAt: iso(form.get("expiresAt")), scope: plain(form.get("scope"), 300), limitations: plain(form.get("limitations"), 300) };
        if (Date.parse(review.expiresAt) <= Date.now() || Date.parse(review.termsDate) > Date.now()) throw Error("审核日期或有效期无效。");
        await tx.$executeRaw`INSERT INTO promotion_reviews(revision,actor,status,payload) VALUES(${revisionId}::uuid,${actor.id}::uuid,${status},${JSON.stringify(review)}::jsonb)`;
        if (state.revision === revisionId) next.placementEnabled = false;
      } else if (operation === "enable") {
        next = { ...next, enabled: true, placementEnabled: true, revision: revisionId };
        if (!eligible(next, revision, await readPromotionReview(revisionId, tx))) throw Error("该版本未通过有效审核、时间、链接或范围门禁。");
      }
    }
    await tx.$executeRaw`UPDATE promotion_config SET generation=${next.generation}, enabled=${next.enabled}, placement_enabled=${next.placementEnabled}, revision=${next.revision}::uuid WHERE id=true`;
    await tx.auditLog.create({ data: { actorId: actor.id, action: `promotion_${operation}`, targetType: "promotion", targetId: revisionId, note: reason, newValue: { generation: next.generation, enabled: next.enabled, placementEnabled: next.placementEnabled } } });
    return next;
  });
}
