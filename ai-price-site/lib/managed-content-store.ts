import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { matchesContentDistributionEvidence, type DistributionResult } from "./content-readback";
import type { Prisma } from "@prisma/client";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { LEGACY_CONTENT_TARGET, getRegisteredContentTarget, assertContentTargetRuntime, assertContentRuntime, assertLocalContentDatabase, findContentTarget, parseOverviewContent, requireGeneration, type OverviewContent } from "./managed-content";

import { hasContentFactTokens } from "./content-fact-tokens";

export type Revision = { targetId?: string; hash: string; previousVersion: number; version: number; content: OverviewContent | null; actor: string; reason: string; createdAt: string; rollbackOf: number | null };
export type ContentState = { generation: number; version: number; draft: OverviewContent | null; receipt: "pending" | "origin_invalidated" | "verified" | null; attemptId?: string };
export type DistributionAttempt = {
  targetId?: string;
  id: string; version: number; previousAttemptId: string | null; number: number;
  status: "pending" | "running" | "origin_invalidated" | "verified" | "failed" | "superseded";
  actor: string; createdAt: number; finishedAt: number | null; fenceGeneration?: number;
  owner: string | null; leaseUntil: number | null;
  failure: "lease_expired" | "cache_invalidation_failed" | "distribution_failed" | null;
  evidence?: DistributionResult;
};
export type ContentFence = { generation: number; epoch: number; admission: "open" | "closed" };
/** Scope is resolved from a fixed ID; callers cannot supply a storage prefix or URL. */
export function createContentStore(targetId: string = LEGACY_CONTENT_TARGET) {
const target = getRegisteredContentTarget(targetId);
const PREFIX = target.storagePrefix;
const GROUP = target.id === LEGACY_CONTENT_TARGET ? "content-pilot" : "managed-content-v2";
const assertRuntime = () => assertContentTargetRuntime(target.id);
const auditTarget = target.id === LEGACY_CONTENT_TARGET ? "content_pilot" : target.id;
const LEASE_MS = 60_000;
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
async function setContentAdmission(expected: number, actor: string, admission: "open" | "closed") {
  assertRuntime();
  if (admission !== "open" && admission !== "closed") throw new Error("发布入口状态无效。");
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(721091101)`;
    const previous = await readFence(tx);
    requireGeneration(previous.generation, expected);
    const fence = { ...previous, generation: previous.generation + 1, epoch: previous.epoch + 1, admission };
    const data = { label: "Content admission fence", groupName: GROUP, valueJson: fence, isPublic: false };
    await tx.siteSetting.upsert({ where: { settingKey: PREFIX + "fence" }, create: { settingKey: PREFIX + "fence", ...data }, update: data });
    const row = await tx.siteSetting.findUnique({ where: { settingKey: PREFIX + "state" } });
    const state = row?.valueJson as unknown as ContentState | undefined;
    if (state?.attemptId) {
      const record = await tx.siteSetting.findUnique({ where: { settingKey: PREFIX + "attempt:" + state.attemptId } });
      const attempt = record?.valueJson as unknown as DistributionAttempt | undefined;
      if (attempt && (attempt.status === "running" || attempt.status === "pending")) await writeAttempt(tx, { ...attempt, status: "superseded", finishedAt: Date.now(), owner: null, leaseUntil: null });
    }
    await tx.auditLog.create({ data: { actorId: actor, action: "content_admission", targetType: auditTarget, newValue: fence, note: "Local admission fence transition" } });
    return fence;
  });
}

function verifyRevision(revision: Revision): Revision {
  if (target.id !== LEGACY_CONTENT_TARGET && revision.targetId !== target.id) throw new Error("内容目标不匹配。");
  // JSONB reorders object keys. Rebuild the same validated field order used on write.
  const content = revision.content === null ? null : parseOverviewContent(revision.content, target.id);
  if (createHash("sha256").update(JSON.stringify(content)).digest("hex") !== revision.hash) throw new Error("内容修订校验失败，请检查历史记录。");
  return { ...revision, content };
}
async function writeAttempt(tx: Prisma.TransactionClient, attempt: DistributionAttempt, create = false) {
  const data = { label: "Content distribution attempt", groupName: GROUP + "-attempt", valueJson: JSON.parse(JSON.stringify(attempt)), isPublic: false };
  const settingKey = PREFIX + "attempt:" + attempt.id;
  if (create) await tx.siteSetting.create({ data: { settingKey, ...data } });
  else await tx.siteSetting.update({ where: { settingKey }, data });
}
async function newAttempt(tx: Prisma.TransactionClient, version: number, actor: string, prior: DistributionAttempt | null) {
  const fence = await requireOpenFence(tx);
  const attempt: DistributionAttempt = { ...(target.id === LEGACY_CONTENT_TARGET ? {} : { targetId: target.id }), id: randomUUID(), version, actor, fenceGeneration: fence.generation, previousAttemptId: prior?.id ?? null, number: (prior?.number ?? 0) + 1, status: "pending", createdAt: Date.now(), finishedAt: null, owner: null, leaseUntil: null, failure: null };
  await writeAttempt(tx, attempt, true);
  return attempt;
}
const empty: ContentState = { generation: 0, version: 0, draft: null, receipt: null };
async function readContentState(): Promise<ContentState> {
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
async function readRevision(version: number): Promise<Revision | null> {
  return requireRevision(prisma, version);
}
async function readContentHistory() {
  const rows = await prisma.siteSetting.findMany({ where: { groupName: GROUP + "-revision", settingKey: { startsWith: PREFIX + "revision:" } }, orderBy: { createdAt: "desc" }, take: 30 });
  return rows.map((row) => row.valueJson as unknown as Revision);
}
const published = unstable_cache(async (epoch: number) => {
  if (!Number.isSafeInteger(epoch) || epoch < 0) throw new Error("内容缓存代次无效。");
  const state = await readContentState();
  return readRevision(state.version);
}, [PREFIX, "published"], { tags: [target.cacheTag], revalidate: 1800 });
const serving = cache(async () => {
  const fence = await readFence(prisma);
  const revision = await published(fence.epoch);
  return { content: revision?.content ?? null, version: revision?.version ?? 0, modeGeneration: fence.generation };
});
type Mutation = { type: "draft"; content: OverviewContent } | { type: "publish"; reason: string } | { type: "rollback"; version: number; reason: string };
async function mutateContent(expected: number, actor: string, command: Mutation) {
  assertRuntime();
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(721091101)`;
    const row = await tx.siteSetting.findUnique({ where: { settingKey: PREFIX + "state" } });
    const state = row ? row.valueJson as unknown as ContentState : { ...empty };
    requireGeneration(state.generation, expected);
    await requireRevision(tx, state.version);
    let next: ContentState = { ...state, generation: state.generation + 1 };
    if (command.type === "draft") next.draft = parseOverviewContent(command.content, target.id);
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
      if (content) content = parseOverviewContent(content, target.id);
      const version = state.version + 1;
      const revision: Revision = { ...(target.id === LEGACY_CONTENT_TARGET ? {} : { targetId: target.id }), hash: createHash("sha256").update(JSON.stringify(content)).digest("hex"), previousVersion: state.version, version, content, actor, reason: command.reason.trim(), createdAt: new Date().toISOString(), rollbackOf: command.type === "rollback" ? command.version : null };
      await tx.siteSetting.create({ data: { settingKey: PREFIX + "revision:" + version, groupName: GROUP + "-revision", label: "Content revision", valueJson: JSON.parse(JSON.stringify(revision)), isPublic: false } });
      if (state.attemptId) {
        const prior = await tx.siteSetting.findUnique({ where: { settingKey: PREFIX + "attempt:" + state.attemptId } });
        if (prior) {
          const attempt = prior.valueJson as unknown as DistributionAttempt;
          if (attempt.status === "pending" || attempt.status === "running") await writeAttempt(tx, { ...attempt, status: "superseded", finishedAt: Date.now(), owner: null, leaseUntil: null });
        }
      }
      // Each committed pointer gets a new shared cache epoch, including rollback.
      const fenceData = { label: "Content admission fence", groupName: GROUP, valueJson: { ...publicationFence, epoch: publicationFence.epoch + 1 }, isPublic: false };
      await tx.siteSetting.upsert({ where: { settingKey: PREFIX + "fence" }, create: { settingKey: PREFIX + "fence", ...fenceData }, update: fenceData });
      const attempt = await newAttempt(tx, version, actor, null);
      next = { ...next, version, receipt: "pending", attemptId: attempt.id };
    }
    const data = { label: "Content pilot state", groupName: GROUP, valueJson: JSON.parse(JSON.stringify(next)), isPublic: false };
    await tx.siteSetting.upsert({ where: { settingKey: PREFIX + "state" }, create: { settingKey: PREFIX + "state", ...data }, update: data });
    await tx.auditLog.create({ data: { actorId: actor, action: "content_" + command.type, targetType: auditTarget, newValue: { generation: next.generation, version: next.version }, note: command.type === "draft" ? `Saved ${target.id} draft` : command.reason } });
    return next;
  });
}
async function readDistributionAttempt(id: string): Promise<DistributionAttempt | null> {
  const row = await prisma.siteSetting.findUnique({ where: { settingKey: PREFIX + "attempt:" + id } });
  return row ? row.valueJson as unknown as DistributionAttempt : null;
}

// All admission and completion checks share the content pointer's transaction lock.
// No caller can mark a revision successful using just its version number.
async function claimContentDistribution(version: number, id: string) {
  assertRuntime();
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
    if (target.id !== LEGACY_CONTENT_TARGET && attempt.targetId !== target.id) throw new Error("内容目标不匹配。");
    if (attempt.status !== "pending") throw new Error("分发已领取或已结束，请刷新后重试。");
    const fence = await requireOpenFence(tx);
    if ((attempt.fenceGeneration ?? 0) !== fence.generation) throw new Error("发布入口已变更，请刷新重试。");
    const claimed: DistributionAttempt = { ...attempt, status: "running", owner: randomUUID(), leaseUntil: Date.now() + LEASE_MS };
    await writeAttempt(tx, claimed);
    return claimed;
  });
}

async function finishContentDistribution(id: string, owner: string, success: boolean) {
  assertRuntime();
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
    await tx.auditLog.create({ data: { actorId: attempt.actor, action: "content_distribution_local", targetType: auditTarget, newValue: { version: attempt.version, attemptId: id, status }, note: "Local cache result only; not public publication proof" } });
    if (status !== "origin_invalidated") return false;
    await tx.siteSetting.update({ where: { id: row.id }, data: { valueJson: JSON.parse(JSON.stringify({ ...state, receipt: "origin_invalidated" })) } });
    return true;
  });
}

async function retryContentDistribution(expected: number, actor: string) {
  assertRuntime();
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
    await tx.auditLog.create({ data: { actorId: actor, action: "content_retry", targetType: auditTarget, newValue: { version: state.version, attemptId: attempt.id }, note: "Retry local content distribution" } });
    return next;
  });
}

/** Durable eligibility must be checked before AND after each external step. */
async function assertContentDistributionCurrent(id: string, owner: string) {
  assertRuntime();
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

/** Restart-safe recovery: the durable pointer, lease and successor are one transaction.
 * Production scheduling is intentionally not activated by this local rehearsal API.
 */
async function claimContentRecovery() {
  assertLocalContentDatabase(process.env.DATABASE_URL);
  assertRuntime();
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(721091101)`;
    const stateRow = await tx.siteSetting.findUnique({ where: { settingKey: PREFIX + "state" } });
    const state = stateRow?.valueJson as unknown as ContentState | undefined;
    const skip = (reason: string) => ({ status: "skipped" as const, reason });
    if (!state?.version || state.receipt !== "pending") return skip("no_pending_delivery");
    const fence = await readFence(tx);
    if (fence.admission !== "open") return skip("admission_closed");
    await requireRevision(tx, state.version);
    if (!state.attemptId) return skip("missing_attempt");
    const row = await tx.siteSetting.findUnique({ where: { settingKey: PREFIX + "attempt:" + state.attemptId } });
    let prior = row?.valueJson as unknown as DistributionAttempt | undefined;
    if (!prior || prior.id !== state.attemptId || prior.version !== state.version || (target.id !== LEGACY_CONTENT_TARGET && prior.targetId !== target.id)) return skip("attempt_identity_mismatch");
    const now = Date.now();
    if (prior.status === "pending" && prior.createdAt + LEASE_MS > now || prior.status === "running" && (prior.leaseUntil ?? 0) > now) return skip("lease_active");
    if (prior.status === "pending" || prior.status === "running") {
      prior = { ...prior, status: "failed", failure: "lease_expired", finishedAt: now, owner: null, leaseUntil: null };
      await writeAttempt(tx, prior);
      await tx.auditLog.create({ data: { action: "content_recovery_expired", targetType: auditTarget, newValue: { version: state.version, attemptId: prior.id }, note: "Recovery retired an expired delivery lease; original attempt retained" } });
    }
    if (prior.status !== "failed" && prior.status !== "superseded") return skip("terminal_attempt");
    if (!Number.isSafeInteger(prior.number) || prior.number < 1 || prior.number >= 3) return skip("attempt_limit");
    if (prior.failure !== "lease_expired" && (prior.finishedAt ?? now) + 5_000 > now) return skip("backoff");
    const successor = await newAttempt(tx, state.version, prior.actor, prior);
    const claimed: DistributionAttempt = { ...successor, status: "running", owner: randomUUID(), leaseUntil: now + LEASE_MS };
    await writeAttempt(tx, claimed);
    await tx.siteSetting.update({ where: { id: stateRow!.id }, data: { valueJson: JSON.parse(JSON.stringify({ ...state, attemptId: claimed.id })) } });
    await tx.auditLog.create({ data: { action: "content_recovery_claim", targetType: auditTarget, newValue: { version: state.version, attemptId: claimed.id, previousAttemptId: prior.id, initiatedBy: prior.actor }, note: "Local recovery executor claimed a successor; no new content revision" } });
    return { status: "claimed" as const, attempt: claimed };
  });
}

/** Commit the complete receipt only while its lease, pointer and fence still match. */
async function recordContentDistribution(id: string, owner: string, evidence: DistributionResult) {
  assertRuntime();
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
    const revision = await requireRevision(tx, state.version);
    const matched = matchesContentDistributionEvidence(evidence, attempt.version, fence.generation, target.id, hasContentFactTokens(revision?.content));
    const status = !current ? "superseded" : expired || !matched ? "failed" : "verified";
    await writeAttempt(tx, { ...attempt, status, evidence, finishedAt: Date.now(), owner: null, leaseUntil: null,
      failure: !current ? null : expired ? "lease_expired" : !matched ? "distribution_failed" : null });
    if (!current) return false;
    await tx.siteSetting.update({ where: { id: stateRow.id }, data: { valueJson: JSON.parse(JSON.stringify({ ...state, receipt: status === "verified" ? "verified" : "pending" })) } });
    await tx.auditLog.create({ data: { actorId: attempt.actor, action: "content_distribution", targetType: auditTarget, newValue: { version: attempt.version, attemptId: id, status }, note: "Durable origin/CDN/public readback result" } });
    return status === "verified";
  });
}

return { readContentState, readContentHistory, readRevision, mutateContent, readDistributionAttempt,
  claimContentDistribution, finishContentDistribution, retryContentDistribution, assertContentDistributionCurrent,
  recordContentDistribution, setContentAdmission, claimContentRecovery, serving };
}
export const { readContentState, readContentHistory, readRevision, mutateContent, readDistributionAttempt,
  claimContentDistribution, finishContentDistribution, retryContentDistribution, assertContentDistributionCurrent,
  recordContentDistribution, setContentAdmission } = createContentStore();
const stores = new Map<string, ReturnType<typeof createContentStore>>();
export function contentStore(targetId: string = LEGACY_CONTENT_TARGET) {
  const target = getRegisteredContentTarget(targetId);
  if (!stores.has(target.id)) stores.set(target.id, createContentStore(target.id));
  return stores.get(target.id)!;
}
export async function getPublishedContent(locale: string, slug: string, plan?: string) {
  const target = findContentTarget(locale, slug, plan);
  if (!target) return null;
  try { assertContentTargetRuntime(target.id); } catch { return null; }
  return contentStore(target.id).serving();
}
