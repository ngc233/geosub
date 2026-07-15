import type { CollectorRunHistoryRow } from "./types";

export type CollectionProgressTone = "info" | "success" | "warning" | "danger" | "neutral";

export type CollectionProgressState = {
  visible: boolean;
  active: boolean;
  tone: CollectionProgressTone;
  label: string;
  detail: string;
  progress: number;
  elapsedLabel: string | null;
  runStatus: string | null;
  runId: string | null;
};

type BuildCollectionProgressStateOptions = {
  rows: CollectorRunHistoryRow[];
  collectionRun: string | null;
  collectionScope: string | null;
};

function formatElapsed(seconds: number | null) {
  if (seconds === null || seconds === undefined) return null;

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  if (minutes <= 0) return `${rest} 秒`;
  return `${minutes} 分 ${String(rest).padStart(2, "0")} 秒`;
}

function scopeText(collectionScope: string | null) {
  return collectionScope ? ` ${collectionScope}` : "";
}

function pickProgressRun(rows: CollectorRunHistoryRow[], collectionRun: string | null) {
  const running = rows.find((row) => row.status === "running");
  if (running) return running;
  if (collectionRun === "queued") return rows[0] ?? null;
  return null;
}

export function buildCollectionProgressState({
  rows,
  collectionRun,
  collectionScope,
}: BuildCollectionProgressStateOptions): CollectionProgressState {
  const run = pickProgressRun(rows, collectionRun);

  if (!run && collectionRun !== "queued") {
    return {
      visible: false,
      active: false,
      tone: "neutral",
      label: "",
      detail: "",
      progress: 0,
      elapsedLabel: null,
      runStatus: null,
      runId: null,
    };
  }

  if (!run) {
    return {
      visible: true,
      active: true,
      tone: "info",
      label: `已提交${scopeText(collectionScope)} 采集请求`,
      detail: "正在创建运行记录并唤起后台采集脚本；本区块会自动刷新。",
      progress: 18,
      elapsedLabel: null,
      runStatus: "queued",
      runId: null,
    };
  }

  const elapsedLabel = formatElapsed(run.run_age_seconds);
  const started = Boolean(run.process_id) || run.runner_state === "spawned" || run.runner_state === "started";
  const outputCount =
    Number(run.observed_count || 0) +
    Number(run.pending_observation_count || 0) +
    Number(run.approved_observation_count || 0) +
    Number(run.published_price_count || 0);

  if (run.status === "running") {
    if (started) {
      return {
        visible: true,
        active: true,
        tone: "info",
        label: "脚本已启动，正在采集价格",
        detail: run.process_id
          ? `后台进程 ${run.process_id} 正在运行；完成后会写回成功、失败和输出摘要。`
          : "后台脚本已接管这一轮任务；完成后会写回结果。",
        progress: outputCount > 0 ? 72 : 58,
        elapsedLabel,
        runStatus: run.status,
        runId: run.id,
      };
    }

    return {
      visible: true,
      active: true,
      tone: "info",
      label: "正在唤起后台采集脚本",
      detail: "运行记录已创建。如果 3 分钟内脚本没有接管，系统会自动标记为失败。",
      progress: 34,
      elapsedLabel,
      runStatus: run.status,
      runId: run.id,
    };
  }

  if (run.status === "succeeded") {
    return {
      visible: true,
      active: false,
      tone: "success",
      label: "采集完成",
      detail:
        outputCount > 0
          ? "本轮已经写回采集结果；稳定价格会进入正式库，异常会留在审核中心。"
          : "本轮完成但没有归因到新增价格，可能是无变更或采集器跳过。",
      progress: 100,
      elapsedLabel,
      runStatus: run.status,
      runId: run.id,
    };
  }

  if (run.status === "failed") {
    return {
      visible: true,
      active: false,
      tone: "danger",
      label: "采集失败",
      detail: run.error_message || "本轮采集没有成功完成，请查看下方运行记录和输出摘要。",
      progress: 100,
      elapsedLabel,
      runStatus: run.status,
      runId: run.id,
    };
  }

  if (run.status === "skipped") {
    return {
      visible: true,
      active: false,
      tone: "neutral",
      label: "本轮跳过",
      detail: run.output_excerpt || "脚本判断本轮无需采集或该来源暂不支持。",
      progress: 100,
      elapsedLabel,
      runStatus: run.status,
      runId: run.id,
    };
  }

  return {
    visible: true,
    active: false,
    tone: "warning",
    label: "采集状态待确认",
    detail: "运行记录已经出现，但状态不在常见集合里；请查看下方明细。",
    progress: 92,
    elapsedLabel,
    runStatus: run.status,
    runId: run.id,
  };
}
