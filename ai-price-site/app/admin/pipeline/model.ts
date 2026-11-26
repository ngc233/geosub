import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  ShieldCheck,
} from "lucide-react";
import {
  assessProductOperationalStatus,
  type AdminOperationalStatus,
} from "../../../lib/admin-operational-status";
import type {
  PipelineProductRow,
  PipelineStats,
} from "../../../lib/admin-product-summary-model";
import { isCollectorReviewFailure } from "../collector-jobs/execution-status";

export const pipelineCategories = [
  { value: "all", label: "全部" },
  { value: "ai", label: "AI 订阅" },
  { value: "streaming", label: "流媒体" },
  { value: "software", label: "软件" },
  { value: "game", label: "游戏" },
  { value: "gift_card", label: "礼品卡" },
  { value: "payment", label: "支付" },
  { value: "vpn", label: "网络工具" },
  { value: "other", label: "其他" },
];

export const pipelineStages: Array<{
  value: "all" | AdminOperationalStatus;
  label: string;
  description: string;
}> = [
  { value: "all", label: "全部产品", description: "查看完整流水线" },
  { value: "exception", label: "需要介入", description: "采集、审核失败或硬异常" },
  { value: "pending", label: "系统处理中", description: "等待采集、审核或复采" },
  { value: "not_started", label: "未开始", description: "还没有受支持的采集任务" },
  { value: "published", label: "正式价可用", description: "正式价格当前可用" },
];

export function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);
  if (value && typeof value === "object" && "toNumber" in value) {
    return Number((value as { toNumber: () => number }).toNumber());
  }
  return 0;
}

export function toQueryCount(value: string | undefined) {
  const count = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(count) && count >= 0 ? count : null;
}

export function formatDate(value: Date | string | null) {
  if (!value) return "未安排";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "未安排";
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function categoryLabel(value: string) {
  return (
    pipelineCategories.find((category) => category.value === value)?.label ||
    value
  );
}

export function productStatusLabel(status: string) {
  if (status === "published") return "已上架";
  if (status === "review") return "资料待完善";
  if (status === "draft") return "草稿";
  if (status === "archived") return "已归档";
  return status || "未知";
}

export function runStatusLabel(status: string | null) {
  if (status === "succeeded") return "成功";
  if (status === "failed") return "失败";
  if (status === "running") return "运行中";
  if (status === "skipped") return "跳过";
  return status || "暂无运行";
}

export function joinClasses(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

export function getPipelineState(row: PipelineProductRow) {
  const appStoreJobs = toNumber(row.app_store_job_count);
  const webJobs = toNumber(row.official_web_job_count);
  const pending = toNumber(row.pending_observation_count);
  const blocked = toNumber(row.blocked_observation_count);
  const published = toNumber(row.published_price_count);
  const stalePublished = toNumber(row.published_stale_price_count);

  if (appStoreJobs + webJobs <= 0) {
    return {
      key: "setup",
      label: "缺采集任务",
      detail: "先补 App Store 链接或应用 ID。",
      className:
        "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800",
      icon: AlertTriangle,
    };
  }

  if (row.latest_run_status === "failed") {
    return {
      key: "failed",
      label: isCollectorReviewFailure({
        ...row,
        error_message: row.latest_run_error,
      })
        ? "采集成功，审核失败"
        : "采集失败",
      detail: row.latest_run_error || "查看采集任务页确认失败原因。",
      className:
        "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-800",
      icon: AlertTriangle,
    };
  }

  if (pending > 0) {
    return {
      key: "review",
      label: blocked > 0 ? "异常待决" : "待审核",
      detail:
        webJobs > 0
          ? "官网样本正在自动验证，异常隔离后由后续任务重试。"
          : blocked > 0
            ? "有硬异常，系统不会自动上线。"
            : "采集到新价格，等待自动或人工审核。",
      className:
        blocked > 0
          ? "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-800"
          : "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-800",
      icon: ShieldCheck,
    };
  }

  if (!row.latest_success_at) {
    return {
      key: "collect",
      label: "待采集",
      detail:
        webJobs > 0
          ? "已有官网任务，等待首次自动采集。"
          : "已有 App Store 任务，但还没有成功运行记录。",
      className:
        "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-800",
      icon: DatabaseZap,
    };
  }

  if (published <= 0) {
    return {
      key: "publish",
      label: "待入库",
      detail: "已采集过，但还没有正式价格。",
      className:
        "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800",
      icon: Clock3,
    };
  }

  if (stalePublished > 0) {
    return {
      key: "stale",
      label: "需复采",
      detail: `${stalePublished} 条正式${webJobs > 0 && appStoreJobs <= 0 ? " Web" : " App Store"}价格超过 14 天未更新。稳定结果会自动入库。`,
      className:
        "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800",
      icon: Clock3,
    };
  }

  return {
    key: "ready",
    label: "已上线",
    detail: "有正式价格，可继续按频率复采。",
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800",
    icon: CheckCircle2,
  };
}

export function getPipelineOperationalAssessment(row: PipelineProductRow) {
  return assessProductOperationalStatus({
    publishStatus: row.product_status,
    planCount: toNumber(row.plan_count),
    activeCollectorJobCount:
      toNumber(row.app_store_job_count) + toNumber(row.official_web_job_count),
    latestRunStatus: row.latest_run_status,
    pendingWorkCount: toNumber(row.pending_observation_count),
    blockedCount: toNumber(row.blocked_observation_count),
    publishedPriceCount: toNumber(row.published_price_count),
    stalePriceCount: toNumber(row.published_stale_price_count),
  });
}

export function getPipelineOperationalStatus(
  row: PipelineProductRow,
): AdminOperationalStatus {
  return getPipelineOperationalAssessment(row)?.status ?? "not_started";
}

export function getPublishReadiness(row: PipelineProductRow) {
  const checks = [
    { ready: toNumber(row.plan_count) > 0, missing: "补套餐" },
    {
      ready:
        toNumber(row.app_store_job_count) +
          toNumber(row.official_web_job_count) >
        0,
      missing: "补采集任务",
    },
    { ready: Boolean(row.latest_success_at), missing: "完成首次采集" },
    { ready: toNumber(row.published_price_count) > 0, missing: "形成正式价格" },
    {
      ready:
        toNumber(row.blocked_observation_count) === 0 &&
        toNumber(row.published_stale_price_count) === 0,
      missing: "处理异常或过期价格",
    },
  ];
  const completed = checks.filter((check) => check.ready).length;

  return {
    completed,
    total: checks.length,
    nextAction: isCollectorReviewFailure({
      ...row,
      error_message: row.latest_run_error,
    })
      ? "修复自动审核"
      : checks.find((check) => !check.ready)?.missing || "保持定期复采",
  };
}

export function getPipelineRecommendation(stats: PipelineStats) {
  if (stats.runningCount > 0) {
    return {
      title: "采集器正在运行",
      body: `当前有 ${stats.runningCount} 个产品正在采集。先等待这一轮完成，再看是否还有异常待决。`,
      href: "/admin/collector-jobs",
      action: "查看运行记录",
      className:
        "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
    };
  }

  if (stats.failedCount > 0) {
    return {
      title: "先处理运行失败",
      body: `${stats.failedCount} 个产品最近运行失败。查看具体失败阶段，采集和审核需要分别处理。`,
      href: "/admin/collector-jobs",
      action: "查看失败任务",
      className:
        "border-red-200 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
    };
  }

  if (stats.setupCount > 0) {
    return {
      title: "先补采集任务",
      body: `${stats.setupCount} 个产品还没有受支持的采集任务。没有任务就不会自动抓价，也不会进入审核。`,
      href: "/admin/discovery",
      action: "去线索入口",
      className:
        "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
    };
  }

  if (stats.pendingCount > 0) {
    return {
      title: "需要处理待决价格",
      body: `${stats.pendingCount} 个产品有待决观测。系统会自动放行稳定价格，硬异常会保留到规则修正或重新采集。`,
      href: "/admin/review",
      action: "查看待决",
      className:
        "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
    };
  }

  if (stats.dueCount > 0) {
    return {
      title: "有产品到期可复采",
      body: `${stats.dueCount} 个产品已到定时采集时间。可以交给后台任务，也可以在下方按产品手动触发。`,
      href: "/admin/collector-jobs",
      action: "查看到期任务",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    };
  }

  if (stats.staleCount > 0) {
    return {
      title: "上线价格需要定期复核",
      body: `${stats.staleCount} 个已上线产品存在超过 14 天未更新的正式价格。稳定结果会自动入库。`,
      href: "/admin/collector-jobs",
      action: "查看采集任务",
      className:
        "border-admin-border bg-admin-surface-subtle text-admin-text dark:border-admin-border-strong dark:bg-admin-chip dark:text-admin-text",
    };
  }

  return {
    title: "采集流水线稳定",
    body: "当前没有明显阻塞。新增产品从线索入口进入，已有产品按计划复采并自动审核。",
    href: "/admin/system",
    action: "查看系统状态",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  };
}

export function emptyPipelineStats(): PipelineStats {
  return {
    productCount: 0,
    readyCount: 0,
    setupCount: 0,
    pendingCount: 0,
    failedCount: 0,
    dueCount: 0,
    staleCount: 0,
    runningCount: 0,
    publishedPriceCount: 0,
  };
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error || "未知错误");
}
