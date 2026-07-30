export type ProductSeoQualityInput = {
  title?: string | null;
  description?: string | null;
  h1?: string | null;
  officialUrl?: string | null;
  productDescription?: string | null;
  publishedPlanCount: number;
  describedPlanCount: number;
  publishedPriceCount: number;
  publishedCountryCount: number;
  stalePriceCount: number;
  missingTaxProfileCount: number;
  duplicatePlanGroupCount: number;
  publishedOutlierCount: number;
  requiredSeoLocaleCount?: number;
  completeSeoLocaleCount?: number;
};

export type ProductSeoQualityStatus = "indexable" | "needs_work" | "hold";

export type ProductSeoQualityResult = {
  score: number;
  status: ProductSeoQualityStatus;
  statusLabel: "可收录" | "待完善" | "建议暂缓收录";
  issues: string[];
  nextAction: string;
  sections: {
    search: number;
    data: number;
    trust: number;
    decision: number;
  };
};

function textLength(value?: string | null) {
  return value?.trim().length || 0;
}

export function scoreProductSeoQuality(
  input: ProductSeoQualityInput,
): ProductSeoQualityResult {
  const issues: string[] = [];
  const blockers: string[] = [];

  let search = 0;
  const titleLength = textLength(input.title);
  const descriptionLength = textLength(input.description);
  const h1Length = textLength(input.h1);

  if (titleLength >= 10 && titleLength <= 65) {
    search += 5;
  } else {
    issues.push(titleLength === 0 ? "缺少搜索标题" : "搜索标题长度不合适");
  }

  if (descriptionLength >= 70 && descriptionLength <= 180) {
    search += 10;
  } else if (descriptionLength >= 50) {
    search += 5;
    issues.push("搜索描述还可以更完整地说明价格范围和适用地区");
  } else {
    issues.push("搜索描述过短或缺失");
  }

  if (h1Length >= 10) {
    search += 5;
  } else {
    issues.push("页面主标题过短或缺失");
  }

  if (
    input.requiredSeoLocaleCount !== undefined &&
    input.completeSeoLocaleCount !== undefined &&
    input.completeSeoLocaleCount < input.requiredSeoLocaleCount
  ) {
    search = Math.max(0, search - 5);
    issues.push(
      `基础 SEO 仅完成 ${input.completeSeoLocaleCount}/${input.requiredSeoLocaleCount} 种重点语言`,
    );
  }

  let data = 0;
  if (input.publishedPlanCount > 0) {
    data += 5;
  } else {
    blockers.push("没有已发布套餐");
  }

  if (input.publishedCountryCount >= 20) {
    data += 20;
  } else if (input.publishedCountryCount >= 8) {
    data += 15;
    issues.push(`目前只覆盖 ${input.publishedCountryCount} 个地区`);
  } else if (input.publishedCountryCount >= 3) {
    data += 8;
    issues.push(`地区覆盖偏少，仅 ${input.publishedCountryCount} 个`);
  } else {
    blockers.push(`有效地区不足，仅 ${input.publishedCountryCount} 个`);
  }

  const freshPriceCount = Math.max(
    0,
    input.publishedPriceCount - input.stalePriceCount,
  );
  const freshnessRatio =
    input.publishedPriceCount > 0
      ? freshPriceCount / input.publishedPriceCount
      : 0;

  if (freshnessRatio >= 0.9) {
    data += 20;
  } else if (freshnessRatio >= 0.75) {
    data += 15;
    issues.push("部分价格已超过 14 天未复核");
  } else if (freshnessRatio >= 0.5) {
    data += 8;
    issues.push("较多价格已超过 14 天未复核");
  } else {
    issues.push("大部分价格已超过 14 天未复核");
    if (input.publishedPriceCount > 0 && freshPriceCount === 0) {
      blockers.push("全部公开价格均已过期");
    }
  }

  let trust = 0;
  const taxGapRatio =
    input.publishedCountryCount > 0
      ? input.missingTaxProfileCount / input.publishedCountryCount
      : 1;

  if (input.missingTaxProfileCount === 0) {
    trust += 8;
  } else if (taxGapRatio <= 0.1) {
    trust += 6;
    issues.push(`${input.missingTaxProfileCount} 个地区缺少税务资料`);
  } else if (taxGapRatio <= 0.25) {
    trust += 3;
    issues.push(`${input.missingTaxProfileCount} 个地区缺少税务资料`);
  } else {
    issues.push("税务资料覆盖不足");
  }

  if (input.publishedOutlierCount === 0) {
    trust += 7;
  } else {
    blockers.push(`存在 ${input.publishedOutlierCount} 条公开极端价格`);
  }

  if (input.duplicatePlanGroupCount === 0) {
    trust += 5;
  } else {
    blockers.push(`存在 ${input.duplicatePlanGroupCount} 组重复套餐`);
  }

  let decision = 0;
  if (input.officialUrl) {
    decision += 5;
  } else {
    issues.push("缺少官方入口");
  }

  if (textLength(input.productDescription) >= 80) {
    decision += 5;
  } else {
    issues.push("产品介绍不足，难以形成独特页面价值");
  }

  const describedPlanRatio =
    input.publishedPlanCount > 0
      ? input.describedPlanCount / input.publishedPlanCount
      : 0;
  const hasEditorialDepth =
    textLength(input.productDescription) >= 80 || describedPlanRatio >= 0.5;
  const hasRequiredSeoCoverage =
    input.requiredSeoLocaleCount === undefined ||
    input.completeSeoLocaleCount === undefined ||
    input.completeSeoLocaleCount >= input.requiredSeoLocaleCount;
  if (describedPlanRatio >= 0.5) {
    decision += 5;
  } else {
    issues.push("多数套餐缺少适用人群或功能说明");
  }

  const score = search + data + trust + decision;
  const allIssues = [...blockers, ...issues];
  const status: ProductSeoQualityStatus =
    blockers.length > 0 || score < 60
      ? "hold"
      : score < 85 || !hasEditorialDepth || !hasRequiredSeoCoverage
        ? "needs_work"
        : "indexable";

  return {
    score,
    status,
    statusLabel:
      status === "indexable"
        ? "可收录"
        : status === "needs_work"
          ? "待完善"
          : "建议暂缓收录",
    issues: allIssues,
    nextAction:
      !hasRequiredSeoCoverage && blockers.length === 0
        ? `补齐 ${input.requiredSeoLocaleCount} 种重点语言的基础 SEO`
        : !hasEditorialDepth && blockers.length === 0
        ? "补充产品介绍或至少一半套餐的适用人群与功能说明"
        : allIssues[0] ||
          "页面的数据、可信说明和用户决策信息已经达到当前收录标准。",
    sections: {
      search,
      data,
      trust,
      decision,
    },
  };
}
