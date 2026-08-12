import type {
  SearchGapKind,
  SearchGrowthOpportunity,
  SearchGrowthPriorityTier,
  SearchGrowthStage,
  SearchDemandTerm,
  SearchOpportunityStatus,
} from "../../../lib/admin-search-demand";
import type {
  SearchOpportunityRecord,
} from "../../../lib/admin-search-opportunities";
import type {
  SearchConversionRepairRecord,
} from "../../../lib/admin-search-conversion-repairs";
import type {
  AuthorityCoveragePriority,
} from "../../../lib/search-authority-coverage";
import type {
  AuthorityCoverageBusinessEffect,
  AuthorityCoverageTaskEffect,
  AuthorityCoverageTaskStatus,
} from "../../../lib/search-authority-task";
import type {
  SearchConversionBlockerSeverity,
} from "../../../lib/search-conversion-diagnostics";

export const SEARCH_GROWTH_FOCUSES = [
  "all",
  "actionable",
  "unmet",
  "intent",
  "commercial",
] as const;
export type SearchGrowthFocus = (typeof SEARCH_GROWTH_FOCUSES)[number];

export function formatDate(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(value);
}

export function termStatus(term: SearchDemandTerm) {
  if (term.noResultCount > 0 && term.noResultCount === term.searchCount) {
    return { label: "内容缺口", variant: "danger" as const };
  }
  if (term.noResultCount > 0) {
    return { label: "部分无结果", variant: "review" as const };
  }
  if (term.clickCount > 0) {
    return { label: "已有点击", variant: "published" as const };
  }
  return { label: "有结果未点击", variant: "neutral" as const };
}

export function resultKindLabel(kind: string) {
  const labels: Record<string, string> = {
    product: "产品",
    plan: "套餐",
    article: "指南",
    tool: "工具",
  };
  return labels[kind] || "其他";
}

export function gapKindLabel(kind: SearchGapKind) {
  const labels: Record<SearchGapKind, string> = {
    product: "疑似缺产品",
    plan: "疑似缺套餐",
    content: "疑似缺内容",
  };
  return labels[kind];
}

export function gapActionLabel(kind: SearchGapKind) {
  return kind === "content" ? "创建内容草稿" : "核验并接入";
}

export function opportunityStatus(status: SearchOpportunityStatus) {
  const values = {
    ready: {
      label: "可以处理",
      helper: "重复需求且来自多位访客",
      variant: "published" as const,
    },
    validate: {
      label: "待验证",
      helper: "已有需求信号，先核实",
      variant: "review" as const,
    },
    observe: {
      label: "继续观察",
      helper: "证据不足，暂不创建",
      variant: "neutral" as const,
    },
  };
  return values[status];
}

export function effectPresentation(record: SearchOpportunityRecord) {
  if (!record.evaluationStartedAt) {
    return {
      label: "尚未观察",
      helper: "开始处理后才会记录效果",
      variant: "neutral" as const,
    };
  }

  if (record.effectState === "converted") {
    return {
      label: "已产生点击",
      helper: "用户已从搜索结果进入页面，可标记为已解决",
      variant: "published" as const,
    };
  }
  if (record.effectState === "improving") {
    return {
      label: "已有搜索结果",
      helper: "未再全部落空，继续观察是否产生点击",
      variant: "review" as const,
    };
  }
  if (record.effectState === "regressed") {
    return {
      label: "仍反复无结果",
      helper: "不同访客仍遇到空结果，建议重新处理",
      variant: "danger" as const,
    };
  }
  return {
    label: "等待新搜索",
    helper: "处理后尚无足够用户行为用于判断",
    variant: "neutral" as const,
  };
}

export function conversionPresentation(
  planEngagements: number,
  commercialConversions: number,
) {
  if (commercialConversions > 0) {
    return {
      label: "带来商业点击",
      variant: "published" as const,
    };
  }
  if (planEngagements > 0) {
    return {
      label: "已有套餐意向",
      variant: "review" as const,
    };
  }
  return {
    label: "仅进入结果页",
    variant: "neutral" as const,
  };
}

export function parseGrowthFocus(value?: string): SearchGrowthFocus {
  return SEARCH_GROWTH_FOCUSES.includes(value as SearchGrowthFocus)
    ? value as SearchGrowthFocus
    : "all";
}

export function growthFocusHref(days: number, focus: SearchGrowthFocus) {
  const query = new URLSearchParams({ days: String(days) });
  if (focus !== "all") query.set("focus", focus);
  return `/admin/search-demand?${query.toString()}`;
}

export function growthPriorityPresentation(tier: SearchGrowthPriorityTier) {
  const presentations = {
    urgent: {
      label: "立即处理",
      variant: "danger" as const,
    },
    high: {
      label: "优先处理",
      variant: "review" as const,
    },
    validate: {
      label: "验证优化",
      variant: "neutral" as const,
    },
    observe: {
      label: "继续观察",
      variant: "neutral" as const,
    },
  };
  return presentations[tier];
}

export function blockerSeverityPresentation(
  severity: SearchConversionBlockerSeverity,
) {
  const presentations = {
    critical: {
      label: "明确阻塞",
      variant: "danger" as const,
    },
    high: {
      label: "优先修复",
      variant: "review" as const,
    },
    review: {
      label: "需要完善",
      variant: "neutral" as const,
    },
    ready: {
      label: "基础完整",
      variant: "published" as const,
    },
  };
  return presentations[severity];
}

export function repairStatusPresentation(record: SearchConversionRepairRecord) {
  if (record.status === "resolved") {
    return { label: "已解决", variant: "published" as const };
  }
  if (record.status === "ignored") {
    return { label: "已忽略", variant: "neutral" as const };
  }
  return { label: "修复中", variant: "review" as const };
}

export function repairBlockerLabel(code: SearchConversionRepairRecord["blockerCode"]) {
  return {
    missing_target: "目标关联缺失",
    missing_price: "正式价格缺失",
    missing_entry: "购买入口缺失",
    stale_price: "价格过期",
    thin_plan_copy: "套餐说明不足",
    trust_gap: "可信资料不足",
    ux_review: "购买路径待优化",
  }[code];
}

export function repairEffectPresentation(record: SearchConversionRepairRecord) {
  if (record.effect === "converted") {
    return {
      label: "已产生转化",
      helper: `商业点击 +${record.commercialConversionDelta}`,
      variant: "published" as const,
    };
  }
  if (record.effect === "engagement_up") {
    return {
      label: "套餐意向增加",
      helper: `套餐意向 +${record.planEngagementDelta}，尚无新商业点击`,
      variant: "review" as const,
    };
  }
  if (record.effect === "traffic_only") {
    return {
      label: "仅流量增加",
      helper: `结果点击 +${record.resultClickDelta}，尚未进入套餐`,
      variant: "neutral" as const,
    };
  }
  return {
    label: "等待新流量",
    helper: "开始处理后尚无可比较的新行为",
    variant: "neutral" as const,
  };
}

export function authorityPriorityPresentation(priority: AuthorityCoveragePriority) {
  return {
    urgent: { label: "立即补强", variant: "danger" as const },
    high: { label: "优先处理", variant: "review" as const },
    planned: { label: "计划完善", variant: "neutral" as const },
    monitor: { label: "持续观察", variant: "published" as const },
  }[priority];
}

export function authorityTaskPresentation(
  status: AuthorityCoverageTaskStatus,
  effect: AuthorityCoverageTaskEffect,
) {
  if (status === "ignored") {
    return { label: "已暂停", helper: "保留基线，可随时重新处理", variant: "neutral" as const };
  }
  if (effect === "resolved") {
    return { label: "已恢复健康", helper: "当前指标已达到目标", variant: "published" as const };
  }
  if (effect === "improving") {
    return { label: "正在改善", helper: "指标比处理前更好，但尚未达标", variant: "review" as const };
  }
  if (effect === "regressed") {
    return { label: "问题复发", helper: "完成后指标再次低于目标", variant: "danger" as const };
  }
  return { label: "等待变化", helper: "任务已开始，当前指标尚未改善", variant: "neutral" as const };
}

export function authorityBusinessPresentation(effect: AuthorityCoverageBusinessEffect) {
  return {
    waiting: {
      label: "尚无后续行为",
      helper: "从任务开始后计算，不包含历史流量",
      variant: "neutral" as const,
    },
    traffic: {
      label: "带来搜索点击",
      helper: "用户已从站内搜索进入产品页面",
      variant: "neutral" as const,
    },
    engagement: {
      label: "带来套餐意向",
      helper: "用户已进一步查看或选择套餐",
      variant: "review" as const,
    },
    converted: {
      label: "带来商业点击",
      helper: "用户已点击官方、Affiliate 或广告入口",
      variant: "published" as const,
    },
  }[effect];
}

export function growthStagePresentation(stage: SearchGrowthStage) {
  const presentations = {
    unmet: {
      label: "需求未满足",
      variant: "danger" as const,
    },
    result: {
      label: "进入结果页",
      variant: "neutral" as const,
    },
    plan: {
      label: "产生套餐意向",
      variant: "review" as const,
    },
    commercial: {
      label: "产生商业点击",
      variant: "published" as const,
    },
  };
  return presentations[stage];
}

export function matchesGrowthFocus(
  opportunity: SearchGrowthOpportunity,
  focus: SearchGrowthFocus,
) {
  if (focus === "actionable") {
    return opportunity.priorityTier === "urgent"
      || opportunity.priorityTier === "high";
  }
  if (focus === "unmet") return opportunity.noResultCount > 0;
  if (focus === "intent") return opportunity.planEngagementCount > 0;
  if (focus === "commercial") {
    return opportunity.commercialConversionCount > 0;
  }
  return true;
}
