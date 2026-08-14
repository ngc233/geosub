export type AdminOperationalStatus =
  | "not_started"
  | "pending"
  | "exception"
  | "published";

export type AdminOperationalAssessment = {
  status: AdminOperationalStatus;
  reason: string;
};

export type AdminOperationalCounts = Record<AdminOperationalStatus, number>;

export const adminOperationalStatuses: AdminOperationalStatus[] = [
  "exception",
  "pending",
  "not_started",
  "published",
];

export const adminOperationalStatusPriority: Record<AdminOperationalStatus, number> = {
  exception: 0,
  pending: 1,
  not_started: 2,
  published: 3,
};

export const adminOperationalStatusMeta: Record<
  AdminOperationalStatus,
  { label: string; className: string; dotClassName: string }
> = {
  not_started: {
    label: "未开始",
    className: "bg-slate-100 text-slate-600 ring-slate-200",
    dotClassName: "bg-slate-400",
  },
  pending: {
    label: "待处理",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    dotClassName: "bg-amber-500",
  },
  exception: {
    label: "异常",
    className: "bg-red-50 text-red-700 ring-red-200",
    dotClassName: "bg-red-500",
  },
  published: {
    label: "已发布",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dotClassName: "bg-emerald-500",
  },
};

export function isArchivedPublishStatus(status: string | null | undefined) {
  return String(status || "").toUpperCase() === "ARCHIVED";
}

export function createAdminOperationalCounts(): AdminOperationalCounts {
  return { not_started: 0, pending: 0, exception: 0, published: 0 };
}

export function countAdminOperationalAssessments(
  assessments: Array<AdminOperationalAssessment | null>,
) {
  return assessments.reduce<AdminOperationalCounts>((counts, assessment) => {
    if (assessment) counts[assessment.status] += 1;
    return counts;
  }, createAdminOperationalCounts());
}

export function getAdminOperationalTotal(counts: AdminOperationalCounts) {
  return adminOperationalStatuses.reduce((total, status) => total + counts[status], 0);
}

type ProductOperationalInput = {
  publishStatus: string;
  planCount?: number;
  activeCollectorJobCount?: number;
  latestRunStatus?: string | null;
  runningCount?: number;
  pendingWorkCount?: number;
  blockedCount?: number;
  hardIssueCount?: number;
  publishedPriceCount?: number;
  priceCount?: number;
  verifiedPriceCount?: number;
  stalePriceCount?: number;
  missingSourceCount?: number;
  dueJobCount?: number;
};

export function assessProductOperationalStatus({
  publishStatus,
  planCount = 0,
  activeCollectorJobCount,
  latestRunStatus,
  runningCount = 0,
  pendingWorkCount = 0,
  blockedCount = 0,
  hardIssueCount = 0,
  publishedPriceCount,
  priceCount = publishedPriceCount ?? 0,
  verifiedPriceCount = 0,
  stalePriceCount = 0,
  missingSourceCount = 0,
  dueJobCount = 0,
}: ProductOperationalInput): AdminOperationalAssessment | null {
  const normalizedStatus = String(publishStatus || "").toUpperCase();
  const normalizedRunStatus = String(latestRunStatus || "").toLowerCase();
  const usablePriceCount = publishedPriceCount ?? priceCount;

  if (isArchivedPublishStatus(normalizedStatus)) return null;

  if (normalizedRunStatus === "failed") {
    return { status: "exception", reason: "最近一次采集失败，需要查看运行记录。" };
  }
  if (blockedCount > 0 || hardIssueCount > 0) {
    return { status: "exception", reason: "存在会阻止自动发布的硬异常。" };
  }
  if (missingSourceCount > 0) {
    return { status: "exception", reason: `${missingSourceCount} 条价格缺少可核验来源。` };
  }
  if (activeCollectorJobCount !== undefined && activeCollectorJobCount <= 0) {
    return { status: "not_started", reason: "还没有可运行的 App Store 采集任务。" };
  }
  if (planCount <= 0 && usablePriceCount <= 0) {
    return { status: "not_started", reason: "还没有套餐和正式价格。" };
  }
  if (usablePriceCount <= 0) {
    return { status: "pending", reason: "已有基础资料，但还没有形成正式价格。" };
  }
  if (stalePriceCount > 0) {
    return { status: "pending", reason: `${stalePriceCount} 条正式价格等待重新采集确认。` };
  }
  if (pendingWorkCount > 0) {
    return { status: "pending", reason: `${pendingWorkCount} 条数据正在采集或审核。` };
  }
  if (runningCount > 0 || normalizedRunStatus === "running" || dueJobCount > 0) {
    return { status: "pending", reason: "系统正在采集或已有到期任务等待执行。" };
  }
  if (normalizedStatus !== "PUBLISHED") {
    return { status: "pending", reason: "数据已具备，但产品仍在发布准备阶段。" };
  }
  if (verifiedPriceCount > 0 || publishedPriceCount !== undefined) {
    return { status: "published", reason: "已有可核验的正式价格，当前无需介入。" };
  }

  return { status: "pending", reason: "价格数据仍需完成可信度确认。" };
}

type PlanOperationalInput = {
  publishStatus: string;
  priceCount: number;
  verifiedPriceCount?: number;
  estimatedPriceCount?: number;
  pendingPriceCount?: number;
  stalePriceCount?: number;
  missingSourceCount?: number;
};

export function assessPlanOperationalStatus({
  publishStatus,
  priceCount,
  verifiedPriceCount = 0,
  estimatedPriceCount = 0,
  pendingPriceCount = 0,
  stalePriceCount = 0,
  missingSourceCount = 0,
}: PlanOperationalInput): AdminOperationalAssessment | null {
  const normalizedStatus = String(publishStatus || "").toUpperCase();
  if (isArchivedPublishStatus(normalizedStatus)) return null;
  if (missingSourceCount > 0) {
    return { status: "exception", reason: `${missingSourceCount} 条价格缺少可核验来源。` };
  }
  if (priceCount <= 0) {
    return { status: "not_started", reason: "套餐还没有地区价格。" };
  }
  if (stalePriceCount > 0) {
    return { status: "pending", reason: `${stalePriceCount} 条价格等待重新采集确认。` };
  }
  if (pendingPriceCount > 0 || estimatedPriceCount > 0) {
    return {
      status: "pending",
      reason: `${pendingPriceCount + estimatedPriceCount} 条价格仍在审核或估算阶段。`,
    };
  }
  if (normalizedStatus !== "PUBLISHED" || verifiedPriceCount <= 0) {
    return { status: "pending", reason: "已有价格，但套餐或价格尚未完成正式发布。" };
  }
  return { status: "published", reason: "套餐已有可核验的正式地区价格。" };
}

export function assessPriceOperationalStatus({
  status,
  dataQuality,
  hasSource = true,
}: {
  status: string;
  dataQuality: string;
  hasSource?: boolean;
}): AdminOperationalAssessment | null {
  const normalizedStatus = String(status || "").toUpperCase();
  const normalizedQuality = String(dataQuality || "").toUpperCase();
  if (isArchivedPublishStatus(normalizedStatus)) return null;
  if (!hasSource) return { status: "exception", reason: "缺少可核验的价格来源。" };
  if (normalizedQuality === "STALE") {
    return { status: "pending", reason: "价格已过期，等待重新采集确认。" };
  }
  if (normalizedStatus === "DRAFT" && normalizedQuality === "PENDING_REVIEW") {
    return { status: "not_started", reason: "价格尚未进入审核流程。" };
  }
  if (normalizedStatus !== "PUBLISHED" || normalizedQuality !== "VERIFIED") {
    return { status: "pending", reason: "价格仍在审核或估算阶段。" };
  }
  return { status: "published", reason: "价格已核验并正式发布。" };
}

export function mapPublishStatusToOperationalStatus(
  status: string,
): AdminOperationalStatus {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "PUBLISHED") return "published";
  if (normalized === "DRAFT") return "not_started";
  return "pending";
}

export function mapPriceToOperationalStatus(input: {
  status: string;
  dataQuality: string;
  hasSource?: boolean;
}): AdminOperationalStatus {
  return assessPriceOperationalStatus(input)?.status ?? "not_started";
}
