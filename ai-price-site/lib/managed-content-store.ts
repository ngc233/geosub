import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { DistributionResult } from "./content-readback";
import type { Prisma } from "@prisma/client";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { CONTENT_TAG, assertContentRuntime, isContentTarget, parseOverviewContent, requireGeneration, type OverviewContent } from "./managed-content";

const PREFIX = "content-pilot:en:chatgpt:";
export type Revision = { hash: string; previousVersion: number; version: number; content: OverviewContent | null; actor: string; reason: string; createdAt: string; rollbackOf: number | null };
export type ContentState = { generation: number; version: number; draft: OverviewContent | null; receipt: "pending" | "origin_invalidated" | "verified" | null; attemptId?: string };
export type DistributionAttempt = {
  id: string; version: number; previousAttemptId: string | null; number: number;
  status: "pending" | "running" | "origin_invalidated" | "verified" | "failed" | "superseded";
  actor: string; createdAt: number; finishedAt: number | null; fenceGeneration?: number;
  owner: string | null; leaseUntil: number | null;
  failure: "lease_expired" | "cache_invalidation_failed" | "distribution_failed" | null;
  evidence?: DistributionResult;
};
const LEASE_MS = 60_000;
export type ContentFence = { generation: number; epoch: number; admission: "open" | "closed" };
const initialFence: ContentFence = { generation: 0, epoch: 0, admission: "open" };
async function readFence(tx: Pick<Prisma.TransactionClient, "siteSetting">): Promise<ContentFence> {
  const row = await tx.siteSetting.findUnique({ where: { settingKey: PREFIX + "fence" } });
  return row ? row.valueJson as unknown as ContentFence : { ...initialFence, admission: assertContentRuntime() === "production" ? "closed" : "open" };
}
async function requireOpenFence(tx: Prisma.TransactionClient) {
  const fence = await readFence(tx);
  if (fence.admission !== "open") throw new Error("内容发布入口已暂停，请待维护完成后重试。");
  return fence;
}
export async function setContentAdmission(expected: number, actor: string, admission: "open" | "closed") {
  assertContentRuntime();
  if (admission !== "open" && admission !== "closed") throw new Error("发布入口状态无效。");
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(721091101)`;
    const previous = await readFence(tx);
    requireGeneration(previous.generation, expected);
    const fence = { ...previous, generation: previous.generation + 1, epoch: previous.epoch + 1, admission };
    const data = { label: "Content admission fence", groupName: "content-pilot", valueJson: fence, isPublic: false };
    await tx.siteSetting.upsert({ where: { settingKey: PREFIX + "fence" }, create: { settingKey: PREFIX + "fence", ...data }, update: data });
    const row = await tx.siteSetting.findUnique({ where: { settingKey: PREFIX + "state" } });
    const state = row?.valueJson as unknown as ContentState | undefined;
    if (state?.attemptId) {
      const record = await tx.siteSetting.findUnique({ where: { settingKey: PREFIX + "attempt:" + state.attemptId } });
      const attempt = record?.valueJson as unknown as DistributionAttempt | undefined;
      if (attempt && (attempt.status === "running" || attempt.status === "pending")) await writeAttempt(tx, { ...attempt, status: "superseded", finishedAt: Date.now(), owner: null, leaseUntil: null });
    }
    await tx.auditLog.create({ data: { actorId: actor, action: "content_admission", targetType: "content_pilot", newValue: fence, note: "Local admission fence transition" } });
    return fence;
  });
}

function verifyRevision(revision: Revision): Revision {
  // JSONB reorders object keys. Rebuild the same validated field order used on write.
  const content = revision.content === null ? null : parseOverviewContent(revision.content);
  if (createHash("sha256").update(JSON.stringify(content)).digest("hex") !== revision.hash) throw new Error("内容修订校验失败，请检查历史记录。");
  return { ...revision, content };
}
async function writeAttempt(tx: Prisma.TransactionClient, attempt: DistributionAttempt, create = false) {
  const data = { label: "Content distribution attempt", groupName: "content-pilot-attempt", valueJson: JSON.parse(JSON.stringify(attempt)), isPublic: false };
  const settingKey = PREFIX + "attempt:" + attempt.id;
  if (create) await tx.siteSetting.create({ data: { settingKey, ...data } });
  else await tx.siteSetting.update({ where: { settingKey }, data });
}
async function newAttempt(tx: Prisma.TransactionClient, version: number, actor: string, prior: DistributionAttempt | null) {
  const fence = await requireOpenFence(tx);
  const attempt: DistributionAttempt = { id: randomUUID(), version, actor, fenceGeneration: fence.generation, previousAttemptId: prior?.id ?? null, number: (prior?.number ?? 0) + 1, status: "pending", createdAt: Date.now(), finishedAt: null, owner: null, leaseUntil: null, failure: null };
  await writeAttempt(tx, attempt, true);
  return attempt;
}
const empty: ContentState = { generation: 0, version: 0, draft: null, receipt: null };
export async function readContentState(): Promise<ContentState> {
  const row = await prisma.siteSetting.findUnique({ where: { settingKey: PREFIX + "state" } });
  return row ? row.valueJson as unknown as ContentState : { ...empty };
}
async function requireRevision(db: Pick<Prisma.TransactionClient, "siteSetting">, version: number): Promise<Revision | null> {
  if (!Number.isSafeInteger(version) || version < 0) throw new Error("内容修订版本无效。");
  if (!version) return null;
  const row = await db.siteSetting.findUnique({ where: { settingKey: PREFIX + "revision:" + version } });
  if (!row) throw new Error("内容修订不存在。");
  const revision = row.valueJson as unknown as Revision;
  if (revision.version !== version) throw new Error("内容修订校验失败，请检查历史记录。");
  return verifyRevision(revision);
}
export async function readRevision(version: number): Promise<Revision | null> {
  return requireRevision(prisma, version);
}
export async function readContentHistory() {
  const rows = await prisma.siteSetting.findMany({ where: { groupName: "content-pilot-revision" }, orderBy: { createdAt: "desc" }, take: 30 });
  return rows.map((row) => row.valueJson as unknown as Revision);
}
const published = unstable_cache(async (epoch: number) => {
  if (!Number.isSafeInteger(epoch) || epoch < 0) throw new Error("内容缓存代次无效。");
  const state = await readContentState();
  return readRevision(state.version);
}, [PREFIX, "published"], { tags: [CONTENT_TAG], revalidate: 1800 });
const serving = cache(async () => {
  const fence = await readFence(prisma);
  const revision = await published(fence.epoch);
  return { content: revision?.content ?? null, version: revision?.version ?? 0, modeGeneration: fence.generation };
});
export async function getPublishedContent(locale: string, slug: string, plan?: string) {
  if (!isContentTarget(locale, slug, plan)) return null;
  // Environment activation never bypasses durable admission for writes.
  try { assertContentRuntime(); } catch { return null; }
  return serving();
}
type Mutation = { type: "draft"; content: OverviewContent } | { type: "publish"; reason: string } | { type: "rollback"; version: number; reason: string };
export async function mutateContent(expected: number, actor: string, command: Mutation) {
  assertContentRuntime();
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(721091101)`;
    const row = await tx.siteSetting.findUnique({ where: { settingKey: PREFIX + "state" } });
    const state = row ? row.valueJson as unknown as ContentState : { ...empty };
    requireGeneration(state.generation, expected);
    await requireRevision(tx, state.version);
    let next: ContentState = { ...state, generation: state.generation + 1 };
    if (command.type === "draft") next.draft = parseOverviewContent(command.content);
    else {
      const publicationFence = await requireOpenFence(tx);
      if (!command.reason.trim() || command.reason.length > 500) throw new Error("请填写复核或回退理由（不超过 500 字）。");
      let content = state.draft;
      if (command.type === "rollback") {
        if (!Number.isSafeInteger(command.version) || command.version < 0 || command.version > state.version) throw new Error("回退版本无效。");
        const prior = command.version ? await tx.siteSetting.findUnique({ where: { settingKey: PREFIX + "revision:" + command.version } }) : null;
        if (command.version && !prior) throw new Error("回退版本不存在。");
        content = prior ? verifyRevision(prior.valueJson as unknown as Revision).content : null;
      } else if (!content) throw new Error("请先保存并预览草稿。");
      if (content) content = parseOverviewContent(content);
      const version = state.version + 1;
      const revision: Revision = { hash: createHash("sha256").update(JSON.stringify(content)).digest("hex"), previousVersion: state.version, version, content, actor, reason: command.reason.trim(), createdAt: new Date().toISOString(), rollbackOf: command.type === "rollback" ? command.version : null };
      await tx.siteSetting.create({ data: { settingKey: PREFIX + "revision:" + version, groupName: "content-pilot-revision", label: "Content revision", valueJson: JSON.parse(JSON.stringify(revision)), isPublic: false } });
      if (state.attemptId) {
        const prior = await tx.siteSetting.findUnique({ where: { settingKey: PREFIX + "attempt:" + state.attemptId } });
        if (prior) {
          const attempt = prior.valueJson as unknown as DistributionAttempt;
          if (attempt.status === "pending" || attempt.status === "running") await writeAttempt(tx, { ...attempt, status: "superseded", finishedAt: Date.now(), owner: null, leaseUntil: null });
        }
      }
      // Each committed pointer gets a new shared cache epoch, including rollback.
      const fenceData = { label: "Content admission fence", groupName: "content-pilot", valueJson: { ...publicationFence, epoch: publicationFence.epoch + 1 }, isPublic: false };
      await tx.siteSetting.upsert({ where: { settingKey: PREFIX + "fence" }, create: { settingKey: PREFIX + "fence", ...fenceData }, update: fenceData });
      const attempt = await newAttempt(tx, version, actor, null);
      next = { ...next, version, receipt: "pending", attemptId: attempt.id };
    }
    const data = { label: "Content pilot state", groupName: "content-pilot", valueJson: JSON.parse(JSON.stringify(next)), isPublic: false };
    await tx.siteSetting.upsert({ where: { settingKey: PREFIX + "state" }, create: { settingKey: PREFIX + "state", ...data }, update: data });
    await tx.auditLog.create({ data: { actorId: actor, action: "content_" + command.type, targetType: "content_pilot", newValue: { generation: next.generation, version: next.version }, note: command.type === "draft" ? "Saved English ChatGPT draft" : command.reason } });
    return next;
  });
}
export async function readDistributionAttempt(id: string): Promise<DistributionAttempt | null> {
  const row = await prisma.siteSetting.findUnique({ where: { settingKey: PREFIX + "attempt:" + id } });
  return row ? row.valueJson as unknown as DistributionAttempt : null;
}

// All admission and completion checks share the content pointer's transaction lock.
// No caller can mark a revision successful using just its version number.
export async function claimContentDistribution(version: number, id: string) {
  assertContentRuntime();
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(721091101)`;
    const row = await tx.siteSetting.findUnique({ where: { settingKey: PREFIX + "state" } });
    if (!row) throw new Error("没有待分发的内容。");
    const state = row.valueJson as unknown as ContentState;
    if (state.version !== version || state.attemptId !== id) throw new Error("内容版本已更新，请刷新。");
    await requireRevision(tx, state.version);
    const record = await tx.siteSetting.findUnique({ where: { settingKey: PREFIX + "attempt:" + id } });
    if (!record) throw new Error("分发记录不存在。");
    const attempt = record.valueJson as unknown as DistributionAttempt;
    if (attempt.status !== "pending") throw new Error("分发已领取或已结束，请刷新后重试。");
    const fence = await requireOpenFence(tx);
    if ((attempt.fenceGeneration ?? 0) !== fence.generation) throw new Error("发布入口已变更，请刷新重试。");
    const claimed: DistributionAttempt = { ...attempt, status: "running", owner: randomUUID(), leaseUntil: Date.now() + LEASE_MS };
    await writeAttempt(tx, claimed);
    return claimed;
  });
}

export async function finishContentDistribution(id: string, owner: string, success: boolean) {
  assertContentRuntime();
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(721091101)`;
    const record = await tx.siteSetting.findUnique({ where: { settingKey: PREFIX + "attempt:" + id } });
    const row = await tx.siteSetting.findUnique({ where: { settingKey: PREFIX + "state" } });
    if (!row || !record) return false;
    const state = row.valueJson as unknown as ContentState;
    const attempt = record.valueJson as unknown as DistributionAttempt;
    if (attempt.status !== "running" || attempt.owner !== owner) return false;
    const now = Date.now();
    const fence = await readFence(tx);
    const current = state.version === attempt.version && state.attemptId === id && fence.admission === "open" && (attempt.fenceGeneration ?? 0) === fence.generation;
    const expired = !attempt.leaseUntil || attempt.leaseUntil <= now;
    const status = !current ? "superseded" : expired || !success ? "failed" : "origin_invalidated";
    await writeAttempt(tx, { ...attempt, status, finishedAt: now, owner: null, leaseUntil: null, failure: !current ? null : expired ? "lease_expired" : !success ? "cache_invalidation_failed" : null });
    if (status !== "origin_invalidated") return false;
    await tx.siteSetting.update({ where: { id: row.id }, data: { valueJson: JSON.parse(JSON.stringify({ ...state, receipt: "origin_invalidated" })) } });
    return true;
  });
}

export async function retryContentDistribution(expected: number, actor: string) {
  assertContentRuntime();
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(721091101)`;
    const row = await tx.siteSetting.findUnique({ where: { settingKey: PREFIX + "state" } });
    if (!row) throw new Error("没有待分发的内容。");
    const state = row.valueJson as unknown as ContentState;
    requireGeneration(state.generation, expected);
    await requireRevision(tx, state.version);
    await requireOpenFence(tx);
    if (!state.version || state.receipt !== "pending") throw new Error("当前内容无需重试。");
    const record = state.attemptId ? await tx.siteSetting.findUnique({ where: { settingKey: PREFIX + "attempt:" + state.attemptId } }) : null;
    let prior = record ? record.valueJson as unknown as DistributionAttempt : null;
    if (state.attemptId && !prior) throw new Error("分发记录不存在，请检查历史记录。");
    const now = Date.now();
    if (prior) {
      if (prior.status === "pending" && prior.createdAt + LEASE_MS > now || prior.status === "running" && (prior.leaseUntil ?? 0) > now) throw new Error("分发正在处理中，请稍后刷新。");
      if (prior.status === "pending" || prior.status === "running") {
        prior = { ...prior, status: "failed", failure: "lease_expired", finishedAt: now, owner: null, leaseUntil: null };
        await writeAttempt(tx, prior);
      }
      if (prior.status !== "failed" && prior.status !== "superseded") throw new Error("该分发已结束，不能重试。");
      if (prior.number >= 3) throw new Error("已达到三次尝试上限，请检查分发故障。");
      // Expired leases have already waited sixty seconds; ordinary failures back off.
      if (prior.failure !== "lease_expired" && (prior.finishedAt ?? now) + 5_000 > now) throw new Error("请等待五秒后重试。");
    }
    const attempt = await newAttempt(tx, state.version, actor, prior);
    const next = { ...state, attemptId: attempt.id };
    await tx.siteSetting.update({ where: { id: row.id }, data: { valueJson: JSON.parse(JSON.stringify(next)) } });
    await tx.auditLog.create({ data: { actorId: actor, action: "content_retry", targetType: "content_pilot", newValue: { version: state.version, attemptId: attempt.id }, note: "Retry local content distribution" } });
    return next;
  });
}

/** Durable eligibility must be checked before AND after each external step. */
export async function assertContentDistributionCurrent(id: string, owner: string) {
  assertContentRuntime();
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(721091101)`;
    const stateRow = await tx.siteSetting.findUnique({ where: { settingKey: PREFIX + "state" } });
    const attemptRow = await tx.siteSetting.findUnique({ where: { settingKey: PREFIX + "attempt:" + id } });
    const state = stateRow?.valueJson as unknown as ContentState | undefined;
    const attempt = attemptRow?.valueJson as unknown as DistributionAttempt | undefined;
    const fence = await requireOpenFence(tx);
    if (!state || !attempt || state.attemptId !== id || state.version !== attempt.version ||
        attempt.status !== "running" || attempt.owner !== owner || (attempt.leaseUntil ?? 0) <= Date.now() ||
        (attempt.fenceGeneration ?? 0) !== fence.generation) throw new Error("分发资格已过期。");
    return { version: attempt.version, modeGeneration: fence.generation };
  });
}

/** Commit the complete receipt only while its lease, pointer and fence still match. */
export async function recordContentDistribution(id: string, owner: string, evidence: DistributionResult) {
  assertContentRuntime();
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(721091101)`;
    const stateRow = await tx.siteSetting.findUnique({ where: { settingKey: PREFIX + "state" } });
    const attemptRow = await tx.siteSetting.findUnique({ where: { settingKey: PREFIX + "attempt:" + id } });
    if (!stateRow || !attemptRow) return false;
    const state = stateRow.valueJson as unknown as ContentState;
    const attempt = attemptRow.valueJson as unknown as DistributionAttempt;
    if (attempt.status !== "running" || attempt.owner !== owner) return false;
    const fence = await readFence(tx);
    const current = state.attemptId === id && state.version === attempt.version && fence.admission === "open" &&
      (attempt.fenceGeneration ?? 0) === fence.generation;
    const expired = (attempt.leaseUntil ?? 0) <= Date.now();
    const matched = evidence.status === "verified" && evidence.stage === "complete" &&
      evidence.purge?.url === "https://geosub.org/en/ai-pricing/chatgpt" &&
      evidence.origin?.version === String(attempt.version) && evidence.public?.version === String(attempt.version) &&
      evidence.origin?.modeGeneration === String(fence.generation) && evidence.public?.modeGeneration === String(fence.generation) &&
      Object.keys(evidence.origin.outputHashes).length >= 8 &&
      Object.entries(evidence.origin.outputHashes).every(([key, value]) => value === evidence.public?.outputHashes[key]);
    const status = !current ? "superseded" : expired || !matched ? "failed" : "verified";
    await writeAttempt(tx, { ...attempt, status, evidence, finishedAt: Date.now(), owner: null, leaseUntil: null,
      failure: !current ? null : expired ? "lease_expired" : !matched ? "distribution_failed" : null });
    if (!current) return false;
    await tx.siteSetting.update({ where: { id: stateRow.id }, data: { valueJson: JSON.parse(JSON.stringify({ ...state, receipt: status === "verified" ? "verified" : "pending" })) } });
    await tx.auditLog.create({ data: { actorId: attempt.actor, action: "content_distribution", targetType: "content_pilot", newValue: { version: attempt.version, attemptId: id, status }, note: "Durable origin/CDN/public readback result" } });
    return status === "verified";
  });
}
