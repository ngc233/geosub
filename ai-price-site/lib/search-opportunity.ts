export type SearchDemandTerm = {
  query: string;
  locales: string[];
  searchCount: number;
  noResultCount: number;
  clickCount: number;
  clickRate: number;
  visitorCount: number;
  lastSeenAt: Date;
};

export type SearchGapKind = "product" | "plan" | "content";
export type SearchOpportunityStatus = "ready" | "validate" | "observe";
export const SEARCH_OPPORTUNITY_WORKFLOW_STATUSES = [
  "open",
  "in_progress",
  "resolved",
  "ignored",
] as const;
export type SearchOpportunityWorkflowStatus =
  (typeof SEARCH_OPPORTUNITY_WORKFLOW_STATUSES)[number];
export type SearchOpportunityEffectState =
  | "pending"
  | "improving"
  | "converted"
  | "regressed";

export type SearchOpportunityEffectMetrics = {
  searchCount: number;
  noResultCount: number;
  clickCount: number;
  visitorCount: number;
};

export type SearchGapSuggestion = {
  query: string;
  kind: SearchGapKind;
  priorityScore: number;
  searchCount: number;
  noResultCount: number;
  visitorCount: number;
  locales: string[];
  lastSeenAt: Date;
  status: SearchOpportunityStatus;
  reason: string;
  actionHref: string | null;
};

export type SearchConversionSignal = {
  query: string;
  locales: string[];
  resultClickCount: number;
  visitorCount: number;
  planEngagementCount: number;
  commercialConversionCount: number;
  commercialConversionRate: number;
  lastClickedAt: Date;
};

export type SearchGrowthPriorityTier =
  | "urgent"
  | "high"
  | "validate"
  | "observe";

export type SearchGrowthStage =
  | "unmet"
  | "result"
  | "plan"
  | "commercial";

export type SearchGrowthScoreBreakdown = {
  demand: number;
  gap: number;
  intent: number;
  commercial: number;
};

export type SearchGrowthOpportunity = {
  query: string;
  kind: SearchGapKind;
  priorityScore: number;
  priorityTier: SearchGrowthPriorityTier;
  stage: SearchGrowthStage;
  recommendedAction: string;
  reason: string;
  searchCount: number;
  noResultCount: number;
  noResultRate: number;
  resultClickCount: number;
  planEngagementCount: number;
  commercialConversionCount: number;
  commercialConversionRate: number;
  visitorCount: number;
  locales: string[];
  lastSeenAt: Date;
  scoreBreakdown: SearchGrowthScoreBreakdown;
  actionHref: string | null;
};

export function normalizeSearchOpportunityQuery(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/gu, " ").slice(0, 240);
}

export function isSearchOpportunityWorkflowStatus(
  value: string,
): value is SearchOpportunityWorkflowStatus {
  return SEARCH_OPPORTUNITY_WORKFLOW_STATUSES.includes(
    value as SearchOpportunityWorkflowStatus,
  );
}

export function shouldShowSearchOpportunity(
  status?: SearchOpportunityWorkflowStatus,
) {
  return status !== "resolved" && status !== "ignored";
}

export function classifySearchOpportunityEffect({
  searchCount,
  noResultCount,
  clickCount,
  visitorCount,
}: SearchOpportunityEffectMetrics): SearchOpportunityEffectState {
  if (clickCount > 0) return "converted";
  if (noResultCount >= 2 && visitorCount >= 2) return "regressed";
  if (searchCount > noResultCount) return "improving";
  return "pending";
}

const CONTENT_INTENT_PATTERN = new RegExp(
  [
    "how",
    "why",
    "guide",
    "tutorial",
    "compare",
    "comparison",
    "difference",
    "review",
    "tax",
    "payment",
    "account",
    "cancel",
    "refund",
    "region",
    "country",
    "family",
    "student",
    "gift",
    "怎么",
    "为什么",
    "教程",
    "指南",
    "区别",
    "对比",
    "评测",
    "税",
    "支付",
    "账号",
    "取消",
    "退款",
    "地区",
    "国家",
    "家庭",
    "学生",
    "礼品卡",
  ].join("|"),
  "i",
);

const PLAN_INTENT_PATTERN = new RegExp(
  [
    "plus",
    "pro",
    "premium",
    "basic",
    "standard",
    "ultra",
    "max",
    "lite",
    "advanced",
    "enterprise",
    "monthly",
    "annual",
    "yearly",
    "套餐",
    "会员",
    "月付",
    "年付",
  ].join("|"),
  "i",
);

export function classifySearchGap(query: string): SearchGapKind {
  const normalized = query.trim();
  if (CONTENT_INTENT_PATTERN.test(normalized) || /[?？]/.test(normalized)) {
    return "content";
  }
  if (PLAN_INTENT_PATTERN.test(normalized)) {
    return "plan";
  }
  return "product";
}

function getArticleLocale(locales: string[]) {
  return !locales.includes("zh") && locales.includes("en") ? "EN" : "ZH";
}

export function buildSearchGapQueue(
  terms: SearchDemandTerm[],
): SearchGapSuggestion[] {
  return terms
    .filter((term) => term.noResultCount > 0)
    .map((term) => {
      const kind = classifySearchGap(term.query);
      const status: SearchOpportunityStatus =
        term.noResultCount >= 3 && term.visitorCount >= 2
          ? "ready"
          : term.noResultCount >= 2 || term.visitorCount >= 2
            ? "validate"
            : "observe";
      const priorityScore = Math.min(
        100,
        term.noResultCount * 16
          + term.searchCount * 5
          + Math.min(term.visitorCount, 5) * 8
          + Math.min(term.locales.length, 5) * 4,
      );
      const encodedQuery = encodeURIComponent(term.query);
      const evidence =
        `${term.noResultCount} 次无结果、${term.visitorCount} 位访客、${term.locales.length || 1} 种语言`;
      const reason = kind === "content"
        ? `搜索方式更像用户问题；当前证据为 ${evidence}，适合补充指南或 FAQ。`
        : kind === "plan"
          ? `关键词包含套餐特征；当前证据为 ${evidence}，应先核实现有产品是否缺少该套餐。`
          : `关键词更像产品名；当前证据为 ${evidence}，应核验是否需要接入新的订阅产品。`;
      const encodedEvidence = encodeURIComponent(reason);
      const actionHref = status === "observe"
        ? null
        : kind === "content"
          ? `/admin/articles/new?locale=${getArticleLocale(term.locales)}&topic=${encodedQuery}&brief=${encodedEvidence}`
          : `/admin/discovery?prefill=${encodedQuery}&source=search-demand&evidence=${encodedEvidence}`;

      return {
        query: term.query,
        kind,
        priorityScore,
        searchCount: term.searchCount,
        noResultCount: term.noResultCount,
        visitorCount: term.visitorCount,
        locales: term.locales,
        lastSeenAt: term.lastSeenAt,
        status,
        reason,
        actionHref,
      };
    })
    .sort((left, right) => {
      const statusRank: Record<SearchOpportunityStatus, number> = {
        ready: 3,
        validate: 2,
        observe: 1,
      };
      return statusRank[right.status] - statusRank[left.status]
        || right.priorityScore - left.priorityScore
        || right.noResultCount - left.noResultCount
        || right.lastSeenAt.getTime() - left.lastSeenAt.getTime();
    });
}

function boundedScore(value: number, maximum: number) {
  return Math.min(maximum, Math.max(0, Math.round(value)));
}

function growthPriorityTier(score: number): SearchGrowthPriorityTier {
  if (score >= 70) return "urgent";
  if (score >= 45) return "high";
  if (score >= 25) return "validate";
  return "observe";
}

function latestDate(left: Date, right: Date) {
  return left.getTime() >= right.getTime() ? left : right;
}

export function buildSearchGrowthQueue(
  terms: SearchDemandTerm[],
  conversions: SearchConversionSignal[],
): SearchGrowthOpportunity[] {
  const conversionsByQuery = new Map<
    string,
    Omit<SearchConversionSignal, "query">
  >();

  for (const conversion of conversions) {
    const normalized = normalizeSearchOpportunityQuery(conversion.query);
    if (!normalized) continue;
    const current = conversionsByQuery.get(normalized);
    conversionsByQuery.set(normalized, {
      locales: Array.from(new Set([
        ...(current?.locales || []),
        ...conversion.locales,
      ])),
      resultClickCount:
        (current?.resultClickCount || 0) + conversion.resultClickCount,
      visitorCount: Math.max(
        current?.visitorCount || 0,
        conversion.visitorCount,
      ),
      planEngagementCount:
        (current?.planEngagementCount || 0) + conversion.planEngagementCount,
      commercialConversionCount:
        (current?.commercialConversionCount || 0)
        + conversion.commercialConversionCount,
      commercialConversionRate: 0,
      lastClickedAt: current
        ? latestDate(current.lastClickedAt, conversion.lastClickedAt)
        : conversion.lastClickedAt,
    });
  }

  const termsByQuery = new Map(
    terms.map((term) => [normalizeSearchOpportunityQuery(term.query), term]),
  );
  const queries = new Set([
    ...termsByQuery.keys(),
    ...conversionsByQuery.keys(),
  ]);

  return Array.from(queries)
    .map((normalized): SearchGrowthOpportunity | null => {
      const term = termsByQuery.get(normalized);
      const conversion = conversionsByQuery.get(normalized);
      if (!term && !conversion) return null;

      const query = term?.query || normalized;
      const searchCount = term?.searchCount || 0;
      const noResultCount = term?.noResultCount || 0;
      const resultClickCount = Math.max(
        term?.clickCount || 0,
        conversion?.resultClickCount || 0,
      );
      const planEngagementCount = conversion?.planEngagementCount || 0;
      const commercialConversionCount =
        conversion?.commercialConversionCount || 0;
      const visitorCount = Math.max(
        term?.visitorCount || 0,
        conversion?.visitorCount || 0,
      );
      const noResultRate = searchCount > 0
        ? Math.round((noResultCount / searchCount) * 100)
        : 0;
      const commercialConversionRate = resultClickCount > 0
        ? Math.round(
            (commercialConversionCount / resultClickCount) * 100,
          )
        : 0;
      const locales = Array.from(new Set([
        ...(term?.locales || []),
        ...(conversion?.locales || []),
      ]));
      const lastSeenAt = term && conversion
        ? latestDate(term.lastSeenAt, conversion.lastClickedAt)
        : term?.lastSeenAt || conversion!.lastClickedAt;
      const scoreBreakdown: SearchGrowthScoreBreakdown = {
        demand: boundedScore(
          searchCount * 4 + Math.min(visitorCount, 5) * 4,
          25,
        ),
        gap: boundedScore(
          noResultCount * 8 + noResultRate * 0.1,
          35,
        ),
        intent: boundedScore(
          resultClickCount * 2 + planEngagementCount * 4,
          20,
        ),
        commercial: boundedScore(
          commercialConversionCount * 10
            + commercialConversionRate * 0.1,
          20,
        ),
      };
      const priorityScore = Object.values(scoreBreakdown)
        .reduce((total, value) => total + value, 0);
      const kind = classifySearchGap(query);
      const encodedQuery = encodeURIComponent(query);
      const stage: SearchGrowthStage = commercialConversionCount > 0
        ? "commercial"
        : planEngagementCount > 0
          ? "plan"
          : noResultCount > 0
            ? "unmet"
            : "result";
      let recommendedAction = "检查搜索匹配";
      let reason =
        `已有 ${resultClickCount} 次结果点击，但尚未形成套餐意向；检查搜索结果和页面首屏是否准确回答需求。`;
      let actionHref: string | null =
        `/admin/events?q=${encodeURIComponent(query)}`;

      if (noResultCount > 0 && noResultRate >= 40) {
        const evidence =
          `${noResultCount} 次无结果，占 ${noResultRate}%；来自 ${visitorCount} 位访客。`;
        recommendedAction = kind === "content"
          ? "补充指南或 FAQ"
          : kind === "plan"
            ? "核验并补齐套餐"
            : "核验并接入产品";
        reason = `${evidence} 这是当前最直接的供给缺口。`;
        const encodedEvidence = encodeURIComponent(reason);
        actionHref = kind === "content"
          ? `/admin/articles/new?locale=${getArticleLocale(locales)}&topic=${encodedQuery}&brief=${encodedEvidence}`
          : `/admin/discovery?prefill=${encodedQuery}&source=search-demand&evidence=${encodedEvidence}`;
      } else if (commercialConversionCount > 0) {
        recommendedAction = "放大高转化入口";
        reason =
          `已带来 ${commercialConversionCount} 次商业点击，转化率 ${commercialConversionRate}%；先确认价格与入口可靠，再扩大对应页面曝光。`;
      } else if (planEngagementCount > 0) {
        recommendedAction = "优化套餐到购买路径";
        reason =
          `已有 ${planEngagementCount} 次套餐意向，但尚未形成商业点击；检查套餐说明、价格可信度和购买入口。`;
      }

      return {
        query,
        kind,
        priorityScore,
        priorityTier: growthPriorityTier(priorityScore),
        stage,
        recommendedAction,
        reason,
        searchCount,
        noResultCount,
        noResultRate,
        resultClickCount,
        planEngagementCount,
        commercialConversionCount,
        commercialConversionRate,
        visitorCount,
        locales,
        lastSeenAt,
        scoreBreakdown,
        actionHref,
      };
    })
    .filter((opportunity): opportunity is SearchGrowthOpportunity =>
      opportunity !== null
      && (
        opportunity.searchCount > 0
        || opportunity.resultClickCount > 0
      )
    )
    .sort((left, right) =>
      right.priorityScore - left.priorityScore
      || right.commercialConversionCount - left.commercialConversionCount
      || right.planEngagementCount - left.planEngagementCount
      || right.noResultCount - left.noResultCount
      || right.lastSeenAt.getTime() - left.lastSeenAt.getTime()
    );
}
