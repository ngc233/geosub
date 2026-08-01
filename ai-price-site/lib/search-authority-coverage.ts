import type { SearchConversionTerm } from "./admin-search-demand.ts";
import type { AuthorityCoverageGapCode } from "./search-authority-task.ts";

export type AuthorityCoveragePriority =
  | "urgent"
  | "high"
  | "planned"
  | "monitor";

export type AuthorityCoverageActionKind =
  | "collect"
  | "review_data"
  | "edit_content"
  | "monitor";

export type AuthorityProductAudit = {
  id: string;
  slug: string;
  title: string;
  score: number;
  status: "indexable" | "needs_work" | "hold";
  issues: string[];
  nextAction: string;
  sections: {
    search: number;
    data: number;
    trust: number;
    decision: number;
  };
  editPath: string;
  path: string;
  priceCount: number;
  countryCount: number;
  stalePriceCount: number;
  taxGapCount: number;
  completeSeoLocaleCount: number;
  requiredSeoLocaleCount: number;
};

export type AuthorityCoverageItem = {
  productId: string;
  productSlug: string;
  productName: string;
  priorityScore: number;
  priority: AuthorityCoveragePriority;
  demandScore: number;
  authorityGapScore: number;
  resultClickCount: number;
  visitorCount: number;
  planEngagementCount: number;
  commercialConversionCount: number;
  demandQueries: string[];
  qualityScore: number;
  qualityStatus: AuthorityProductAudit["status"];
  gaps: string[];
  recommendedAction: string;
  gapCode: AuthorityCoverageGapCode | null;
  actionKind: AuthorityCoverageActionKind;
  actionEvidence: string;
  actionHref: string;
  publicPath: string;
};

function bounded(value: number, maximum: number) {
  return Math.min(maximum, Math.max(0, Math.round(value)));
}

function priorityFromScore(score: number): AuthorityCoveragePriority {
  if (score >= 70) return "urgent";
  if (score >= 50) return "high";
  if (score >= 30) return "planned";
  return "monitor";
}

function coverageGaps(audit: AuthorityProductAudit) {
  const gaps: string[] = [];
  if (audit.stalePriceCount > 0) {
    gaps.push(`${audit.stalePriceCount} 条价格超过 14 天未复核`);
  }
  if (audit.countryCount < 20) {
    gaps.push(`价格仅覆盖 ${audit.countryCount} 个地区`);
  }
  if (audit.taxGapCount > 0) {
    gaps.push(`${audit.taxGapCount} 个地区缺少税务资料`);
  }
  if (audit.completeSeoLocaleCount < audit.requiredSeoLocaleCount) {
    gaps.push(
      `重点语言 SEO ${audit.completeSeoLocaleCount}/${audit.requiredSeoLocaleCount}`,
    );
  }
  if (audit.sections.decision < 15) {
    gaps.push(`用户决策说明 ${audit.sections.decision}/15`);
  }
  for (const issue of audit.issues) {
    if (!gaps.includes(issue)) gaps.push(issue);
  }
  return gaps.slice(0, 4);
}

function recommendedAction(audit: AuthorityProductAudit) {
  if (audit.stalePriceCount > 0 || audit.priceCount === 0) {
    return {
      label: audit.priceCount === 0 ? "补齐正式价格" : "优先复核过期价格",
      gapCode: audit.priceCount === 0 ? "missing_price" as const : "stale_price" as const,
      kind: "collect" as const,
      evidence: audit.priceCount === 0
        ? "当前没有可用于前台排名的正式价格。"
        : `${audit.stalePriceCount} 条价格超过 14 天未复核。`,
      href: "/admin/review",
    };
  }
  if (audit.taxGapCount > 0 || audit.countryCount < 20) {
    return {
      label: audit.taxGapCount > 0 ? "补齐税务资料" : "扩大地区价格覆盖",
      gapCode: audit.taxGapCount > 0 ? "tax_gap" as const : "region_gap" as const,
      kind: "review_data" as const,
      evidence: audit.taxGapCount > 0
        ? `${audit.taxGapCount} 个已有价格地区缺少税务资料。`
        : `当前价格仅覆盖 ${audit.countryCount} 个地区。`,
      href: `/admin/data-quality/${audit.slug}?source=authority-coverage`,
    };
  }
  if (
    audit.completeSeoLocaleCount < audit.requiredSeoLocaleCount
    || audit.sections.search < 20
  ) {
    const reason = `重点语言 SEO 完成度 ${audit.completeSeoLocaleCount}/${audit.requiredSeoLocaleCount}`;
    const query = new URLSearchParams({
      source: "authority-coverage",
      reason: "补齐重点语言 SEO",
      evidence: reason,
    });
    return {
      label: "补齐重点语言 SEO",
      gapCode: "seo_gap" as const,
      kind: "edit_content" as const,
      evidence: `${reason}。`,
      href: `${audit.editPath}?${query.toString()}`,
    };
  }
  if (audit.sections.decision < 15) {
    const reason = `用户决策说明 ${audit.sections.decision}/15`;
    const query = new URLSearchParams({
      source: "authority-coverage",
      reason: "完善产品与套餐决策说明",
      evidence: reason,
    });
    return {
      label: "完善产品与套餐决策说明",
      gapCode: "decision_gap" as const,
      kind: "edit_content" as const,
      evidence: `${reason}。`,
      href: `${audit.editPath}?${query.toString()}`,
    };
  }
  return {
    label: "保持定期采集与观察",
    gapCode: null,
    kind: "monitor" as const,
    evidence: "当前价格、税务、SEO 与决策资料达到基础标准。",
    href: audit.status === "indexable" ? audit.path : audit.editPath,
  };
}

export function buildAuthorityCoverageQueue(
  audits: AuthorityProductAudit[],
  terms: SearchConversionTerm[],
): AuthorityCoverageItem[] {
  const termsByProduct = new Map<string, SearchConversionTerm[]>();
  for (const term of terms) {
    if (!term.productId) continue;
    const current = termsByProduct.get(term.productId) || [];
    current.push(term);
    termsByProduct.set(term.productId, current);
  }

  return audits.map((audit) => {
    const productTerms = termsByProduct.get(audit.id) || [];
    const resultClickCount = productTerms.reduce(
      (total, term) => total + term.resultClickCount,
      0,
    );
    const visitorCount = productTerms.reduce(
      (maximum, term) => Math.max(maximum, term.visitorCount),
      0,
    );
    const planEngagementCount = productTerms.reduce(
      (total, term) => total + term.planEngagementCount,
      0,
    );
    const commercialConversionCount = productTerms.reduce(
      (total, term) => total + term.commercialConversionCount,
      0,
    );
    const demandScore =
      bounded(resultClickCount * 2 + visitorCount * 2, 15)
      + bounded(planEngagementCount * 4, 15)
      + bounded(commercialConversionCount * 5, 10);
    const sectionGapScore =
      bounded((20 - audit.sections.search) * 0.6, 12)
      + bounded((45 - audit.sections.data) * 0.56, 25)
      + bounded((20 - audit.sections.trust) * 0.6, 12)
      + bounded((15 - audit.sections.decision) * 0.74, 11);
    const staleRatio = audit.priceCount > 0
      ? audit.stalePriceCount / audit.priceCount
      : 1;
    const taxGapRatio = audit.countryCount > 0
      ? audit.taxGapCount / audit.countryCount
      : 1;
    const missingSeoLocales = Math.max(
      0,
      audit.requiredSeoLocaleCount - audit.completeSeoLocaleCount,
    );
    const staleGapScore = audit.stalePriceCount > 0
      ? Math.max(1, bounded(staleRatio * 15, 15))
      : 0;
    const taxGapScore = audit.taxGapCount > 0
      ? Math.max(1, bounded(taxGapRatio * 10, 10))
      : 0;
    const explicitGapScore =
      staleGapScore
      + taxGapScore
      + bounded(missingSeoLocales * 6, 12)
      + bounded(Math.max(0, 20 - audit.countryCount) * 0.5, 10);
    const authorityGapScore = bounded(
      sectionGapScore + explicitGapScore,
      60,
    );
    const priorityScore = demandScore + authorityGapScore;
    const action = recommendedAction(audit);
    const demandQueries = [...productTerms]
      .sort((left, right) =>
        right.planEngagementCount - left.planEngagementCount
        || right.resultClickCount - left.resultClickCount
      )
      .map((term) => term.query)
      .filter((query, index, values) => values.indexOf(query) === index)
      .slice(0, 3);

    return {
      productId: audit.id,
      productSlug: audit.slug,
      productName: audit.title,
      priorityScore,
      priority: priorityFromScore(priorityScore),
      demandScore,
      authorityGapScore,
      resultClickCount,
      visitorCount,
      planEngagementCount,
      commercialConversionCount,
      demandQueries,
      qualityScore: audit.score,
      qualityStatus: audit.status,
      gaps: coverageGaps(audit),
      recommendedAction: action.label,
      gapCode: action.gapCode,
      actionKind: action.kind,
      actionEvidence: action.evidence,
      actionHref: action.href,
      publicPath: audit.path,
    };
  }).sort((left, right) =>
    right.priorityScore - left.priorityScore
    || right.demandScore - left.demandScore
    || right.authorityGapScore - left.authorityGapScore
    || left.productName.localeCompare(right.productName)
  );
}
