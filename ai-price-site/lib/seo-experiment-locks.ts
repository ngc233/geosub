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

export const activeSeoExperimentLocks = [
  {
    experimentId: CHATGPT_PRO_5X_METADATA_EXPERIMENT_ID,
    engine: "google",
    canonicalPath: "/en/ai-pricing/chatgpt/pro-5x",
    status: "active",
    earliestSettledThrough: "2026-09-03",
    minimumCompleteObservationDays: 7,
    automaticRelease: false,
    lockedFields: lifecycleLockedFields,
  },
  {
    experimentId: CHATGPT_PLUS_BING_METADATA_EXPERIMENT_ID,
    engine: "bing",
    canonicalPath: "/zh/ai-pricing/chatgpt/plus",
    status: "active",
    earliestSettledThrough: "2026-09-03",
    minimumCompleteObservationDays: 7,
    automaticRelease: false,
    lockedFields: lifecycleLockedFields,
  },
] as const;

export function getActiveSeoExperimentLock(canonicalPath: string) {
  const normalizedPath = canonicalPath.replace(/\/+$/, "") || "/";
  return activeSeoExperimentLocks.find(
    (lock) =>
      lock.status === "active" && lock.canonicalPath === normalizedPath,
  ) ?? null;
}
