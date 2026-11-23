import {
  CHATGPT_PLUS_BING_METADATA_EXPERIMENT_ID,
  CHATGPT_PRO_5X_METADATA_EXPERIMENT_ID,
} from "./pricing-metadata-experiments.ts";

const lifecycleLockedFields = [
  "url",
  "canonical",
  "robots",
  "title",
  "description",
  "h1",
  "core_content",
  "internal_links",
  "structured_data",
] as const;

type SeoExperimentLock = {
  experimentId: string;
  engine: "bing" | "google";
  canonicalPath: string;
  earliestSettledThrough: string;
  minimumCompleteObservationDays: number;
  automaticRelease: false;
  lockedFields: readonly string[];
} & ({ status: "active" } | { status: "completed"; endedAt: string });

const seoExperimentLocks: readonly SeoExperimentLock[] = [
  {
    experimentId: CHATGPT_PLUS_BING_METADATA_EXPERIMENT_ID,
    engine: "bing",
    canonicalPath: "/zh/ai-pricing/chatgpt/plus",
    status: "completed",
    endedAt: "2026-11-23",
    earliestSettledThrough: "2026-09-03",
    minimumCompleteObservationDays: 7,
    automaticRelease: false,
    lockedFields: lifecycleLockedFields,
  },
];

export const activeSeoExperimentLocks = seoExperimentLocks.filter(
  (lock) => lock.status === "active",
);

export function getActiveSeoExperimentLock(canonicalPath: string) {
  const normalizedPath = canonicalPath.replace(/\/+$/, "") || "/";
  return activeSeoExperimentLocks.find(
    (lock) => lock.canonicalPath === normalizedPath,
  ) ?? null;
}

export const interruptedSeoExperiments = [
  {
    experimentId: CHATGPT_PRO_5X_METADATA_EXPERIMENT_ID,
    engine: "google",
    canonicalPath: "/en/ai-pricing/chatgpt/pro-5x",
    status: "interrupted",
    earliestSettledThrough: "2026-09-03",
    minimumCompleteObservationDays: 7,
    automaticRelease: false,
    endedAt: "2026-10-09",
    outcome: "no_conclusion",
    reason: "Plan identity changes and collector misclassification confounded observations.",
  },
] as const;
