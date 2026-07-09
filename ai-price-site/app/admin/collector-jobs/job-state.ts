export type CollectorJobStateInput = {
  source_type: string | null;
  collector_kind: string | null;
  status: string | null;
  is_due: boolean;
  priority: number;
  latest_run_status: string | null;
};

export type CollectorRunTimelineInput = {
  status: string;
  runner_state: string | null;
  process_id: string | null;
  error_message: string | null;
  output_excerpt: string | null;
  duration_ms: number | null;
  run_age_seconds: number | null;
};

export type CollectorRunTimelineStepState =
  | "done"
  | "active"
  | "waiting"
  | "failed"
  | "skipped";

export type CollectorRunTimelineStep = {
  key: "record" | "process" | "collect" | "review";
  label: string;
  detail: string;
  state: CollectorRunTimelineStepState;
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

function hasProcessStarted(run: CollectorRunTimelineInput) {
  return Boolean(run.process_id) || run.runner_state === "spawned" || run.runner_state === "started";
}

function formatRunSeconds(seconds: number | null) {
  if (seconds === null || seconds === undefined) return null;
  if (seconds < 60) return `${seconds} 秒`;

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes} 分 ${String(rest).padStart(2, "0")} 秒`;
}

export function buildCollectorRunTimeline(run: CollectorRunTimelineInput): CollectorRunTimelineStep[] {
  const isRunning = run.status === "running";
  const isSucceeded = run.status === "succeeded";
  const isSkipped = run.status === "skipped";
  const isFailed = run.status === "failed";
  const processStarted = hasProcessStarted(run);
  const spawnFailed = isFailed && run.runner_state === "spawn_failed";
  const processFailed = isFailed && run.runner_state === "process_failed";
  const staleFailed = isFailed && run.runner_state === "stale_running_marked_failed";
  const elapsedText = formatRunSeconds(run.run_age_seconds);

  return [
    {
      key: "record",
      label: "运行记录",
      detail: "已写入 collector_job_runs，可以在后台追踪这一轮采集。",
      state: "done",
    },
    {
      key: "process",
      label: "脚本启动",
      detail: spawnFailed
        ? run.error_message || "后台采集脚本未能启动。"
        : isRunning && processStarted
          ? `脚本已启动${run.process_id ? `，进程 ${run.process_id}` : ""}。`
          : isRunning
            ? "正在唤起后台脚本，超过 3 分钟会自动标记失败。"
            : processFailed || staleFailed
              ? run.error_message || "脚本启动后没有正常完成。"
              : "脚本已接管这一轮任务。",
      state: spawnFailed || processFailed || staleFailed ? "failed" : isRunning ? "active" : "done",
    },
    {
      key: "collect",
      label: "采集结果",
      detail: isSucceeded
        ? "采集结果已写回，页面可查看输出摘要。"
        : isSkipped
          ? "脚本判断本轮无需采集或该来源暂不支持。"
          : isFailed && !spawnFailed
            ? run.error_message || "采集失败，需要查看输出摘要或任务日志。"
            : isRunning
              ? `等待采集结果写回${elapsedText ? `，已运行 ${elapsedText}` : ""}。`
              : "等待采集结果。",
      state: isSucceeded ? "done" : isSkipped ? "skipped" : isFailed && !spawnFailed ? "failed" : "waiting",
    },
    {
      key: "review",
      label: "审核入库",
      detail: isSucceeded
        ? "结果已进入后续自动审核；稳定样本会进入正式价格库，异常会留在审核中心。"
        : "采集成功后才会进入自动审核和正式价格入库。",
      state: isSucceeded ? "done" : "waiting",
    },
  ];
}
