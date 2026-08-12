import {
  AlertTriangle,
  CheckCircle2,
  DatabaseZap,
  ShieldAlert,
} from "lucide-react";
export type ProductSummaryRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  status: string;
  provider: string | null;
  official_url: string | null;
  plan_count: number;
  app_store_job_count: number;
  due_job_count: number;
  running_run_count: number;
  latest_run_status: string | null;
  latest_run_started_at: Date | string | null;
  latest_run_finished_at: Date | string | null;
  latest_run_error: string | null;
  latest_run_age_seconds: number | null;
  published_price_count: number;
  published_country_count: number;
  stale_published_count: number;
  latest_price_checked_at: Date | string | null;
  pending_observation_count: number;
  pending_anomaly_count: number;
  hard_anomaly_count: number;
  latest_observed_at: Date | string | null;
};

export type PlanCoverageRow = {
  plan_id: string;
  plan_slug: string;
  plan_name: string;
  billing_cycle: string;
  status: string;
  published_price_count: number;
  published_country_count: number;
  common_country_count: number;
  common_published_country_count: number;
  pending_observation_count: number;
  pending_anomaly_count: number;
  min_price_usd: unknown;
  max_price_usd: unknown;
  latest_price_checked_at: Date | string | null;
  latest_observed_at: Date | string | null;
};

export type MissingCountryRow = {
  plan_slug: string;
  plan_name: string;
  country_code: string;
  country_name: string;
  currency: string;
  pending_observation_count: number;
  latest_availability_status: string | null;
  latest_availability_reason: string | null;
  plan_availability_status: string | null;
  consecutive_missing_count: number;
};

export type PendingReasonRow = {
  reason_code: string | null;
  observation_count: number;
  plan_count: number;
  country_count: number;
  min_price_usd: unknown;
  max_price_usd: unknown;
  latest_observed_at: Date | string | null;
};

export type AvailabilitySummaryRow = {
  status: string;
  country_count: number;
  latest_checked_at: Date | string | null;
};

export type DiagnosisLevel = "good" | "info" | "warning" | "danger";

export type DiagnosisConclusion = {
  level: DiagnosisLevel;
  label: string;
  title: string;
  detail: string;
  nextAction: string;
};

export function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);
  if (value && typeof value === "object" && "toNumber" in value) {
    return Number((value as { toNumber: () => number }).toNumber());
  }
  return 0;
}

export function toDate(value: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: Date | string | null) {
  const date = toDate(value);
  if (!date) return "暂无";

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(value: Date | string | null) {
  const date = toDate(value);
  if (!date) return "从未";

  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} 天前`;
  if (hours > 0) return `${hours} 小时前`;
  if (minutes > 0) return `${minutes} 分钟前`;
  return "刚刚";
}

export function formatDuration(seconds: number | null) {
  if (!seconds) return "未记录";
  if (seconds < 60) return `${seconds} 秒`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟`;

  return `${Math.round(minutes / 60)} 小时`;
}

export function formatUsd(value: unknown) {
  const number = toNumber(value);
  if (!Number.isFinite(number) || number <= 0) return "-";
  return `$${number.toFixed(2)}`;
}

export function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    ai: "AI 订阅",
    streaming: "流媒体",
    software: "软件",
    game: "游戏",
    gift_card: "礼品卡",
    vpn: "VPN",
    payment: "支付",
    other: "其他",
  };

  return labels[category] || category;
}

export function statusLabel(status: string | null) {
  if (status === "succeeded") return "成功";
  if (status === "failed") return "失败";
  if (status === "running") return "运行中";
  if (status === "skipped") return "跳过";
  if (status === "published") return "已发布";
  if (status === "review") return "审核中";
  if (status === "draft") return "草稿";
  return status || "暂无";
}

export function availabilityLabel(status: string | null) {
  if (status === "available_with_prices") return "可采到价格";
  if (status === "available_no_iap") return "确认无订阅";
  if (status === "available_unmatched_items") return "发现未识别套餐";
  if (status === "not_available") return "地区不可用";
  if (status === "blocked") return "访问受限";
  if (status === "unknown_error") return "检测异常";
  return status || "未检测";
}

export function missingPlanCountryLabel(row: MissingCountryRow) {
  if (row.pending_observation_count > 0) {
    return `已采集，等待自动审核 ${row.pending_observation_count} 条`;
  }

  if (row.latest_availability_status === "available_with_prices") {
    if (row.plan_availability_status === "pending_absence") {
      return `套餐本轮未出现（${row.consecutive_missing_count}/3）`;
    }
    return "该套餐尚缺正式价格";
  }

  if (row.latest_availability_status === "available_unmatched_items") {
    return "发现新套餐名称，等待规则复核";
  }

  if (
    row.latest_availability_status === "blocked" ||
    row.latest_availability_status === "unknown_error"
  ) {
    return "采集受阻，等待自动重试";
  }

  return "尚未完成该套餐采集";
}

export function missingPlanCountryDetail(row: MissingCountryRow) {
  if (row.pending_observation_count > 0) {
    return "系统已取得候选价格，稳定样本通过后会自动写入正式价格库。";
  }

  if (row.latest_availability_status === "available_with_prices") {
    if (row.plan_availability_status === "pending_absence") {
      return "该地区已成功取得其他套餐，但本套餐本轮未出现；连续 3 次成功采集仍缺失后，系统才会确认为地区套餐差异并停止空跑。";
    }
    return "产品页可以访问，但该套餐在此地区仍缺少可发布的稳定价格。";
  }

  if (row.latest_availability_status === "available_unmatched_items") {
    return "App Store 已返回内购项目，但尚未匹配到维护中的套餐规则；系统会继续补采，原始项目已保留用于规则诊断。";
  }

  if (
    row.latest_availability_status === "blocked" ||
    row.latest_availability_status === "unknown_error"
  ) {
    return "系统会按退避策略自动重试，无需逐地区人工核验。";
  }

  return "系统尚未取得该地区的稳定套餐价格，将由覆盖补采任务继续处理。";
}

export function levelClasses(level: DiagnosisLevel) {
  if (level === "good") {
    return {
      card: "border-emerald-200 bg-emerald-50",
      badge: "bg-emerald-100 text-emerald-700 ring-emerald-200",
      icon: CheckCircle2,
    };
  }

  if (level === "info") {
    return {
      card: "border-blue-200 bg-blue-50",
      badge: "bg-blue-100 text-blue-700 ring-blue-200",
      icon: DatabaseZap,
    };
  }

  if (level === "warning") {
    return {
      card: "border-amber-200 bg-amber-50",
      badge: "bg-amber-100 text-amber-700 ring-amber-200",
      icon: AlertTriangle,
    };
  }

  return {
    card: "border-red-200 bg-red-50",
    badge: "bg-red-100 text-red-700 ring-red-200",
    icon: ShieldAlert,
  };
}

export function getDiagnosisConclusion(
  product: ProductSummaryRow,
  commonMissingCount: number,
): DiagnosisConclusion {
  if (product.running_run_count > 0 || product.latest_run_status === "running") {
    return {
      level: "info",
      label: "正在采集",
      title: "后台正在跑这个产品",
      detail: "先等待采集脚本写回结果，完成后本页会显示新增观测、待审和正式入库结果。",
      nextAction: "等待这一轮结束后再判断。",
    };
  }

  if (product.app_store_job_count <= 0) {
    return {
      level: "danger",
      label: "缺采集任务",
      title: "这个产品没有可运行的 App Store 采集任务",
      detail: "没有采集任务就不会自动抓价格，也不会进入自动审核。需要先补产品的 App Store 来源。",
      nextAction: "去产品资料或线索入口补 App Store ID。",
    };
  }

  if (product.latest_run_status === "failed") {
    return {
      level: "danger",
      label: "采集失败",
      title: "最近一轮采集失败",
      detail: product.latest_run_error || "采集脚本没有成功写回结果，需要先看运行记录和输出摘要。",
      nextAction: "打开采集任务页查看失败原因。",
    };
  }

  if (product.hard_anomaly_count > 0) {
    return {
      level: "danger",
      label: "硬异常拦截",
      title: "系统拦下了高风险价格",
      detail: "通常是币种、小数点、周期或套餐匹配风险。它们不会自动上线，不需要人工逐国打开 App Store。",
      nextAction: "先看下方异常原因，必要时修采集规则后重采。",
    };
  }

  if (product.published_price_count <= 0) {
    return {
      level: "danger",
      label: "未入库",
      title: "还没有正式价格",
      detail: "前台不能可靠展示这个产品。需要先采集并让自动审核形成稳定样本。",
      nextAction: "立即只采这个产品。",
    };
  }

  if (commonMissingCount > 0) {
    return {
      level: "warning",
      label: "覆盖不完整",
      title: "常见地区还没覆盖全",
      detail: `常见国家套餐组合里还有 ${commonMissingCount} 个缺口，可能是未采到、地区不可用或被异常拦截。`,
      nextAction: "看缺口列表，优先重采这个产品。",
    };
  }

  if (product.pending_anomaly_count > 0 || product.pending_observation_count > 0) {
    return {
      level: "warning",
      label: "待审积压",
      title: "有价格还停在审核区",
      detail: "稳定样本会自动入库；异常样本会继续留在审核中心，避免污染正式价格。",
      nextAction: "看异常原因分组，不要逐条手工判断。",
    };
  }

  if (product.stale_published_count > 0) {
    return {
      level: "warning",
      label: "需要复采",
      title: "部分正式价超过 14 天未刷新",
      detail: "系统会按产品和过期地区自动复采；三轮仍无法确认的价格会移出前台并进入审核区。",
      nextAction: "等待自动复采，也可以只采这个产品。",
    };
  }

  return {
    level: "good",
    label: "健康",
    title: "采集、审核和正式价格都比较稳定",
    detail: "当前没有明显阻塞，后续交给定时采集和自动审核即可。",
    nextAction: "保持观察。",
  };
}

