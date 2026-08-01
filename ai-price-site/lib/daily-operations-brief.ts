import type { DailyOperationItem, DailyOperationState } from "./admin-daily-operations.ts";
import { createHash } from "node:crypto";

export type DailyOperationsBriefLevel =
  | "critical"
  | "attention"
  | "progress"
  | "healthy";

export type DailyOperationsBrief = {
  generatedAt: Date;
  level: DailyOperationsBriefLevel;
  title: string;
  summary: string;
  counts: Record<DailyOperationState, number>;
  interventionItems: DailyOperationItem[];
  progressItems: DailyOperationItem[];
  healthyCount: number;
};

function emptyCounts(): Record<DailyOperationState, number> {
  return {
    failed: 0,
    action: 0,
    running: 0,
    queued: 0,
    healthy: 0,
  };
}

function briefLevel(counts: Record<DailyOperationState, number>): DailyOperationsBriefLevel {
  if (counts.failed > 0) return "critical";
  if (counts.action > 0) return "attention";
  if (counts.running + counts.queued > 0) return "progress";
  return "healthy";
}

function briefCopy(
  level: DailyOperationsBriefLevel,
  counts: Record<DailyOperationState, number>,
) {
  if (level === "critical") {
    return {
      title: `${counts.failed} 个产品采集失败`,
      summary: `另有 ${counts.action} 个产品需要处理，建议先检查失败记录。`,
    };
  }
  if (level === "attention") {
    return {
      title: `${counts.action} 个产品需要处理`,
      summary: "其余采集任务正在运行、排队或保持健康。",
    };
  }
  if (level === "progress") {
    return {
      title: "产品任务正在自动执行",
      summary: `${counts.running} 个运行中，${counts.queued} 个已排队，无需重复操作。`,
    };
  }
  return {
    title: "今日产品状态正常",
    summary: `${counts.healthy} 个已上线产品当前无需人工处理。`,
  };
}

export function buildDailyOperationsBrief(
  items: DailyOperationItem[],
  generatedAt = new Date(),
): DailyOperationsBrief {
  const counts = emptyCounts();
  for (const item of items) counts[item.state] += 1;

  const level = briefLevel(counts);
  const copy = briefCopy(level, counts);

  return {
    generatedAt,
    level,
    title: copy.title,
    summary: copy.summary,
    counts,
    interventionItems: items.filter(
      (item) => item.state === "failed" || item.state === "action",
    ),
    progressItems: items.filter(
      (item) => item.state === "running" || item.state === "queued",
    ),
    healthyCount: counts.healthy,
  };
}

export function serializeDailyOperationsBrief(brief: DailyOperationsBrief) {
  return {
    event: "geosub.daily_operations_brief",
    generatedAt: brief.generatedAt.toISOString(),
    level: brief.level,
    title: brief.title,
    summary: brief.summary,
    counts: brief.counts,
    interventionRequired: brief.interventionItems.length > 0,
    products: brief.interventionItems.map((item) => ({
      slug: item.productSlug,
      name: item.productName,
      state: item.state,
      reason: item.reason,
      nextStep: item.actionLabel,
      path: item.actionHref,
    })),
  };
}

export function fingerprintDailyOperationsBrief(brief: DailyOperationsBrief) {
  const interventionState = brief.interventionItems
    .map((item) => ({
      slug: item.productSlug,
      state: item.state,
      reason: item.reason.trim(),
    }))
    .sort((left, right) => left.slug.localeCompare(right.slug));

  return createHash("sha256")
    .update(JSON.stringify(interventionState))
    .digest("hex");
}

export function shouldSuppressDailyOperationsBrief(
  latest: { fingerprint: string; status: string } | null,
  currentFingerprint: string,
) {
  return Boolean(
    latest
    && latest.fingerprint === currentFingerprint
    && (latest.status === "sent" || latest.status === "suppressed"),
  );
}
