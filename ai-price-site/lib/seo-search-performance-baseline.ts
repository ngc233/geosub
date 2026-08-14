export type SeoSearchEngine = "google" | "bing";

export type SeoSearchPageObservation = {
  engine: SeoSearchEngine;
  periodStart: string;
  periodEnd: string;
  path: string;
  clicks: number;
  impressions: number;
  averagePosition?: number;
};

export type SeoSearchPagePriority = {
  path: string;
  score: number;
  tier: "优先优化" | "继续放大" | "观察";
  clicks: number;
  impressions: number;
  ctr: number;
  engines: SeoSearchEngine[];
  legacyImpressions: number;
  reasons: string[];
};

export const SEO_SEARCH_BASELINE_OBSERVED_AT = "2026-08-14";

// Read-only figures manually verified in Google Search Console and Bing Webmaster.
// They are an auditable baseline, not a live API response.
export const seoSearchPerformanceBaseline: SeoSearchPageObservation[] = [
  { engine: "google", periodStart: "2026-07-04", periodEnd: "2026-08-12", path: "/en", clicks: 18, impressions: 286 },
  { engine: "google", periodStart: "2026-07-04", periodEnd: "2026-08-12", path: "/en/ai-pricing/chatgpt?plan=pro-5x", clicks: 10, impressions: 704 },
  { engine: "google", periodStart: "2026-07-04", periodEnd: "2026-08-12", path: "/zh/ai-pricing/grok?plan=super-heavy", clicks: 9, impressions: 65 },
  { engine: "google", periodStart: "2026-07-04", periodEnd: "2026-08-12", path: "/zh/ai-pricing", clicks: 9, impressions: 65 },
  { engine: "google", periodStart: "2026-07-04", periodEnd: "2026-08-12", path: "/en/ai-pricing/chatgpt", clicks: 5, impressions: 724 },
  { engine: "google", periodStart: "2026-07-04", periodEnd: "2026-08-12", path: "/en/ai-pricing/claude", clicks: 4, impressions: 214 },
  { engine: "google", periodStart: "2026-07-04", periodEnd: "2026-08-12", path: "/en/about", clicks: 4, impressions: 28 },
  { engine: "google", periodStart: "2026-07-04", periodEnd: "2026-08-12", path: "/", clicks: 4, impressions: 15 },
  { engine: "google", periodStart: "2026-07-04", periodEnd: "2026-08-12", path: "/en/ai-pricing/chatgpt?plan=pro", clicks: 3, impressions: 760 },
  { engine: "google", periodStart: "2026-07-04", periodEnd: "2026-08-12", path: "/zh/ai-pricing/grok", clicks: 3, impressions: 52 },
  { engine: "bing", periodStart: "2026-05-14", periodEnd: "2026-08-13", path: "/zh/ai-pricing/chatgpt/plus", clicks: 80, impressions: 2200, averagePosition: 6.71 },
  { engine: "bing", periodStart: "2026-05-14", periodEnd: "2026-08-13", path: "/zh/ai-pricing/chatgpt/pro", clicks: 24, impressions: 383, averagePosition: 5.99 },
  { engine: "bing", periodStart: "2026-05-14", periodEnd: "2026-08-13", path: "/zh/ai-pricing/chatgpt/pro-5x", clicks: 15, impressions: 181, averagePosition: 6.09 },
  { engine: "bing", periodStart: "2026-05-14", periodEnd: "2026-08-13", path: "/zh/ai-pricing/claude/max-20x", clicks: 15, impressions: 159, averagePosition: 5.25 },
  { engine: "bing", periodStart: "2026-05-14", periodEnd: "2026-08-13", path: "/zh/ai-pricing/claude/pro", clicks: 16, impressions: 139, averagePosition: 5.41 },
  { engine: "bing", periodStart: "2026-05-14", periodEnd: "2026-08-13", path: "/zh/ai-pricing/claude/max-5x", clicks: 13, impressions: 138, averagePosition: 5.38 },
  { engine: "bing", periodStart: "2026-05-14", periodEnd: "2026-08-13", path: "/en/ai-pricing/chatgpt/plus", clicks: 2, impressions: 125, averagePosition: 5.26 },
  { engine: "bing", periodStart: "2026-05-14", periodEnd: "2026-08-13", path: "/zh/ai-pricing/grok/super-lite", clicks: 13, impressions: 108, averagePosition: 5.31 },
  { engine: "bing", periodStart: "2026-05-14", periodEnd: "2026-08-13", path: "/zh/streaming-pricing", clicks: 3, impressions: 83, averagePosition: 4.58 },
  { engine: "bing", periodStart: "2026-05-14", periodEnd: "2026-08-13", path: "/en/ai-pricing/claude/pro", clicks: 1, impressions: 80, averagePosition: 5.67 },
  { engine: "bing", periodStart: "2026-05-14", periodEnd: "2026-08-13", path: "/en/ai-pricing/perplexity/pro", clicks: 0, impressions: 39, averagePosition: 1.9 },
  { engine: "bing", periodStart: "2026-05-14", periodEnd: "2026-08-13", path: "/en/ai-pricing/chatgpt/pro", clicks: 0, impressions: 38, averagePosition: 4.66 },
  { engine: "bing", periodStart: "2026-05-14", periodEnd: "2026-08-13", path: "/zh/ai-pricing/chatgpt/go", clicks: 1, impressions: 29, averagePosition: 7.31 },
  { engine: "bing", periodStart: "2026-05-14", periodEnd: "2026-08-13", path: "/zh/ai-pricing/grok/super", clicks: 2, impressions: 21, averagePosition: 5.48 },
];

export function canonicalizeObservedSearchPath(path: string) {
  const [pathname, query = ""] = path.split("?", 2);
  const match = query.match(/(?:^|&)plan=([a-z0-9-]+)(?:&|$)/i);
  if (!match) return pathname || "/";
  return `${pathname.replace(/\/$/, "")}/${match[1].toLowerCase()}`;
}

export function buildSeoSearchPagePriorities(
  observations: SeoSearchPageObservation[],
): SeoSearchPagePriority[] {
  const grouped = new Map<string, {
    clicks: number;
    impressions: number;
    engines: Set<SeoSearchEngine>;
    legacyImpressions: number;
  }>();

  for (const observation of observations) {
    const path = canonicalizeObservedSearchPath(observation.path);
    const current = grouped.get(path) || {
      clicks: 0,
      impressions: 0,
      engines: new Set<SeoSearchEngine>(),
      legacyImpressions: 0,
    };
    current.clicks += observation.clicks;
    current.impressions += observation.impressions;
    current.engines.add(observation.engine);
    if (observation.path.includes("?plan=")) {
      current.legacyImpressions += observation.impressions;
    }
    grouped.set(path, current);
  }

  return [...grouped.entries()]
    .map(([path, data]) => {
      const ctr = data.impressions > 0
        ? Math.round((data.clicks / data.impressions) * 10_000) / 100
        : 0;
      const demandScore = Math.min(
        55,
        Math.round(Math.log10(data.impressions + 1) * 18),
      );
      const ctrOpportunity = data.impressions >= 100
        ? ctr < 2 ? 25 : ctr < 5 ? 14 : 5
        : ctr === 0 ? 8 : 2;
      const crossEngineScore = data.engines.size > 1 ? 12 : 0;
      const legacyScore = data.legacyImpressions > 0 ? 8 : 0;
      const score = Math.min(
        100,
        demandScore + ctrOpportunity + crossEngineScore + legacyScore,
      );
      const reasons: string[] = [];

      if (data.impressions >= 500) reasons.push("已有较高搜索曝光");
      else if (data.impressions >= 100) reasons.push("已有稳定搜索需求");
      if (data.impressions >= 100 && ctr < 2) reasons.push("点击率偏低，优先改善标题与摘要");
      if (data.engines.size > 1) reasons.push("Google 与 Bing 都已出现需求");
      if (data.legacyImpressions > 0) reasons.push("旧查询地址仍有曝光，应巩固稳定套餐地址");
      if (reasons.length === 0) reasons.push("继续观察搜索量和点击变化");

      return {
        path,
        score,
        tier: score >= 72 ? "优先优化" : score >= 52 ? "继续放大" : "观察",
        clicks: data.clicks,
        impressions: data.impressions,
        ctr,
        engines: [...data.engines].sort(),
        legacyImpressions: data.legacyImpressions,
        reasons,
      } satisfies SeoSearchPagePriority;
    })
    .sort((left, right) =>
      right.score - left.score || right.impressions - left.impressions,
    );
}
