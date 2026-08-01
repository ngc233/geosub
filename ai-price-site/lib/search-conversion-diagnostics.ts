import type { SearchConversionTerm } from "./admin-search-demand.ts";

export type SearchConversionBlockerSeverity =
  | "critical"
  | "high"
  | "review"
  | "ready";

export type SearchConversionBlockerCode =
  | "missing_target"
  | "missing_price"
  | "missing_entry"
  | "stale_price"
  | "thin_plan_copy"
  | "trust_gap"
  | "ux_review";

export type SearchConversionTargetSnapshot = {
  productId: string;
  productSlug: string;
  productName: string;
  planId: string | null;
  planName: string | null;
  planDescription: string | null;
  officialUrl: string | null;
  publishedAffiliateCount: number;
  priceCount: number;
  countryCount: number;
  stalePriceCount: number;
  taxGapCount: number;
  seoScore: number;
  seoStatus: "indexable" | "needs_work" | "hold";
  dataQualityPath: string;
  editPath: string;
};

export type SearchConversionDiagnostic = {
  query: string;
  locale: string;
  productId: string | null;
  planId: string | null;
  blockerCode: SearchConversionBlockerCode;
  targetTitle: string;
  targetHref: string | null;
  severity: SearchConversionBlockerSeverity;
  summary: string;
  evidence: string[];
  actionLabel: string;
  actionHref: string;
};

function hasUsefulPlanDescription(value: string | null) {
  return (value?.trim().length || 0) >= 40;
}

export function diagnoseSearchConversionBlocker(
  term: SearchConversionTerm,
  target: SearchConversionTargetSnapshot | null,
): SearchConversionDiagnostic {
  const base = {
    query: term.query,
    locale: term.locale,
    productId: target?.productId || term.productId || null,
    planId: target?.planId || term.planId || null,
    targetTitle: term.targetTitle || target?.planName || target?.productName
      || "未识别目标",
    targetHref: term.targetHref,
  };

  if (!target) {
    return {
      ...base,
      blockerCode: "missing_target" as const,
      severity: "critical",
      summary: "搜索点击没有关联到可识别的产品或套餐，无法继续判断转化阻塞点。",
      evidence: [
        `${term.resultClickCount} 次结果点击`,
        `${term.planEngagementCount} 次套餐意向`,
        "缺少产品或套餐关联",
      ],
      actionLabel: "查看行为记录",
      actionHref: `/admin/events?q=${encodeURIComponent(term.query)}`,
    };
  }

  if (target.priceCount === 0) {
    return {
      ...base,
      blockerCode: "missing_price" as const,
      severity: "critical",
      summary: "用户已经查看套餐，但目标产品没有可发布价格，页面无法形成有效决策。",
      evidence: [
        `${term.planEngagementCount} 次套餐意向`,
        "正式价格 0 条",
        `${target.countryCount} 个覆盖地区`,
      ],
      actionLabel: "处理价格数据",
      actionHref: target.dataQualityPath,
    };
  }

  if (!target.officialUrl && target.publishedAffiliateCount === 0) {
    return {
      ...base,
      blockerCode: "missing_entry" as const,
      severity: "critical",
      summary: "页面没有可用的官方或合作购买入口，用户产生意向后无处继续。",
      evidence: [
        `${term.planEngagementCount} 次套餐意向`,
        "官方入口缺失",
        "已发布合作入口 0 个",
      ],
      actionLabel: "补充购买入口",
      actionHref: target.editPath,
    };
  }

  const staleRatio = target.priceCount > 0
    ? target.stalePriceCount / target.priceCount
    : 0;
  if (staleRatio >= 0.5) {
    return {
      ...base,
      blockerCode: "stale_price" as const,
      severity: "high",
      summary: "超过一半公开价格已经过期，价格可信度可能不足以支持用户继续购买。",
      evidence: [
        `${target.stalePriceCount}/${target.priceCount} 条价格超过 14 天未复核`,
        `${target.countryCount} 个覆盖地区`,
        `页面质量 ${target.seoScore}/100`,
      ],
      actionLabel: "安排定向复采",
      actionHref: target.dataQualityPath,
    };
  }

  if (target.planId && !hasUsefulPlanDescription(target.planDescription)) {
    return {
      ...base,
      blockerCode: "thin_plan_copy" as const,
      severity: "high",
      summary: "套餐说明不足，用户能看到价格，但难以判断功能、限制和适用人群。",
      evidence: [
        `${term.planEngagementCount} 次套餐意向`,
        "套餐说明少于 40 字",
        `${target.countryCount} 个覆盖地区`,
      ],
      actionLabel: "完善套餐说明",
      actionHref: target.editPath,
    };
  }

  if (
    target.seoStatus !== "indexable"
    || target.taxGapCount > Math.max(1, target.countryCount * 0.25)
    || target.countryCount < 8
    || target.stalePriceCount > 0
  ) {
    const evidence = [
      `页面质量 ${target.seoScore}/100`,
      `${target.countryCount} 个覆盖地区`,
      `${target.stalePriceCount} 条过期价格`,
    ];
    if (target.taxGapCount > 0) {
      evidence.push(`${target.taxGapCount} 个地区缺少税务资料`);
    }

    return {
      ...base,
      blockerCode: "trust_gap" as const,
      severity: "review",
      summary: "页面仍有可信信息缺口，建议先补齐数据与说明，再评估购买入口的表现。",
      evidence,
      actionLabel: "查看质量诊断",
      actionHref: target.dataQualityPath,
    };
  }

  return {
    ...base,
    blockerCode: "ux_review" as const,
    severity: "ready",
    summary: "价格、内容和购买入口基础完整，下一步应检查入口可见性、移动端交互与价格说服力。",
    evidence: [
      `${term.planEngagementCount} 次套餐意向`,
      `${target.countryCount} 个覆盖地区`,
      `页面质量 ${target.seoScore}/100`,
    ],
    actionLabel: "打开前台页面",
    actionHref: term.targetHref || target.dataQualityPath,
  };
}
