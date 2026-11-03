import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import {
  EMPTY_RESET_SETTINGS, emptyResetFacts, parseResetBilingual, parseResetEvidenceLinks, parseResetFacts,
  resetGeneration, resetId, resetInstant, resetNeedsNotification, resetText, resetUrl,
  type Bilingual, type ResetAdminEvent, type ResetAdminResult, type ResetChange, type ResetCheck,
  type ResetEvidence, type ResetEvidenceLink, type ResetFacts, type ResetFeedItem, type ResetPublicEvent,
  type ResetPublicResult, type ResetRevision, type ResetSettings, type ResetSource,
} from "./codex-reset.ts";

type DB = Prisma.TransactionClient;
type EventRow = {
  id: string; generation: number; current_revision: number | null; notification_version: number;
  first_published_at: Date | null; updated_at: Date; merged_into: string | null;
};
type RevisionRow = { event_id: string; revision: number; review_status: ResetRevision["reviewStatus"]; data: ResetRevision };
const json = (value: unknown) => JSON.stringify(value);
const iso = (value: Date | string) => new Date(value).toISOString();
const now = () => new Date().toISOString();
const actorId = (actor: string) => resetText(actor, 200, true);
function matchGeneration(actual: number, expected: number) {
  if (actual !== resetGeneration(expected)) throw new Error("内容已更新，请刷新后再操作。");
}
async function locked<T>(actor: string, action: (tx: DB, actor: string) => Promise<T>): Promise<T> {
  const who = actorId(actor);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(721091161)`;
    return action(tx, who);
  }, { maxWait: 10000, timeout: 20000 });
}
async function audit(tx: DB, actor: string, action: string, targetId: string, detail: unknown) {
  await tx.$executeRaw`INSERT INTO codex_reset_audit(id,actor,action,target_id,detail)
    VALUES(${randomUUID()}::uuid,${actor},${action},${targetId},${json(detail)}::jsonb)`;
}
async function settings(db: DB): Promise<ResetSettings> {
  const rows = await db.$queryRaw<Array<{ generation: number; data: Omit<ResetSettings, "generation"> }>>`
    SELECT generation,data FROM codex_reset_settings WHERE singleton=TRUE`;
  return rows[0] ? { ...rows[0].data, generation: rows[0].generation } : { ...EMPTY_RESET_SETTINGS };
}
async function event(db: DB, id: string): Promise<EventRow> {
  const rows = await db.$queryRaw<EventRow[]>`SELECT * FROM codex_reset_events WHERE id=${resetId(id)}::uuid`;
  if (!rows[0]) throw new Error("事件不存在。");
  return rows[0];
}
async function revisions(db: DB, id: string): Promise<ResetRevision[]> {
  const rows = await db.$queryRaw<RevisionRow[]>`
    SELECT * FROM codex_reset_revisions WHERE event_id=${id}::uuid ORDER BY revision DESC`;
  return rows.map((row) => ({ ...row.data, revision: row.revision, reviewStatus: row.review_status }));
}
async function sources(db: DB): Promise<ResetSource[]> {
  const rows = await db.$queryRaw<Array<{ data: ResetSource }>>`SELECT data FROM codex_reset_sources ORDER BY identity`;
  return rows.map((row) => row.data);
}
async function evidence(db: DB): Promise<ResetEvidence[]> {
  const rows = await db.$queryRaw<Array<{ data: ResetEvidence }>>`SELECT data FROM codex_reset_evidence ORDER BY id`;
  return rows.map((row) => row.data);
}
async function saveRevision(tx: DB, id: string, value: ResetRevision) {
  await tx.$executeRaw`INSERT INTO codex_reset_revisions(event_id,revision,review_status,data)
    VALUES(${id}::uuid,${value.revision},${value.reviewStatus},${json(value)}::jsonb)`;
  for (const link of value.evidenceLinks) {
    await tx.$executeRaw`INSERT INTO codex_reset_revision_evidence(event_id,revision,evidence_id,role)
      VALUES(${id}::uuid,${value.revision},${link.evidenceId}::uuid,${link.role})`;
  }
}
async function reviewRevision(tx: DB, id: string, value: ResetRevision) {
  await tx.$executeRaw`UPDATE codex_reset_revisions SET review_status=${value.reviewStatus},data=${json(value)}::jsonb
    WHERE event_id=${id}::uuid AND revision=${value.revision}`;
}
async function validateEvidence(tx: DB, facts: ResetFacts, links: ResetEvidenceLink[], publish = false) {
  const all = await evidence(tx), approved = await sources(tx);
  const snapshot: ResetRevision["evidenceSnapshot"] = [];
  if (publish && links.length === 0) throw new Error("发布必须关联经过核验的来源证据。");
  for (const link of links) {
    const item = all.find((item) => item.id === link.evidenceId);
    if (!item) throw new Error("关联证据不存在。");
    const source = approved.find((source) => source.id === item.sourceId);
    if (!source) throw new Error("证据来源不存在。");
    if (publish && (!source?.active || item.availability !== "available")) throw new Error("发布证据不可用或来源已停用。");
    if (publish && link.role === "completion" && !link.note.trim()) throw new Error("完成证据须说明上下文及所支持的权益动作。");
    snapshot.push({ evidence: item, source });
  }
  if (publish && facts.eventStatus === "source_confirmed_complete" && !links.some((link) => link.role === "completion")) {
    throw new Error("完成状态必须有明确的完成证据。");
  }
  if (publish && facts.eventStatus === "cancelled" && !links.some((link) => link.role === "cancellation")) {
    throw new Error("取消状态必须有官方取消证据。");
  }
  for (const group of facts.groups) {
    if (!links.some((link) => link.evidenceId === group.evidenceId
      && (group.status !== "source_confirmed_complete" || link.role === "completion")
      && (group.status !== "cancelled" || link.role === "cancellation"))) throw new Error("分组进度缺少对应证据。");
  }
  return snapshot;
}
export async function saveCodexResetSource(input: Omit<ResetSource, "id" | "verifiedBy" | "generation">
  & { id?: string; expectedGeneration?: number }, actor: string) {
  const id = input.id ? resetId(input.id) : randomUUID();
  if (!["official_web", "official_x", "staff_x"].includes(input.kind)) throw new Error("来源类型无效。");
  const identity = resetText(input.identity, 200, true).toLowerCase();
  if (input.kind === "official_web" && !/^(?:[a-z0-9-]+\.)*openai\.com$|^(?:[a-z0-9-]+\.)*chatgpt\.com$/.test(identity)) {
    throw new Error("官方网页须使用 OpenAI 或 ChatGPT 官方域名。");
  }
  if (input.kind !== "official_web" && !/^\d{1,30}$/.test(identity)) throw new Error("X 来源须填写稳定数字用户 ID。");
  if (typeof input.active !== "boolean") throw new Error("来源启用状态无效。");
  const value: ResetSource = { id, generation: 1, kind: input.kind, identity, name: resetText(input.name, 180, true),
    username: resetText(input.username, 100, input.kind !== "official_web").replace(/^@/, ""),
    verificationUrl: resetUrl(input.verificationUrl, true),
    verificationNote: resetText(input.verificationNote, 2000, true), verifiedAt: resetInstant(input.verifiedAt),
    verifiedBy: actorId(actor), active: input.active };
  if (Date.parse(value.verifiedAt) > Date.now() + 60000) throw new Error("身份核验时间不能在未来。");
  return locked(actor, async (tx, who) => {
    if (input.id) {
      const prior = (await sources(tx)).find((item) => item.id === id);
      if (!prior) throw new Error("来源不存在。");
      matchGeneration(prior.generation, input.expectedGeneration!); value.generation = prior.generation + 1;
      if ((prior.kind === "official_web") !== (value.kind === "official_web") || prior.identity !== value.identity) {
        throw new Error("稳定来源身份不可更改，请新增来源。");
      }
      await tx.$executeRaw`UPDATE codex_reset_sources SET kind=${value.kind},data=${json(value)}::jsonb WHERE id=${id}::uuid`;
    } else {
      const existing = (await sources(tx)).find((item) => item.identity === identity);
      if (existing) return existing.id;
      await tx.$executeRaw`INSERT INTO codex_reset_sources(id,kind,identity,data)
        VALUES(${id}::uuid,${value.kind},${identity},${json(value)}::jsonb)`;
    }
    await audit(tx, who, "source", id, { active: value.active, generation: value.generation });
    return id;
  });
}
export async function saveCodexResetEvidence(input: Omit<ResetEvidence, "id" | "discoveredAt" | "generation">
  & { id?: string; expectedGeneration?: number }, actor: string) {
  const id = input.id ? resetId(input.id) : randomUUID();
  if (!["available", "unavailable", "removed"].includes(input.availability)) throw new Error("证据状态无效。");
  const value: ResetEvidence = { id, generation: 1, sourceId: resetId(input.sourceId), externalId: resetText(input.externalId, 2048, true),
    url: resetUrl(input.url, true), contextUrl: resetUrl(input.contextUrl),
    publishedAt: input.publishedAt ? resetInstant(input.publishedAt) : null, discoveredAt: now(),
    checkedAt: resetInstant(input.checkedAt), availability: input.availability, note: resetText(input.note, 2000) };
  if (Date.parse(value.checkedAt) > Date.now() + 60000) throw new Error("证据核验时间不能在未来。");
  return locked(actor, async (tx, who) => {
    const source = (await sources(tx)).find((item) => item.id === value.sourceId);
    if (!source) throw new Error("来源不存在。");
    const url = new URL(value.url);
    if (source.kind === "official_web" && url.hostname !== source.identity) throw new Error("证据 URL 与已核验域名不一致。");
    if (source.kind === "official_web" && value.externalId !== value.url) throw new Error("官方网页的稳定证据标识须为完整规范 URL。");
    if (source.kind !== "official_web" && (!/^(?:www\.)?(?:x|twitter)\.com$/.test(url.hostname)
      || !/^\/[^/]+\/status\/\d+$/.test(url.pathname))) throw new Error("X 证据须使用原帖链接。");
    if (source.kind !== "official_web" && ((!input.id && url.pathname.split("/")[1].toLowerCase() !== source.username.toLowerCase())
      || url.pathname.split("/")[3] !== value.externalId)) throw new Error("原帖作者或消息 ID 与已核验来源不一致。");
    const all = await evidence(tx);
    const existing = all.find((item) => item.sourceId === value.sourceId && item.externalId === value.externalId);
    if (!input.id && existing) return existing.id;
    if (input.id) {
      const prior = all.find((item) => item.id === id);
      if (!prior || prior.sourceId !== value.sourceId || prior.externalId !== value.externalId || prior.url !== value.url) {
        throw new Error("证据身份和原链接不可覆盖，请新增证据版本。");
      }
      matchGeneration(prior.generation, input.expectedGeneration!); value.generation = prior.generation + 1;
      value.discoveredAt = prior.discoveredAt;
      if (value.availability === "removed") value.note = "";
      await tx.$executeRaw`UPDATE codex_reset_evidence SET data=${json(value)}::jsonb WHERE id=${id}::uuid`;
      if (value.availability === "removed") {
        const affected = await tx.$queryRaw<RevisionRow[]>`SELECT DISTINCT r.* FROM codex_reset_revisions r
          JOIN codex_reset_revision_evidence link ON link.event_id=r.event_id AND link.revision=r.revision
          WHERE link.evidence_id=${id}::uuid`;
        for (const row of affected) {
          const revision = { ...row.data, reviewStatus: row.review_status };
          revision.evidenceLinks = revision.evidenceLinks.map((link) => link.evidenceId === id ? { ...link, note: "" } : link);
          revision.evidenceSnapshot = revision.evidenceSnapshot.map((item) => item.evidence.id === id
            ? { ...item, evidence: { ...item.evidence, note: "" } } : item);
          await reviewRevision(tx, row.event_id, revision);
        }
      }
    } else {
      await tx.$executeRaw`INSERT INTO codex_reset_evidence(id,source_id,external_id,data)
        VALUES(${id}::uuid,${value.sourceId}::uuid,${value.externalId},${json(value)}::jsonb)`;
    }
    await audit(tx, who, "evidence", id, { availability: value.availability, generation: value.generation });
    return id;
  });
}
export type ResetDraftInput = {
  eventId?: string; expectedGeneration: number; facts: unknown; evidenceLinks: unknown; changeKind: ResetChange; reason: string;
};
export async function saveCodexResetDraft(input: ResetDraftInput, actor: string) {
  const facts = parseResetFacts(input.facts), links = parseResetEvidenceLinks(input.evidenceLinks);
  const reason = resetText(input.reason, 2000, true);
  if (!["initial", "progress", "correction", "editorial"].includes(input.changeKind)) throw new Error("修订类型无效。");
  return locked(actor, async (tx, who) => {
    const id = input.eventId ? resetId(input.eventId) : randomUUID();
    if (!input.eventId) {
      matchGeneration(0, input.expectedGeneration);
      await tx.$executeRaw`INSERT INTO codex_reset_events(id) VALUES(${id}::uuid)`;
    }
    const current = await event(tx, id);
    matchGeneration(current.generation, input.expectedGeneration);
    if (current.merged_into) throw new Error("该事件已合并，请编辑保留事件。");
    const evidenceSnapshot = await validateEvidence(tx, facts, links);
    const history = await revisions(tx, id);
    const revision: ResetRevision = { revision: (history[0]?.revision ?? 0) + 1, reviewStatus: "draft", facts,
      evidenceLinks: links, evidenceSnapshot, changeKind: current.current_revision ? input.changeKind : "initial", reason,
      createdAt: now(), createdBy: who, reviewedAt: null, reviewedBy: null };
    await saveRevision(tx, id, revision);
    await tx.$executeRaw`UPDATE codex_reset_events SET generation=generation+1 WHERE id=${id}::uuid`;
    await audit(tx, who, "draft", id, { revision: revision.revision });
    return id;
  });
}
async function latest(tx: DB, id: string, expected: number) {
  const current = await event(tx, id);
  matchGeneration(current.generation, expected);
  if (current.merged_into) throw new Error("事件已合并。");
  const history = await revisions(tx, id);
  if (!history[0]) throw new Error("请先录入草稿。");
  return { current, history, revision: history[0] };
}
export async function submitCodexResetRevision(id: string, expected: number, actor: string) {
  return locked(actor, async (tx, who) => {
    const { revision } = await latest(tx, id, expected);
    if (revision.reviewStatus !== "draft" && revision.reviewStatus !== "rejected") throw new Error("只有草稿可以提交复核。");
    revision.facts = parseResetFacts(revision.facts, true);
    revision.evidenceSnapshot = await validateEvidence(tx, revision.facts, revision.evidenceLinks, true);
    revision.reviewStatus = "pending_review";
    await reviewRevision(tx, id, revision);
    await tx.$executeRaw`UPDATE codex_reset_events SET generation=generation+1 WHERE id=${id}::uuid`;
    await audit(tx, who, "submit", id, { revision: revision.revision });
  });
}
async function publish(tx: DB, current: EventRow, revision: ResetRevision, previous: ResetRevision | undefined, who: string) {
  const instant = now();
  const notify = resetNeedsNotification(previous?.facts ?? null, revision.facts, revision.changeKind);
  const notification = current.notification_version + (notify ? 1 : 0);
  revision.reviewStatus = "published"; revision.reviewedAt = instant; revision.reviewedBy = who;
  await reviewRevision(tx, current.id, revision);
  await tx.$executeRaw`UPDATE codex_reset_events SET current_revision=${revision.revision},generation=generation+1,
    notification_version=${notification},first_published_at=COALESCE(first_published_at,${instant}::timestamptz),
    updated_at=CASE WHEN ${notify} THEN ${instant}::timestamptz ELSE updated_at END WHERE id=${current.id}::uuid`;
  if (notify) await tx.$executeRaw`INSERT INTO codex_reset_notifications(event_id,notification_version,revision,published_at)
    VALUES(${current.id}::uuid,${notification},${revision.revision},${instant}::timestamptz)`;
  await audit(tx, who, revision.changeKind, current.id, { revision: revision.revision, notificationVersion: notification });
}
export async function publishCodexResetRevision(id: string, expected: number, actor: string) {
  return locked(actor, async (tx, who) => {
    const current = await event(tx, id), history = await revisions(tx, id), revision = history[0];
    // A transport retry of exactly the last successful publication is a no-op.
    if (current.generation === expected + 1 && revision?.reviewStatus === "published"
      && current.current_revision === revision.revision && revision.reviewedBy === who) return;
    matchGeneration(current.generation, expected);
    if (current.merged_into || !revision || revision.reviewStatus !== "pending_review") throw new Error("请先提交待审核版本。");
    revision.facts = parseResetFacts(revision.facts, true);
    const currentEvidence = await validateEvidence(tx, revision.facts, revision.evidenceLinks, true);
    const signature = (items: ResetRevision["evidenceSnapshot"]) => json(items.map((item) =>
      [item.evidence.id, item.evidence.generation, item.source.id, item.source.generation]));
    if (signature(currentEvidence) !== signature(revision.evidenceSnapshot)) {
      throw new Error("来源或证据已更新，请退回并重新提交复核。");
    }
    await publish(tx, current, revision, history.find((item) => item.revision === current.current_revision), who);
  });
}
export async function rejectCodexResetRevision(id: string, expected: number, reason: string, actor: string) {
  const note = resetText(reason, 2000, true);
  return locked(actor, async (tx, who) => {
    const { revision } = await latest(tx, id, expected);
    if (revision.reviewStatus !== "pending_review") throw new Error("只有待审版本可以退回。");
    revision.reviewStatus = "rejected"; revision.reason = note; revision.reviewedBy = who; revision.reviewedAt = now();
    await reviewRevision(tx, id, revision);
    await tx.$executeRaw`UPDATE codex_reset_events SET generation=generation+1 WHERE id=${id}::uuid`;
    await audit(tx, who, "reject", id, { revision: revision.revision });
  });
}
async function withdraw(tx: DB, current: EventRow, reason: Bilingual, who: string) {
  const history = await revisions(tx, current.id), prior = history.find((item) => item.revision === current.current_revision);
  if (!prior) throw new Error("只有已发布事件可以撤回。");
  if (prior.changeKind === "withdrawal") throw new Error("该事件已经撤回。");
  const facts = emptyResetFacts();
  facts.title = { zh: "公告记录已撤回", en: "Announcement record withdrawn" }; facts.summary = reason;
  const revision: ResetRevision = { revision: history[0].revision + 1, reviewStatus: "published", facts,
    evidenceLinks: [], evidenceSnapshot: [], changeKind: "withdrawal", reason: "Withdrawal", createdAt: now(), createdBy: who,
    reviewedAt: null, reviewedBy: null };
  // Every previous public snapshot is suppressed; an old notification must not continue exposing it.
  for (const item of history) if (item.reviewStatus === "published") {
    item.reviewStatus = "withdrawn";
    await reviewRevision(tx, current.id, item);
  }
  await saveRevision(tx, current.id, revision);
  await publish(tx, current, revision, prior, who);
}
export async function withdrawCodexResetEvent(id: string, expected: number, reason: Bilingual, actor: string) {
  const text = parseResetBilingual(reason, 2000, true);
  return locked(actor, async (tx, who) => {
    const current = await event(tx, id); matchGeneration(current.generation, expected);
    if (current.merged_into) throw new Error("事件已合并。");
    await withdraw(tx, current, text, who);
  });
}
export async function mergeCodexResetEvents(sourceId: string, targetId: string, expectedSource: number,
  expectedTarget: number, reason: string, actor: string) {
  if (sourceId === targetId) throw new Error("不能合并到自身。");
  const note = resetText(reason, 2000, true);
  return locked(actor, async (tx, who) => {
    const source = await event(tx, sourceId), target = await event(tx, targetId);
    matchGeneration(source.generation, expectedSource); matchGeneration(target.generation, expectedTarget);
    if (source.merged_into || target.merged_into) throw new Error("请选择未合并的事件。");
    if (!target.current_revision) throw new Error("保留事件必须已经发布。");
    const targetRevision = (await revisions(tx, targetId)).find((item) => item.revision === target.current_revision);
    if (targetRevision?.changeKind === "withdrawal") throw new Error("不能合并到已撤回的事件。");
    if (source.current_revision) await withdraw(tx, source, {
      zh: "此重复记录已合并，请查看保留事件。", en: "This duplicate record was merged. View the retained event.",
    }, who);
    await tx.$executeRaw`UPDATE codex_reset_events SET merged_into=${targetId}::uuid,generation=generation+1 WHERE id=${sourceId}::uuid`;
    await tx.$executeRaw`UPDATE codex_reset_events SET generation=generation+1 WHERE id=${targetId}::uuid`;
    await audit(tx, who, "merge", sourceId, { targetId, reason: note });
  });
}
export async function updateCodexResetSettings(input: Omit<ResetSettings, "generation"> & { expectedGeneration: number }, actor: string) {
  if (typeof input.enabled !== "boolean") throw new Error("启用状态无效。");
  if (input.checkIntervalHours !== null && (!Number.isFinite(input.checkIntervalHours)
    || input.checkIntervalHours < 1 || input.checkIntervalHours > 720)) throw new Error("检查间隔须为 1–720 小时或未承诺。");
  const value = { enabled: input.enabled, maintenanceOwner: resetText(input.maintenanceOwner, 200, input.enabled),
    maintenanceHours: parseResetBilingual(input.maintenanceHours, 300, input.enabled), checkIntervalHours: input.checkIntervalHours };
  return locked(actor, async (tx, who) => {
    const current = await settings(tx); matchGeneration(current.generation, input.expectedGeneration);
    await tx.$executeRaw`UPDATE codex_reset_settings SET generation=generation+1,data=${json(value)}::jsonb WHERE singleton=TRUE`;
    await audit(tx, who, "settings", "settings", { enabled: value.enabled, generation: current.generation + 1 });
  });
}
export async function recordCodexResetCheck(input: Omit<ResetCheck, "id">, actor: string) {
  if (!Array.isArray(input.sourceIds) || input.sourceIds.length > 100 || !["success", "partial", "failed"].includes(input.result)) {
    throw new Error("检查范围或结果无效。");
  }
  const value: ResetCheck = { id: randomUUID(), sourceIds: [...new Set(input.sourceIds.map(resetId))],
    startedAt: resetInstant(input.startedAt), finishedAt: resetInstant(input.finishedAt), result: input.result };
  if (value.startedAt > value.finishedAt || Date.parse(value.finishedAt) > Date.now() + 60_000) throw new Error("检查时间范围无效。");
  return locked(actor, async (tx, who) => {
    const all = await sources(tx), active = all.filter((item) => item.active);
    if (!value.sourceIds.length || value.sourceIds.some((id) => !all.some((source) => source.id === id))) throw new Error("请选择有效检查来源。");
    if (value.result === "success" && active.some((source) => !value.sourceIds.includes(source.id))) {
      throw new Error("完整检查必须覆盖所有已启用来源。");
    }
    await tx.$executeRaw`INSERT INTO codex_reset_checks(id,finished_at,data,actor)
      VALUES(${value.id}::uuid,${value.finishedAt}::timestamptz,${json(value)}::jsonb,${who})`;
    await audit(tx, who, "check", value.id, { result: value.result });
    return value.id;
  });
}
export async function readCodexResetAdmin(): Promise<ResetAdminResult> {
  return prisma.$transaction(async (tx) => {
    const config = await settings(tx), allSources = await sources(tx), allEvidence = await evidence(tx);
    const rows = await tx.$queryRaw<EventRow[]>`SELECT * FROM codex_reset_events ORDER BY updated_at DESC,id`;
    const events: ResetAdminEvent[] = [];
    for (const row of rows) {
      const history = await revisions(tx, row.id);
      events.push({ id: row.id, generation: row.generation, mergedInto: row.merged_into, currentRevision: row.current_revision,
        notificationVersion: row.notification_version, firstPublishedAt: row.first_published_at ? iso(row.first_published_at) : null,
        updatedAt: iso(row.updated_at), draft: history[0] ?? null, revisions: history });
    }
    const checks = await tx.$queryRaw<Array<{ data: ResetCheck }>>`SELECT data FROM codex_reset_checks ORDER BY finished_at DESC LIMIT 30`;
    return { settings: config, sources: allSources, evidence: allEvidence, events, checks: checks.map((row) => row.data) };
  }, { isolationLevel: "RepeatableRead" });
}
async function publicEvent(db: DB, row: EventRow, allEvidence: ResetEvidence[], allSources: ResetSource[]): Promise<ResetPublicEvent> {
  const history = await revisions(db, row.id), current = history.find((item) => item.revision === row.current_revision);
  if (!current || current.reviewStatus !== "published" || !row.first_published_at || !current.reviewedAt) throw new Error("公开修订状态异常。");
  const publicEvidence = current.evidenceLinks.map((link) => {
    const frozen = current.evidenceSnapshot.find((item) => item.evidence.id === link.evidenceId);
    const item = frozen?.evidence, source = frozen?.source;
    const liveEvidence = allEvidence.find((item) => item.id === link.evidenceId);
    const liveSource = allSources.find((source) => source.id === item?.sourceId);
    if (!item || !source || !liveEvidence || !liveSource) throw new Error("公开证据关联异常。");
    return { id: item.id, name: source.name, kind: source.kind, url: item.url, publishedAt: item.publishedAt,
      checkedAt: liveEvidence.checkedAt, reviewedEvidenceAt: item.checkedAt,
      availability: liveEvidence.availability, active: liveSource.active };
  }).filter((item, index, items) => items.findIndex((other) => other.id === item.id) === index);
  return { id: row.id, revision: current.revision, notificationVersion: row.notification_version, facts: current.facts,
    changeKind: current.changeKind, firstPublishedAt: iso(row.first_published_at), updatedAt: iso(row.updated_at),
    claimEnded: current.facts.times.claimDeadline.precision === "instant"
      && Date.parse(current.facts.times.claimDeadline.value) < Date.now(),
    reviewedAt: current.reviewedAt, evidence: publicEvidence,
    history: history.filter((item) => item.reviewStatus === "published" && item.reviewedAt).map((item) => ({
      revision: item.revision, changeKind: item.changeKind, publishedAt: item.reviewedAt!,
      // Internal review reasons and historic factual claims are not public DTOs.
      note: item.changeKind === "withdrawal" ? item.facts.summary : { zh: "已人工复核的更新", en: "Manually reviewed update" },
    })),
  };
}
export async function readCodexResetPublic(input: { page?: number; eventId?: string } = {}): Promise<ResetPublicResult> {
  const page = Number.isSafeInteger(input.page) && input.page! > 0 ? Math.min(input.page!, 10000) : 1;
  const requestedEventId = input.eventId ? resetId(input.eventId) : null, pageSize = 20;
  return prisma.$transaction(async (tx) => {
    const config = await settings(tx);
    const empty: ResetPublicResult = { enabled: config.enabled, events: [], total: 0, page, pageSize, requestedEventId,
      resolvedEventId: null, maintenance: { mode: "manual", hours: config.maintenanceHours, lastCheckedAt: null, delayed: false, sourceNames: [] } };
    if (!config.enabled) return empty;
    const allSources = await sources(tx), allEvidence = await evidence(tx), active = allSources.filter((item) => item.active);
    const checks = active.length ? await tx.$queryRaw<Array<{ data: ResetCheck }>>`
      SELECT data FROM codex_reset_checks WHERE data->>'result'='success'
      AND data->'sourceIds' @> ${json(active.map((source) => source.id))}::jsonb
      ORDER BY finished_at DESC LIMIT 1` : [];
    const last = checks[0]?.data;
    empty.maintenance = { mode: "manual", hours: config.maintenanceHours, lastCheckedAt: last?.finishedAt ?? null,
      delayed: Boolean(last && config.checkIntervalHours && Date.now() - Date.parse(last.finishedAt) > config.checkIntervalHours * 3600000),
      sourceNames: active.map((source) => source.name) };
    const totals = await tx.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) FROM codex_reset_events WHERE current_revision IS NOT NULL AND merged_into IS NULL`;
    empty.total = Number(totals[0].count);
    let rows: EventRow[];
    if (requestedEventId) {
      let id = requestedEventId;
      const seen = new Set<string>();
      rows = [];
      while (!seen.has(id) && seen.size < 20) {
        seen.add(id);
        const found = await tx.$queryRaw<EventRow[]>`SELECT * FROM codex_reset_events WHERE id=${id}::uuid`;
        if (!found[0]) break;
        if (found[0].merged_into) { id = found[0].merged_into; continue; }
        if (found[0].current_revision) { rows = found; empty.resolvedEventId = id; }
        break;
      }
    } else {
      rows = await tx.$queryRaw<EventRow[]>`SELECT * FROM codex_reset_events
        WHERE current_revision IS NOT NULL AND merged_into IS NULL ORDER BY updated_at DESC,id
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
    }
    for (const row of rows) empty.events.push(await publicEvent(tx, row, allEvidence, allSources));
    return empty;
  }, { isolationLevel: "RepeatableRead" });
}
export async function readCodexResetFeed(): Promise<{ enabled: boolean; items: ResetFeedItem[] }> {
  return prisma.$transaction(async (tx) => {
    const config = await settings(tx);
    if (!config.enabled) return { enabled: false, items: [] };
    const rows = await tx.$queryRaw<Array<{
      event_id: string; notification_version: number; revision: number; published_at: Date;
      current_revision: number; data: ResetRevision; current_data: ResetRevision; review_status: string;
      corrected: boolean; withdrawn: boolean;
    }>>`SELECT n.*,e.current_revision,r.data,r.review_status,c.data AS current_data,
      EXISTS(SELECT 1 FROM codex_reset_revisions later WHERE later.event_id=n.event_id AND later.revision>n.revision
        AND later.review_status IN ('published','withdrawn') AND later.data->>'changeKind'='correction') AS corrected,
      EXISTS(SELECT 1 FROM codex_reset_revisions later WHERE later.event_id=n.event_id AND later.revision>n.revision
        AND later.review_status IN ('published','withdrawn') AND later.data->>'changeKind'='withdrawal') AS withdrawn
      FROM codex_reset_notifications n JOIN codex_reset_events e ON e.id=n.event_id
      JOIN codex_reset_revisions r ON r.event_id=n.event_id AND r.revision=n.revision
      JOIN codex_reset_revisions c ON c.event_id=e.id AND c.revision=e.current_revision
      ORDER BY n.published_at DESC,n.event_id,n.notification_version DESC LIMIT 100`;
    return { enabled: true, items: rows.map((row) => ({ eventId: row.event_id,
      notificationVersion: row.notification_version, revision: row.revision,
      guid: `urn:geosub:codex-reset:${row.event_id}:${row.notification_version}`, publishedAt: iso(row.published_at),
      facts: row.review_status === "withdrawn" ? { ...emptyResetFacts(),
        title: { zh: "旧公告已撤回", en: "Earlier announcement withdrawn" },
        summary: { zh: "请查看事件的最新复核记录。", en: "See the latest reviewed event record." } } : row.data.facts,
      changeKind: row.review_status === "withdrawn" ? "withdrawal" : row.data.changeKind,
      superseded: row.current_revision !== row.revision,
      currentChangeKind: row.withdrawn ? "withdrawal" : row.corrected ? "correction" : row.current_data.changeKind,
    })) };
  }, { isolationLevel: "RepeatableRead" });
}
