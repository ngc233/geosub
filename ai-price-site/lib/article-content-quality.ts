export type ArticleContentQualityInput = {
  locale: "ZH" | "EN";
  status: string;
  title: string | null | undefined;
  excerpt: string | null | undefined;
  bodyMarkdown: string | null | undefined;
  seoTitle: string | null | undefined;
  seoDescription: string | null | undefined;
  seoKeywords: string | null | undefined;
  canonicalUrl: string | null | undefined;
  noindex: boolean;
  relatedProductCount: number;
  relatedArticleCount: number;
};

export type ArticleQualityIssue = {
  code: string;
  label: string;
  action: string;
  points: number;
};

export type ArticleContentQuality = {
  score: number;
  status: "ready" | "needs_work" | "hold";
  statusLabel: string;
  issues: ArticleQualityIssue[];
  strengths: string[];
  nextAction: string;
  dimensions: {
    search: number;
    content: number;
    links: number;
    technical: number;
  };
  facts: {
    bodyLength: number;
    headingCount: number;
    internalLinkCount: number;
  };
};

function stripMarkdown(value: string | null | undefined) {
  return String(value || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countMarkdownHeadings(value: string | null | undefined) {
  return (String(value || "").match(/^#{2,3}\s+.+$/gm) || []).length;
}

function countInternalLinks(value: string | null | undefined) {
  return (
    String(value || "").match(
      /\[[^\]]+\]\(\/(?:zh|en)\/(?:ai-pricing|streaming-pricing|guides|tools)\/[^)]+\)/g,
    ) || []
  ).length;
}

function hasSearchIntent(input: ArticleContentQualityInput) {
  const text = `${input.title || ""} ${input.excerpt || ""} ${input.bodyMarkdown || ""}`
    .toLowerCase();
  const terms =
    input.locale === "EN"
      ? [
          "price",
          "cost",
          "how",
          "why",
          "which",
          "compare",
          "difference",
          "cheapest",
          "buy",
          "redeem",
          "payment",
          "check",
        ]
      : [
          "价格",
          "多少钱",
          "如何",
          "怎么",
          "为什么",
          "哪个",
          "对比",
          "区别",
          "便宜",
          "购买",
          "兑换",
          "付款",
          "检查",
        ];

  return terms.some((term) => text.includes(term));
}

function pushIssue(
  issues: ArticleQualityIssue[],
  code: string,
  label: string,
  action: string,
  points: number,
) {
  issues.push({ code, label, action, points });
}

export function evaluateArticleContentQuality(
  input: ArticleContentQualityInput,
): ArticleContentQuality {
  const issues: ArticleQualityIssue[] = [];
  const strengths: string[] = [];
  const bodyLength = stripMarkdown(input.bodyMarkdown).length;
  const headingCount = countMarkdownHeadings(input.bodyMarkdown);
  const markdownInternalLinks = countInternalLinks(input.bodyMarkdown);
  const internalLinkCount =
    markdownInternalLinks + input.relatedProductCount + input.relatedArticleCount;
  const minBodyLength = input.locale === "EN" ? 320 : 180;
  const minExcerptLength = input.locale === "EN" ? 70 : 40;
  const descriptionLength = String(input.seoDescription || input.excerpt || "").trim().length;
  const titleLength = String(input.seoTitle || input.title || "").trim().length;
  const keywordCount = String(input.seoKeywords || "")
    .split(/[,，]/)
    .filter((item) => item.trim()).length;

  let search = 0;
  if (titleLength >= 10 && titleLength <= 65) {
    search += 12;
    strengths.push("标题长度适合搜索结果展示");
  } else {
    pushIssue(issues, "search-title", "搜索标题长度不合适", "调整 SEO 标题，让主题和用户问题更明确", 12);
  }
  if (hasSearchIntent(input)) {
    search += 8;
    strengths.push("正文明确回应了用户搜索意图");
  } else {
    pushIssue(issues, "search-intent", "缺少明确的用户问题", "在标题或开头回答价格、差异、选择或使用问题", 8);
  }
  if (keywordCount >= 2) {
    search += 5;
  } else {
    pushIssue(issues, "search-keywords", "主题词覆盖不足", "补充与文章主题直接相关的关键词", 5);
  }

  let content = 0;
  if (bodyLength >= minBodyLength) {
    content += 20;
    strengths.push("正文达到当前基础深度");
  } else {
    pushIssue(
      issues,
      "content-depth",
      `正文偏短（当前 ${bodyLength} 字符）`,
      "补充结论依据、适用场景和用户决策信息",
      20,
    );
  }
  if (headingCount >= 2) {
    content += 8;
  } else {
    pushIssue(issues, "content-structure", "正文结构不够清楚", "至少使用两个小标题组织答案", 8);
  }
  if (String(input.excerpt || "").trim().length >= minExcerptLength) {
    content += 7;
  } else {
    pushIssue(issues, "content-summary", "摘要信息不足", "用一段话说明文章回答什么、适合谁", 7);
  }

  let links = 0;
  if (input.relatedProductCount > 0) {
    links += 12;
    strengths.push("已连接到相关价格页");
  } else {
    pushIssue(issues, "links-product", "没有关联价格页", "关联读者下一步最可能查看的产品价格页", 12);
  }
  if (input.relatedArticleCount > 0 || markdownInternalLinks > 0) {
    links += 8;
  } else {
    pushIssue(issues, "links-article", "没有延伸阅读入口", "关联一篇相关指南或在正文加入站内链接", 8);
  }

  let technical = 0;
  if (descriptionLength >= 50 && descriptionLength <= 165) {
    technical += 8;
  } else {
    pushIssue(issues, "technical-description", "搜索描述长度不合适", "把搜索描述控制在 50-165 字符并写清页面价值", 8);
  }
  if (input.canonicalUrl) {
    technical += 6;
  } else {
    pushIssue(issues, "technical-canonical", "缺少 canonical", "填写当前文章的规范地址", 6);
  }
  const indexableStatus = input.status === "PUBLISHED" || input.status === "SCHEDULED";
  if (!input.noindex || !indexableStatus) {
    technical += 6;
  } else {
    pushIssue(issues, "technical-noindex", "已发布但禁止收录", "确认是否应解除 noindex；保留时页面不会进入搜索结果", 6);
  }

  const score = search + content + links + technical;
  const status = score >= 85 ? "ready" : score >= 60 ? "needs_work" : "hold";
  const statusLabel = status === "ready" ? "可发布" : status === "needs_work" ? "待完善" : "暂缓发布";
  const sortedIssues = [...issues].sort((a, b) => b.points - a.points);

  return {
    score,
    status,
    statusLabel,
    issues: sortedIssues,
    strengths,
    nextAction: sortedIssues[0]?.action || "内容已达到当前发布标准",
    dimensions: { search, content, links, technical },
    facts: { bodyLength, headingCount, internalLinkCount },
  };
}
