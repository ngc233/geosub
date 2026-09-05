import { createHash } from "node:crypto";

export const GROWTH_INTELLIGENCE_SCHEMA_VERSION =
  "growth-intelligence.v1" as const;
export const GROWTH_RECOMMENDATION_TYPES = [
  "observe",
  "investigate",
  "data_quality_candidate",
  "content_gap_candidate",
  "experiment_proposal",
] as const;
export const GROWTH_QUERY_MIN_SAMPLE_COUNT = 5;
export const GROWTH_WEEKLY_SETTLED_DAY_COUNT = 7;

export type GrowthIntelligenceSchemaVersion =
  typeof GROWTH_INTELLIGENCE_SCHEMA_VERSION;
export type GrowthStatus =
  | "complete"
  | "partial"
  | "failed"
  | "unavailable";
export type GrowthSource =
  | "google_search_console"
  | "bing_webmaster"
  | "ga4"
  | "cloudflare"
  | "first_party_daily_stats"
  | "first_party_events"
  | "page_quality"
  | "experiment_registry";
export type GrowthRecommendationType =
  (typeof GROWTH_RECOMMENDATION_TYPES)[number];

export type GrowthJsonValue =
  | null
  | boolean
  | number
  | string
  | GrowthJsonValue[]
  | { [key: string]: GrowthJsonValue };

export type GrowthSourceSnapshotV1 = {
  source: GrowthSource;
  periodStart: string;
  periodEnd: string;
  settledThrough: string | null;
  sourceTimezone: string;
  collectedAt: string;
  status: GrowthStatus;
  sampling: {
    kind: string;
    missingShare: number | null;
  };
  contractVersion: string;
  facts: GrowthJsonValue | null;
  limitations?: readonly string[];
};

export type DailyGrowthSnapshotV1 = {
  schemaVersion: GrowthIntelligenceSchemaVersion;
  snapshotId: string;
  snapshotHash: string;
  generatedAt: string;
  date: string;
  comparisonKey: string;
  comparabilitySignature: string;
  status: GrowthStatus;
  settled: boolean;
  sources: GrowthSourceSnapshotV1[];
  limitations: string[];
};

export type GrowthPageTargetV1 = {
  canonicalPath: string;
  locale?: string;
};

export type GrowthExperimentLockV1 = {
  experimentId: string;
  active: boolean;
  target: GrowthPageTargetV1;
  lockedFields: readonly string[];
  earliestDecisionDate?: string;
};

export type GrowthEvidenceReferenceV1 = {
  source: GrowthSource;
  snapshotHash: string;
  metric: string;
};

export type GrowthRecommendationInputV1 = {
  id: string;
  type: GrowthRecommendationType;
  issue: string;
  targets: readonly GrowthPageTargetV1[];
  affectedSources: readonly GrowthSource[];
  evidence: readonly GrowthEvidenceReferenceV1[];
  sampleSize: number;
  confidenceBoundary: string;
  expectedMetric: string;
  guardrail: string;
  minimumAction: string;
  acceptanceWindow: string;
  rollbackCondition: string;
};

export type GrowthRecommendationV1 = GrowthRecommendationInputV1 & {
  actionable: boolean;
  blockedByExperimentIds: string[];
  blockReasons: Array<
    | "insufficient_settled_window"
    | "active_experiment_lock"
    | "observation_only"
  >;
};

export type WeeklyGrowthReportV1 = {
  schemaVersion: GrowthIntelligenceSchemaVersion;
  reportId: string;
  reportHash: string;
  generatedAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  status: GrowthStatus;
  comparisonReady: boolean;
  actionable: boolean;
  snapshotHashes: string[];
  recommendations: GrowthRecommendationV1[];
  limitations: string[];
};

export type GrowthQueryClassificationV1 =
  | {
      schemaVersion: GrowthIntelligenceSchemaVersion;
      status: "accepted";
      safeQuery: string;
      sampleCount: number;
      untrustedEvidence: true;
      reason: null;
    }
  | {
      schemaVersion: GrowthIntelligenceSchemaVersion;
      status:
        | "suppressed_empty"
        | "suppressed_low_volume"
        | "suppressed_sensitive"
        | "suppressed_malicious"
        | "suppressed_invalid";
      safeQuery: null;
      sampleCount: number;
      untrustedEvidence: true;
      reason: string;
    };

const GROWTH_STATUSES = new Set<GrowthStatus>([
  "complete",
  "partial",
  "failed",
  "unavailable",
]);
const GROWTH_SOURCES = new Set<GrowthSource>([
  "google_search_console",
  "bing_webmaster",
  "ga4",
  "cloudflare",
  "first_party_daily_stats",
  "first_party_events",
  "page_quality",
  "experiment_registry",
]);
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_PATTERN = /(?:\+?\d[\s().-]*){9,}/;
const SECRET_PATTERN =
  /\b(?:bearer\s+[a-z0-9._~-]{8,}|(?:api[_-]?key|access[_-]?token|password|passwd|secret|session[_-]?id)\s*[:=]\s*\S+|(?:sk|pk)_[a-z0-9_-]{12,})/i;
const IDENTIFIER_PATTERN =
  /\b(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|(?:\d[ -]?){13,19})\b/i;
const IPV4_PATTERN =
  /\b(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}\b/;
// Preserve the overview's existing conservative exclusions in the shared gate.
const PRIVATE_QUERY_FRAGMENT_PATTERN =
  /@|https?:\/\/|www\.|\b(?:token|password|secret|api[_ -]?key)\b|\b\d{6,}\b/i;
const MALICIOUS_QUERY_PATTERNS = [
  /\bignore\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions?|messages?|rules?)\b/i,
  /\b(?:reveal|show|print|repeat|leak|exfiltrate)\b.{0,40}\b(?:system|developer)\s+(?:prompt|message|instructions?)\b/i,
  /\b(?:system|developer|assistant)\s*:\s*(?:ignore|override|reveal|execute|follow)\b/i,
  /\b(?:jailbreak|prompt\s*injection|do\s+anything\s+now)\b/i,
  /<\s*script\b/i,
  /\bjavascript\s*:/i,
];

function assertPlainJson(value: unknown, path = "value"): GrowthJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${path} must contain only finite JSON numbers.`);
    }
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => assertPlainJson(item, `${path}[${index}]`));
  }
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${path} must contain only plain JSON objects.`);
    }
    const normalized: Record<string, GrowthJsonValue> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      normalized[key] = assertPlainJson(
        (value as Record<string, unknown>)[key],
        `${path}.${key}`,
      );
    }
    return normalized;
  }
  throw new TypeError(`${path} must be JSON serializable without data loss.`);
}

function canonicalJson(value: unknown) {
  return JSON.stringify(assertPlainJson(value));
}

export function canonicalGrowthHash(value: unknown) {
  return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

function assertIsoDate(value: string, label: string) {
  if (!ISO_DATE_PATTERN.test(value)) {
    throw new TypeError(`${label} must use YYYY-MM-DD.`);
  }
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(timestamp)
    || new Date(timestamp).toISOString().slice(0, 10) !== value
  ) {
    throw new TypeError(`${label} must be a real UTC calendar date.`);
  }
  return timestamp;
}

function assertNonEmpty(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new TypeError(`${label} must not be empty.`);
  return normalized;
}

function normalizePageTarget(target: GrowthPageTargetV1): GrowthPageTargetV1 {
  let canonicalPath = assertNonEmpty(target.canonicalPath, "canonicalPath")
    .split(/[?#]/, 1)[0];
  if (!canonicalPath.startsWith("/")) {
    throw new TypeError("canonicalPath must start with '/'.");
  }
  canonicalPath = canonicalPath.replace(/\/{2,}/g, "/");
  if (canonicalPath.length > 1) canonicalPath = canonicalPath.replace(/\/$/, "");
  const locale = target.locale?.trim().toLowerCase();
  return locale ? { canonicalPath, locale } : { canonicalPath };
}

function pageTargetMatches(
  recommendationTarget: GrowthPageTargetV1,
  lockTarget: GrowthPageTargetV1,
) {
  const recommendation = normalizePageTarget(recommendationTarget);
  const lock = normalizePageTarget(lockTarget);
  return recommendation.canonicalPath === lock.canonicalPath
    && (
      !lock.locale
      || !recommendation.locale
      || recommendation.locale === lock.locale
    );
}

function isGrowthRecommendationType(
  value: unknown,
): value is GrowthRecommendationType {
  return typeof value === "string"
    && GROWTH_RECOMMENDATION_TYPES.includes(value as GrowthRecommendationType);
}

export function deriveGrowthStatus(
  statuses: readonly GrowthStatus[],
): GrowthStatus {
  for (const status of statuses) {
    if (!GROWTH_STATUSES.has(status)) {
      throw new TypeError(`Unknown growth status: ${String(status)}.`);
    }
  }
  if (statuses.length === 0 || statuses.every((status) => status === "unavailable")) {
    return "unavailable";
  }
  if (statuses.every((status) => status === "complete")) return "complete";
  const hasUsableFacts = statuses.some(
    (status) => status === "complete" || status === "partial",
  );
  if (!hasUsableFacts && statuses.some((status) => status === "failed")) {
    return "failed";
  }
  return "partial";
}

function normalizeSourceSnapshot(
  source: GrowthSourceSnapshotV1,
  date: string,
): GrowthSourceSnapshotV1 {
  if (!GROWTH_SOURCES.has(source.source)) {
    throw new TypeError(`Unknown growth source: ${String(source.source)}.`);
  }
  if (!GROWTH_STATUSES.has(source.status)) {
    throw new TypeError(`Unknown growth status: ${String(source.status)}.`);
  }
  assertIsoDate(source.periodStart, `${source.source}.periodStart`);
  assertIsoDate(source.periodEnd, `${source.source}.periodEnd`);
  if (source.settledThrough !== null) {
    assertIsoDate(source.settledThrough, `${source.source}.settledThrough`);
  }
  if (source.periodStart !== date || source.periodEnd !== date) {
    throw new TypeError(`${source.source} must describe exactly the requested daily date.`);
  }
  if (!Number.isFinite(Date.parse(source.collectedAt))) {
    throw new TypeError(`${source.source}.collectedAt must be an ISO timestamp.`);
  }
  if (
    source.sampling.missingShare !== null
    && (
      !Number.isFinite(source.sampling.missingShare)
      || source.sampling.missingShare < 0
      || source.sampling.missingShare > 1
    )
  ) {
    throw new TypeError(`${source.source}.sampling.missingShare must be between 0 and 1.`);
  }
  const hasUsableFacts = source.status === "complete" || source.status === "partial";
  if (hasUsableFacts && source.facts === null) {
    throw new TypeError(`${source.source} ${source.status} status requires facts.`);
  }
  if (!hasUsableFacts && source.facts !== null) {
    throw new TypeError(`${source.source} ${source.status} status cannot expose stale facts.`);
  }
  return {
    source: source.source,
    periodStart: source.periodStart,
    periodEnd: source.periodEnd,
    settledThrough: source.settledThrough,
    sourceTimezone: assertNonEmpty(
      source.sourceTimezone,
      `${source.source}.sourceTimezone`,
    ),
    collectedAt: source.collectedAt,
    status: source.status,
    sampling: {
      kind: assertNonEmpty(source.sampling.kind, `${source.source}.sampling.kind`),
      missingShare: source.sampling.missingShare,
    },
    contractVersion: assertNonEmpty(
      source.contractVersion,
      `${source.source}.contractVersion`,
    ),
    facts: source.facts === null ? null : assertPlainJson(source.facts, `${source.source}.facts`),
    limitations: [...(source.limitations || [])]
      .map((limitation) => limitation.trim())
      .filter(Boolean)
      .sort(),
  };
}

export function buildDailyGrowthSnapshot({
  date,
  generatedAt,
  comparisonKey,
  sources,
}: {
  date: string;
  generatedAt: string;
  comparisonKey: string;
  sources: readonly GrowthSourceSnapshotV1[];
}): DailyGrowthSnapshotV1 {
  assertIsoDate(date, "date");
  if (!Number.isFinite(Date.parse(generatedAt))) {
    throw new TypeError("generatedAt must be an ISO timestamp.");
  }
  const normalizedComparisonKey = assertNonEmpty(comparisonKey, "comparisonKey");
  const normalizedSources = sources
    .map((source) => normalizeSourceSnapshot(source, date))
    .sort((left, right) => left.source.localeCompare(right.source));
  const duplicate = normalizedSources.find(
    (source, index) => index > 0 && normalizedSources[index - 1].source === source.source,
  );
  if (duplicate) {
    throw new TypeError(`Daily snapshots allow one envelope per source: ${duplicate.source}.`);
  }

  const sourceStatus = deriveGrowthStatus(
    normalizedSources.map((source) => source.status),
  );
  const settled = normalizedSources.length > 0
    && sourceStatus === "complete"
    && normalizedSources.every(
      (source) => source.settledThrough !== null && source.settledThrough >= date,
    );
  const status = sourceStatus === "complete" && !settled ? "partial" : sourceStatus;
  const limitations = normalizedSources.flatMap((source) =>
    (source.limitations || []).map((limitation) => `${source.source}: ${limitation}`)
  );
  if (sourceStatus === "complete" && !settled) {
    limitations.push("One or more complete sources have not settled through the requested date.");
  }

  const comparabilitySignature = canonicalGrowthHash({
    comparisonKey: normalizedComparisonKey,
    sources: normalizedSources.map((source) => ({
      source: source.source,
      sourceTimezone: source.sourceTimezone,
      contractVersion: source.contractVersion,
    })),
  });
  const hashPayload = {
    schemaVersion: GROWTH_INTELLIGENCE_SCHEMA_VERSION,
    date,
    comparisonKey: normalizedComparisonKey,
    comparabilitySignature,
    status,
    settled,
    sources: normalizedSources,
    limitations,
  };
  const snapshotHash = canonicalGrowthHash(hashPayload);

  return {
    ...hashPayload,
    snapshotId: `daily:${date}:${snapshotHash.slice(-16)}`,
    snapshotHash,
    generatedAt,
  };
}

function normalizeQuery(query: string) {
  return query
    .normalize("NFKC")
    .replace(CONTROL_CHARACTER_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
}

function suppressedQuery(
  status: Exclude<GrowthQueryClassificationV1["status"], "accepted">,
  sampleCount: number,
  reason: string,
): GrowthQueryClassificationV1 {
  return {
    schemaVersion: GROWTH_INTELLIGENCE_SCHEMA_VERSION,
    status,
    safeQuery: null,
    sampleCount,
    untrustedEvidence: true,
    reason,
  };
}

export function classifyGrowthQuery({
  query,
  sampleCount,
  minSampleCount = GROWTH_QUERY_MIN_SAMPLE_COUNT,
  maxLength = 256,
}: {
  query: string;
  sampleCount: number;
  minSampleCount?: number;
  maxLength?: number;
}): GrowthQueryClassificationV1 {
  if (
    !Number.isSafeInteger(sampleCount)
    || sampleCount < 0
    || !Number.isSafeInteger(minSampleCount)
    || minSampleCount < 1
    || !Number.isSafeInteger(maxLength)
    || maxLength < 1
  ) {
    return suppressedQuery(
      "suppressed_invalid",
      sampleCount,
      "Invalid count or filtering threshold.",
    );
  }
  const normalized = normalizeQuery(String(query || ""));
  if (!normalized) {
    return suppressedQuery("suppressed_empty", sampleCount, "The query is empty after normalization.");
  }
  if (normalized.length > maxLength) {
    return suppressedQuery("suppressed_invalid", sampleCount, "The query exceeds the maximum safe length.");
  }
  if (
    EMAIL_PATTERN.test(normalized)
    || PHONE_PATTERN.test(normalized)
    || SECRET_PATTERN.test(normalized)
    || IDENTIFIER_PATTERN.test(normalized)
    || IPV4_PATTERN.test(normalized)
    || PRIVATE_QUERY_FRAGMENT_PATTERN.test(normalized)
  ) {
    return suppressedQuery(
      "suppressed_sensitive",
      sampleCount,
      "The query may contain identity, contact, credential, or secret data.",
    );
  }
  if (MALICIOUS_QUERY_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return suppressedQuery(
      "suppressed_malicious",
      sampleCount,
      "The query contains instruction-like or executable content.",
    );
  }
  if (sampleCount < minSampleCount) {
    return suppressedQuery(
      "suppressed_low_volume",
      sampleCount,
      "The query is below the minimum aggregation threshold.",
    );
  }
  return {
    schemaVersion: GROWTH_INTELLIGENCE_SCHEMA_VERSION,
    status: "accepted",
    safeQuery: normalized,
    sampleCount,
    untrustedEvidence: true,
    reason: null,
  };
}

function datesAreConsecutive(dates: readonly string[]) {
  return dates.every((date, index) => {
    const timestamp = assertIsoDate(date, `days[${index}].date`);
    if (index === 0) return true;
    return timestamp - assertIsoDate(dates[index - 1], `days[${index - 1}].date`)
      === 86_400_000;
  });
}

function normalizeRecommendation(
  recommendation: GrowthRecommendationInputV1,
): GrowthRecommendationInputV1 {
  if (!isGrowthRecommendationType(recommendation.type)) {
    throw new TypeError(`Unknown growth recommendation type: ${String(recommendation.type)}.`);
  }
  if (!Number.isSafeInteger(recommendation.sampleSize) || recommendation.sampleSize < 0) {
    throw new TypeError("Recommendation sampleSize must be a non-negative integer.");
  }
  return {
    ...recommendation,
    id: assertNonEmpty(recommendation.id, "recommendation.id"),
    issue: assertNonEmpty(recommendation.issue, "recommendation.issue"),
    targets: recommendation.targets.map(normalizePageTarget),
    affectedSources: [...recommendation.affectedSources].sort(),
    evidence: [...recommendation.evidence]
      .map((reference) => ({ ...reference }))
      .sort((left, right) =>
        left.source.localeCompare(right.source)
        || left.snapshotHash.localeCompare(right.snapshotHash)
        || left.metric.localeCompare(right.metric)
      ),
    confidenceBoundary: assertNonEmpty(
      recommendation.confidenceBoundary,
      "recommendation.confidenceBoundary",
    ),
    expectedMetric: assertNonEmpty(
      recommendation.expectedMetric,
      "recommendation.expectedMetric",
    ),
    guardrail: assertNonEmpty(recommendation.guardrail, "recommendation.guardrail"),
    minimumAction: assertNonEmpty(
      recommendation.minimumAction,
      "recommendation.minimumAction",
    ),
    acceptanceWindow: assertNonEmpty(
      recommendation.acceptanceWindow,
      "recommendation.acceptanceWindow",
    ),
    rollbackCondition: assertNonEmpty(
      recommendation.rollbackCondition,
      "recommendation.rollbackCondition",
    ),
  };
}

export function buildWeeklyGrowthReport({
  days,
  recommendations,
  experimentLocks,
  generatedAt,
}: {
  days: readonly DailyGrowthSnapshotV1[];
  recommendations: readonly GrowthRecommendationInputV1[];
  experimentLocks: readonly GrowthExperimentLockV1[];
  generatedAt: string;
}): WeeklyGrowthReportV1 {
  if (!Number.isFinite(Date.parse(generatedAt))) {
    throw new TypeError("generatedAt must be an ISO timestamp.");
  }
  const normalizedDays = [...days].sort((left, right) =>
    left.date.localeCompare(right.date)
  );
  const dates = normalizedDays.map((day) => day.date);
  const uniqueDates = new Set(dates);
  const correctDayCount = normalizedDays.length === GROWTH_WEEKLY_SETTLED_DAY_COUNT;
  const consecutive = correctDayCount
    && uniqueDates.size === GROWTH_WEEKLY_SETTLED_DAY_COUNT
    && datesAreConsecutive(dates);
  const completeAndSettled = correctDayCount
    && normalizedDays.every(
      (day) => day.status === "complete" && day.settled,
    );
  const comparable = correctDayCount
    && new Set(normalizedDays.map((day) => day.comparabilitySignature)).size === 1;
  const comparisonReady = correctDayCount
    && consecutive
    && completeAndSettled
    && comparable;

  const limitations: string[] = [];
  if (!correctDayCount) limitations.push("A weekly report requires exactly seven daily snapshots.");
  if (correctDayCount && !consecutive) {
    limitations.push("The seven daily snapshots must be unique and consecutive UTC dates.");
  }
  if (correctDayCount && !completeAndSettled) {
    limitations.push("Every daily snapshot must be complete and settled.");
  }
  if (correctDayCount && !comparable) {
    limitations.push("Every daily snapshot must use the same comparison contract.");
  }

  const activeLocks = experimentLocks
    .filter((lock) => lock.active)
    .map((lock) => ({
      ...lock,
      experimentId: assertNonEmpty(lock.experimentId, "experimentLock.experimentId"),
      target: normalizePageTarget(lock.target),
      lockedFields: [...lock.lockedFields].sort(),
    }))
    .sort((left, right) => left.experimentId.localeCompare(right.experimentId));
  const evaluatedRecommendations = recommendations
    .map(normalizeRecommendation)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((recommendation): GrowthRecommendationV1 => {
      const matchingLocks = activeLocks.filter((lock) =>
        recommendation.targets.some((target) => pageTargetMatches(target, lock.target))
      );
      const observationOnly = recommendation.type === "observe";
      const blockReasons: GrowthRecommendationV1["blockReasons"] = [];
      if (!comparisonReady) blockReasons.push("insufficient_settled_window");
      if (matchingLocks.length > 0) blockReasons.push("active_experiment_lock");
      if (observationOnly) blockReasons.push("observation_only");
      return {
        ...recommendation,
        actionable: comparisonReady && matchingLocks.length === 0 && !observationOnly,
        blockedByExperimentIds: matchingLocks.map((lock) => lock.experimentId),
        blockReasons,
      };
    });

  const underlyingStatus = deriveGrowthStatus(
    normalizedDays.map((day) => day.status),
  );
  const status: GrowthStatus = comparisonReady
    ? "complete"
    : underlyingStatus === "complete"
      ? "partial"
      : underlyingStatus;
  const actionable = comparisonReady
    && evaluatedRecommendations.some((recommendation) => recommendation.actionable);
  const periodStart = normalizedDays.at(0)?.date || null;
  const periodEnd = normalizedDays.at(-1)?.date || null;
  const hashPayload = {
    schemaVersion: GROWTH_INTELLIGENCE_SCHEMA_VERSION,
    periodStart,
    periodEnd,
    status,
    comparisonReady,
    actionable,
    snapshotHashes: normalizedDays.map((day) => day.snapshotHash),
    recommendations: evaluatedRecommendations,
    limitations,
  };
  const reportHash = canonicalGrowthHash(hashPayload);

  return {
    ...hashPayload,
    reportId: `weekly:${periodEnd || "unavailable"}:${reportHash.slice(-16)}`,
    reportHash,
    generatedAt,
  };
}
