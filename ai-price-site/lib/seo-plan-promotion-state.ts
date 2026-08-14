import { seoPlanSitemapProductSlugs } from "./seo-indexing-policy.ts";

export const SEO_PLAN_PROMOTION_SETTING_KEY =
  "seo.plan_sitemap_promotion_state.v1";
export const SEO_PLAN_PROMOTION_HISTORY_LIMIT = 12;

export type PlanSitemapPromotionRevision = {
  id: string;
  kind: "apply" | "rollback";
  changedAt: string;
  actorLabel: string;
  reason: string;
  addedSlugs: string[];
  removedSlugs: string[];
  previousActiveSlugs: string[];
  nextActiveSlugs: string[];
};

export type PlanSitemapPromotionState = {
  version: 1;
  activeSlugs: string[];
  revisions: PlanSitemapPromotionRevision[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeSlugs(value: unknown) {
  if (!Array.isArray(value)) return [];

  return [...new Set(
    value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().toLowerCase())
      .filter((item) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item)),
  )].sort();
}

function parseRevision(value: unknown): PlanSitemapPromotionRevision | null {
  if (!isRecord(value)) return null;

  const id = typeof value.id === "string" ? value.id : "";
  const kind = value.kind === "rollback" ? "rollback" : "apply";
  const changedAt = typeof value.changedAt === "string" ? value.changedAt : "";
  const actorLabel = typeof value.actorLabel === "string" ? value.actorLabel : "";
  const reason = typeof value.reason === "string" ? value.reason : "";
  const previousActiveSlugs = normalizeSlugs(value.previousActiveSlugs);
  const nextActiveSlugs = normalizeSlugs(value.nextActiveSlugs);

  if (
    !id
    || !changedAt
    || !actorLabel
    || !reason
    || previousActiveSlugs.length === 0
    || nextActiveSlugs.length === 0
  ) {
    return null;
  }

  return {
    id,
    kind,
    changedAt,
    actorLabel,
    reason,
    addedSlugs: normalizeSlugs(value.addedSlugs),
    removedSlugs: normalizeSlugs(value.removedSlugs),
    previousActiveSlugs,
    nextActiveSlugs,
  };
}

export function getDefaultPlanSitemapPromotionState(): PlanSitemapPromotionState {
  return {
    version: 1,
    activeSlugs: normalizeSlugs(seoPlanSitemapProductSlugs),
    revisions: [],
  };
}

export function parsePlanSitemapPromotionState(
  value: string | null | undefined,
): PlanSitemapPromotionState {
  if (!value) return getDefaultPlanSitemapPromotionState();

  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed) || parsed.version !== 1) {
      return getDefaultPlanSitemapPromotionState();
    }

    const activeSlugs = normalizeSlugs(parsed.activeSlugs);
    if (activeSlugs.length === 0) {
      return getDefaultPlanSitemapPromotionState();
    }

    const revisions = Array.isArray(parsed.revisions)
      ? parsed.revisions
        .map(parseRevision)
        .filter((item): item is PlanSitemapPromotionRevision => Boolean(item))
        .slice(-SEO_PLAN_PROMOTION_HISTORY_LIMIT)
      : [];

    return {
      version: 1,
      activeSlugs,
      revisions,
    };
  } catch {
    return getDefaultPlanSitemapPromotionState();
  }
}

function difference(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item));
}

export function createPlanSitemapPromotionRevision({
  current,
  nextActiveSlugs,
  id,
  changedAt,
  actorLabel,
  reason,
  kind = "apply",
}: {
  current: PlanSitemapPromotionState;
  nextActiveSlugs: string[];
  id: string;
  changedAt: string;
  actorLabel: string;
  reason: string;
  kind?: PlanSitemapPromotionRevision["kind"];
}): PlanSitemapPromotionState {
  const previous = normalizeSlugs(current.activeSlugs);
  const next = normalizeSlugs(nextActiveSlugs);
  if (next.length === 0) {
    throw new Error("The promoted product list cannot be empty.");
  }
  if (previous.join("|") === next.join("|")) {
    throw new Error("The promoted product list did not change.");
  }

  const revision: PlanSitemapPromotionRevision = {
    id,
    kind,
    changedAt,
    actorLabel,
    reason: reason.trim().slice(0, 500),
    addedSlugs: difference(next, previous),
    removedSlugs: difference(previous, next),
    previousActiveSlugs: previous,
    nextActiveSlugs: next,
  };

  if (!revision.reason) {
    throw new Error("A promotion change reason is required.");
  }

  return {
    version: 1,
    activeSlugs: next,
    revisions: [...current.revisions, revision].slice(
      -SEO_PLAN_PROMOTION_HISTORY_LIMIT,
    ),
  };
}

export function rollbackLatestPlanSitemapPromotionRevision({
  current,
  expectedRevisionId,
  id,
  changedAt,
  actorLabel,
}: {
  current: PlanSitemapPromotionState;
  expectedRevisionId: string;
  id: string;
  changedAt: string;
  actorLabel: string;
}) {
  const latest = current.revisions.at(-1);
  if (!latest || latest.id !== expectedRevisionId) {
    throw new Error("The promotion history changed. Reload before rolling back.");
  }

  return createPlanSitemapPromotionRevision({
    current,
    nextActiveSlugs: latest.previousActiveSlugs,
    id,
    changedAt,
    actorLabel,
    reason: `撤销调整 ${latest.id}`,
    kind: "rollback",
  });
}
