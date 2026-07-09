export type CollectorJobStateInput = {
  source_type: string | null;
  collector_kind: string | null;
  status: string | null;
  is_due: boolean;
  priority: number;
  latest_run_status: string | null;
};

export function isAppStoreCollectorJob(job: CollectorJobStateInput) {
  return job.source_type === "app_store" || job.collector_kind === "app_store";
}

export function isManuallyQueuedAppStoreJob(job: CollectorJobStateInput) {
  return (
    isAppStoreCollectorJob(job) &&
    job.status === "active" &&
    job.is_due &&
    job.priority >= 100 &&
    job.latest_run_status !== "running"
  );
}

export function isRunningAppStoreJob(job: CollectorJobStateInput) {
  return isAppStoreCollectorJob(job) && job.latest_run_status === "running";
}
