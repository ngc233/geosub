import Link from "next/link";
import type { ComponentType } from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  Code2,
  ExternalLink,
  Image,
  Info,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  Video,
} from "lucide-react";
import {
  aiToolCategories,
  aiToolRankingItems,
  getCategoryScore,
  getTopToolsForCategory,
  getWeightedScore,
  type AiToolCategoryKey,
  type AiToolRankingItem,
} from "../data/ai-tool-rankings";
import {
  aiToolCategoryScoringProfiles,
  aiToolScoreDimensions,
  aiToolScoringReferences,
  geoSubQualityScore,
  geoSubQualityScorePillars,
} from "../data/ai-tool-scoring";

type Locale = "zh" | "en";

const featuredCategories: AiToolCategoryKey[] = ["overall", "free", "coding", "search"];

const categoryIcons: Record<AiToolCategoryKey, ComponentType<{ size?: number }>> = {
  overall: Sparkles,
  free: CheckCircle2,
  coding: Code2,
  writing: Sparkles,
  image: Image,
  video: Video,
  search: Search,
  local: BadgeDollarSign,
};

const copy = {
  zh: {
    eyebrow: "AI Tools",
    title: "AI 工具矩阵",
    description:
      "先看场景结论，再看价格和依据。模型能力参考外部榜单，GeoSub 负责补充地区价格、税费、可用性和订阅成本。",
    updated: "GQS v0.1",
    quickTitle: "快速结论",
    quickSubtitle: "每个场景先给一个当前更值得优先比较的工具。",
    allCategories: "场景导航",
    winner: "当前优先看",
    score: "场景分",
    total: "总分",
    fit: "适配",
    reason: "为什么",
    rank: "排名",
    tool: "工具",
    judgement: "判断",
    action: "操作",
    bestFor: "适合",
    price: "价格",
    priceReady: "有价格页",
    pricePartial: "部分价格",
    pricePending: "待接价格",
    viewPrice: "看价格",
    pendingPrice: "待接入",
    details: "查看评分依据",
    evidence: "依据",
    caveat: "注意",
    benchmark: "外部基准",
    tools: "工具",
    dimensions: "维度",
    priceLinks: "价格页",
    chartTitle: "通用大模型能力排行",
    chartSubtitle: "按独立基准分排序，价格和地区维度不参与这张图。",
    benchmarkScore: "基准分",
    chartNote: "能力锚点参考 Artificial Analysis 等外部榜单；GeoSub 另行计算价格和地区可用性。",
    capabilityLeader: "能力领先",
    valueLeader: "性价比领先",
    freeLeader: "免费友好",
    methodTitle: "这不是单纯的模型能力榜",
    methodText:
      "GeoSub 把榜单拆成三层：外部模型基准、产品场景适配、地区价格和订阅可用性。这样 Claude 可以在模型能力上更强，Gemini 可以在免费和效率上更强，Cursor 可以在编程场景更强，ChatGPT 也不会靠品牌印象通吃所有榜。",
    gqsTitle: "GeoSub 自有评分体系",
    gqsSubtitle: "GQS 把“模型强不强”和“值不值得在本地订阅”分开评估。",
    gqsPrinciples: "评分原则",
    gqsEvidence: "依据",
    rankingsTitle: "场景排行",
    sortedBy: "按本场景权重排序",
    refsTitle: "参考来源",
    refsText:
      "这些来源只作为评分框架和能力锚点，GeoSub 不直接复制其排名；价格、税费和地区可用性由本站逐步采集补足。",
  },
  en: {
    eyebrow: "AI Tools",
    title: "AI Tool Matrix",
    description:
      "Start with use-case recommendations, then inspect pricing and evidence. External leaderboards anchor model capability while GeoSub adds regional pricing, taxes, availability, and subscription cost.",
    updated: "GQS v0.1",
    quickTitle: "Quick Picks",
    quickSubtitle: "Each use case starts with the tool currently worth comparing first.",
    allCategories: "Use cases",
    winner: "First to compare",
    score: "Use-case",
    total: "Total",
    fit: "Fit",
    reason: "Why",
    rank: "Rank",
    tool: "Tool",
    judgement: "Judgement",
    action: "Action",
    bestFor: "Best for",
    price: "Price",
    priceReady: "Price page",
    pricePartial: "Partial data",
    pricePending: "Price pending",
    viewPrice: "View price",
    pendingPrice: "Pending",
    details: "View scoring evidence",
    evidence: "Evidence",
    caveat: "Note",
    benchmark: "External benchmark",
    tools: "Tools",
    dimensions: "Dimensions",
    priceLinks: "Price pages",
    chartTitle: "General Model Capability",
    chartSubtitle: "Sorted by independent benchmark score; pricing and regional factors are excluded here.",
    benchmarkScore: "Benchmark",
    chartNote: "Capability is anchored to external sources such as Artificial Analysis; GeoSub separately scores pricing and regional availability.",
    capabilityLeader: "Capability",
    valueLeader: "Value",
    freeLeader: "Free access",
    methodTitle: "This is not just a model leaderboard",
    methodText:
      "GeoSub separates three layers: external model benchmarks, product use-case fit, and regional subscription pricing. Claude can lead on model capability, Gemini can lead on free access and efficiency, Cursor can lead coding, and ChatGPT no longer wins every category by brand gravity.",
    gqsTitle: "GeoSub's Own Scoring System",
    gqsSubtitle: "GQS separates model strength from whether a tool is worth subscribing to locally.",
    gqsPrinciples: "Principles",
    gqsEvidence: "Evidence",
    rankingsTitle: "Use-Case Rankings",
    sortedBy: "Sorted by this use-case weight",
    refsTitle: "References",
    refsText:
      "These sources inform scoring and capability anchors. GeoSub does not copy their rankings directly; pricing, taxes, and regional availability are added by this site over time.",
  },
};

function categoryLabel(key: AiToolCategoryKey, locale: Locale) {
  const category = aiToolCategories.find((item) => item.key === key);
  return locale === "en" ? category?.labelEn : category?.labelZh;
}

function categoryDescription(key: AiToolCategoryKey, locale: Locale) {
  const category = aiToolCategories.find((item) => item.key === key);
  return locale === "en" ? category?.descriptionEn : category?.descriptionZh;
}

function pricingStatusText(item: AiToolRankingItem, locale: Locale) {
  const text = copy[locale];
  if (item.pricingStatus === "available") return text.priceReady;
  if (item.pricingStatus === "partial") return text.pricePartial;
  return text.pricePending;
}

function pricingStatusClassName(status: AiToolRankingItem["pricingStatus"]) {
  if (status === "available") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "partial") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-zinc-200 bg-zinc-50 text-zinc-500";
}

function priceHref(item: AiToolRankingItem, locale: Locale) {
  if (!item.pricePageSlug) return null;
  return `/${locale}/ai-pricing/${item.pricePageSlug}`;
}

function scoreTone(score: number) {
  if (score >= 88) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (score >= 80) return "bg-lime-50 text-lime-700 ring-lime-200";
  if (score >= 70) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-zinc-100 text-zinc-600 ring-zinc-200";
}

function fitText(value: number, locale: Locale) {
  if (value === 0) return locale === "en" ? "neutral" : "中性";
  return `${value > 0 ? "+" : ""}${value}`;
}

function scoreWidth(score: number) {
  return `${Math.max(8, Math.min(100, score))}%`;
}

function ToolRow({
  item,
  locale,
  rank,
  categoryKey,
}: {
  item: AiToolRankingItem;
  locale: Locale;
  rank: number;
  categoryKey: AiToolCategoryKey;
}) {
  const text = copy[locale];
  const href = priceHref(item, locale);
  const strengths = locale === "en" ? item.strengthsEn : item.strengthsZh;
  const bestFor = locale === "en" ? item.bestForEn : item.bestForZh;
  const price = locale === "en" ? item.priceEn : item.priceZh;
  const caution = locale === "en" ? item.cautionEn : item.cautionZh;
  const notes = locale === "en" ? item.scoreNotesEn : item.scoreNotesZh;
  const profile =
    aiToolCategoryScoringProfiles[categoryKey] ??
    aiToolCategoryScoringProfiles.overall;
  const scenarioScore = getCategoryScore(item, categoryKey);
  const totalScore = getWeightedScore(item);
  const fit = item.categoryFit?.[categoryKey] ?? 0;
  const topReason = strengths.slice(0, 2).join(locale === "en" ? " · " : "、");

  return (
    <article className="border-t border-zinc-200 bg-white px-4 py-4 first:border-t-0 md:px-5">
      <div className="grid gap-4 lg:grid-cols-[54px_minmax(190px,0.95fr)_minmax(230px,1.15fr)_minmax(220px,1fr)_140px] lg:items-center">
        <div className="text-sm font-black tabular-nums text-zinc-400">#{rank}</div>

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-base font-black text-zinc-950">{item.name}</h3>
            <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-500">
              {item.company}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-600">{bestFor}</p>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="text-xs font-black uppercase text-zinc-400">
              {text.score}
            </span>
            <span
              className={[
                "rounded-full px-2 py-0.5 text-xs font-black tabular-nums ring-1",
                scoreTone(scenarioScore),
              ].join(" ")}
            >
              {scenarioScore}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-lime-500"
              style={{ width: scoreWidth(scenarioScore) }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-zinc-400">
            <span>
              {text.total} {totalScore}
            </span>
            <span>
              {text.fit} {fitText(fit, locale)}
            </span>
          </div>
        </div>

        <div>
          <div className="text-xs font-black uppercase text-zinc-400">{text.judgement}</div>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-700">{topReason}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span
              className={[
                "rounded-full border px-2.5 py-1 text-xs font-black",
                pricingStatusClassName(item.pricingStatus),
              ].join(" ")}
            >
              {pricingStatusText(item, locale)}
            </span>
            <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-bold text-zinc-500">
              {price}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:justify-end">
          {href ? (
            <Link
              href={href}
              className="inline-flex h-10 items-center gap-1 rounded-xl bg-zinc-950 px-3 text-sm font-black text-white transition hover:bg-lime-700"
            >
              {text.viewPrice}
              <ArrowRight size={15} />
            </Link>
          ) : (
            <span className="inline-flex h-10 items-center rounded-xl bg-zinc-100 px-3 text-sm font-black text-zinc-400">
              {text.pendingPrice}
            </span>
          )}
        </div>
      </div>

      <details className="group mt-4 rounded-xl border border-zinc-200 bg-zinc-50">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black text-zinc-700">
          <span>{text.details}</span>
          <span className="text-xs text-zinc-400 group-open:hidden">+</span>
          <span className="hidden text-xs text-zinc-400 group-open:inline">-</span>
        </summary>
        <div className="border-t border-zinc-200 px-4 py-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {aiToolScoreDimensions.map((dimension) => {
              const value = item.scores[dimension.key];
              const label = locale === "en" ? dimension.labelEn : dimension.labelZh;
              const note = notes[dimension.key];
              const weight = profile.weights[dimension.key];

              return (
                <div key={dimension.key} className="min-w-0">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-black text-zinc-700">{label}</span>
                    <span className="font-black tabular-nums text-zinc-500">
                      {value} / {Math.round(weight * 100)}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white ring-1 ring-zinc-200">
                    <div
                      className="h-full rounded-full bg-lime-500"
                      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                    />
                  </div>
                  {note ? <p className="mt-1 text-xs leading-5 text-zinc-500">{note}</p> : null}
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs leading-5 text-zinc-500">
            <span className="font-black text-zinc-700">{text.caveat}: </span>
            {caution}
          </p>
        </div>
      </details>
    </article>
  );
}

function FeaturedCard({
  categoryKey,
  locale,
}: {
  categoryKey: AiToolCategoryKey;
  locale: Locale;
}) {
  const text = copy[locale];
  const Icon = categoryIcons[categoryKey];
  const tools = getTopToolsForCategory(categoryKey, 3);
  const winner = tools[0];
  if (!winner) return null;

  const score = getCategoryScore(winner, categoryKey);
  const strengths = locale === "en" ? winner.strengthsEn : winner.strengthsZh;

  return (
    <a
      href={`#${categoryKey}`}
      className="block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-950/[0.03] transition hover:-translate-y-0.5 hover:border-lime-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white">
            <Icon size={18} />
          </div>
          <div>
            <h2 className="text-sm font-black text-zinc-950">
              {categoryLabel(categoryKey, locale)}
            </h2>
            <p className="mt-1 text-xs font-bold text-zinc-400">{text.winner}</p>
          </div>
        </div>
        <span
          className={[
            "rounded-full px-2.5 py-1 text-xs font-black ring-1",
            scoreTone(score),
          ].join(" ")}
        >
          {score}
        </span>
      </div>
      <div className="mt-4 text-lg font-black text-zinc-950">{winner.name}</div>
      <p className="mt-2 min-h-[40px] text-sm leading-5 text-zinc-600">
        {strengths.slice(0, 2).join(locale === "en" ? " · " : "、")}
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
        <span className="text-xs font-bold text-zinc-400">
          {tools.map((item) => item.name).join(" / ")}
        </span>
        <ArrowRight size={15} className="text-zinc-400" />
      </div>
    </a>
  );
}

function CapabilityChart({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const tools = aiToolRankingItems
    .filter((item) => item.categoryKeys.includes("overall"))
    .sort((a, b) => b.scores.benchmark - a.scores.benchmark)
    .slice(0, 8);
  const maxScore = Math.max(...tools.map((item) => item.scores.benchmark), 1);
  const capabilityLeader = tools[0];
  const valueLeader = [...tools].sort((a, b) => b.scores.value - a.scores.value)[0];
  const freeLeader = [...tools].sort((a, b) => b.scores.freeAccess - a.scores.freeAccess)[0];

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-950/[0.03] md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-zinc-950">{text.chartTitle}</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">{text.chartSubtitle}</p>
        </div>
        <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
          {text.benchmark}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {tools.map((item, index) => {
          const score = item.scores.benchmark;
          const width = `${Math.max(8, Math.min(100, (score / maxScore) * 100))}%`;

          return (
            <div key={item.slug} className="grid grid-cols-[26px_minmax(86px,0.56fr)_minmax(120px,1fr)_42px] items-center gap-2">
              <div className="text-xs font-black tabular-nums text-zinc-400">
                {index + 1}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-zinc-900">{item.name}</div>
                <div className="truncate text-[11px] font-bold text-zinc-400">
                  {item.company}
                </div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={[
                    "h-full rounded-full",
                    index === 0 ? "bg-zinc-950" : index < 3 ? "bg-lime-500" : "bg-zinc-300",
                  ].join(" ")}
                  style={{ width }}
                />
              </div>
              <div className="text-right text-sm font-black tabular-nums text-zinc-950">
                {score}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
        <div className="p-3">
          <div className="text-[11px] font-black uppercase text-zinc-400">
            {text.capabilityLeader}
          </div>
          <div className="mt-1 truncate text-sm font-black text-zinc-950">
            {capabilityLeader?.name}
          </div>
        </div>
        <div className="border-l border-zinc-200 p-3">
          <div className="text-[11px] font-black uppercase text-zinc-400">
            {text.valueLeader}
          </div>
          <div className="mt-1 truncate text-sm font-black text-zinc-950">
            {valueLeader?.name}
          </div>
        </div>
        <div className="border-l border-zinc-200 p-3">
          <div className="text-[11px] font-black uppercase text-zinc-400">
            {text.freeLeader}
          </div>
          <div className="mt-1 truncate text-sm font-black text-zinc-950">
            {freeLeader?.name}
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-zinc-500">{text.chartNote}</p>
    </section>
  );
}

function GqsMethodology({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const summary =
    locale === "en" ? geoSubQualityScore.summaryEn : geoSubQualityScore.summaryZh;
  const principles =
    locale === "en" ? geoSubQualityScore.principlesEn : geoSubQualityScore.principlesZh;

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-950/[0.03] md:p-6">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <div className="inline-flex rounded-full border border-lime-200 bg-lime-50 px-3 py-1 text-xs font-black text-lime-700">
              {geoSubQualityScore.version}
            </div>
            <h2 className="mt-4 text-2xl font-black text-zinc-950">
              {text.gqsTitle}
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600">{summary}</p>

            <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs font-black uppercase text-zinc-400">
                {text.gqsPrinciples}
              </div>
              <div className="mt-3 space-y-2">
                {principles.map((principle) => (
                  <div key={principle} className="flex gap-2 text-sm leading-6 text-zinc-700">
                    <CheckCircle2 size={16} className="mt-1 shrink-0 text-lime-600" />
                    <span>{principle}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm leading-6 text-zinc-500">{text.gqsSubtitle}</p>
            <div className="grid gap-3 md:grid-cols-2">
              {geoSubQualityScorePillars.map((pillar) => {
                const label = locale === "en" ? pillar.labelEn : pillar.labelZh;
                const question = locale === "en" ? pillar.questionEn : pillar.questionZh;
                const evidence = locale === "en" ? pillar.evidenceEn : pillar.evidenceZh;
                const dimension = aiToolScoreDimensions.find(
                  (item) => item.key === pillar.key,
                );

                return (
                  <div key={pillar.code} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-wide text-zinc-400">
                          {pillar.code}
                        </div>
                        <h3 className="mt-1 text-sm font-black text-zinc-950">{label}</h3>
                      </div>
                      {dimension ? (
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-zinc-500 ring-1 ring-zinc-200">
                          {Math.round(dimension.weight * 100)}%
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">{question}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {evidence.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-bold text-zinc-500"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AiToolRankingsView({ locale }: { locale: Locale }) {
  const text = copy[locale];

  return (
    <main className="min-h-screen bg-[#faf8f2]">
      <section className="border-b border-zinc-200 bg-[#fbfaf6]">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_520px] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-lime-600">
                {text.eyebrow}
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-6xl">
                {text.title}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-600 md:text-lg">
                {text.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-zinc-600">
                  {text.updated}
                </span>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
                  {text.benchmark}: Artificial Analysis
                </span>
              </div>
            </div>

            <CapabilityChart locale={locale} />
          </div>

          <nav className="mt-10 flex gap-2 overflow-x-auto pb-2" aria-label={text.allCategories}>
            {aiToolCategories.map((category) => (
              <a
                key={category.key}
                href={`#${category.key}`}
                className="shrink-0 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-zinc-600 transition hover:border-lime-300 hover:bg-lime-50 hover:text-lime-700"
              >
                {locale === "en" ? category.labelEn : category.labelZh}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-5 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-zinc-950">{text.quickTitle}</h2>
            <p className="mt-1 text-sm text-zinc-500">{text.quickSubtitle}</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featuredCategories.map((categoryKey) => (
            <FeaturedCard key={categoryKey} categoryKey={categoryKey} locale={locale} />
          ))}
        </div>
      </section>

      <section className="border-y border-blue-100 bg-blue-50">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[240px_1fr] lg:items-start">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-950 text-white">
              <Info size={19} />
            </div>
            <h2 className="text-xl font-black text-blue-950">{text.methodTitle}</h2>
          </div>
          <p className="text-sm leading-7 text-blue-900">{text.methodText}</p>
        </div>
      </section>

      <GqsMethodology locale={locale} />

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-center gap-3">
          <Trophy size={22} className="text-lime-600" />
          <h2 className="text-2xl font-black tracking-tight text-zinc-950">
            {text.rankingsTitle}
          </h2>
        </div>

        <div className="mt-6 space-y-10">
          {aiToolCategories.map((category) => {
            const tools = getTopToolsForCategory(category.key, 12);
            const Icon = categoryIcons[category.key];
            const profile =
              aiToolCategoryScoringProfiles[category.key] ??
              aiToolCategoryScoringProfiles.overall;

            if (tools.length === 0) return null;

            return (
              <section key={category.key} id={category.key} className="scroll-mt-24">
                <div className="mb-3 grid gap-4 md:grid-cols-[1fr_360px] md:items-end">
                  <div className="flex gap-3">
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white">
                      <Icon size={18} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-zinc-950">
                        {categoryLabel(category.key, locale)}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-zinc-500">
                        {categoryDescription(category.key, locale)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 md:justify-end">
                    {aiToolScoreDimensions
                      .filter((dimension) => profile.weights[dimension.key] >= 0.12)
                      .map((dimension) => (
                        <span
                          key={dimension.key}
                          className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-black text-zinc-500"
                        >
                          {locale === "en" ? dimension.labelEn : dimension.labelZh}{" "}
                          {Math.round(profile.weights[dimension.key] * 100)}%
                        </span>
                      ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-950/[0.03]">
                  <div className="hidden border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-black uppercase text-zinc-400 md:px-5 lg:grid lg:grid-cols-[54px_minmax(190px,0.95fr)_minmax(230px,1.15fr)_minmax(220px,1fr)_140px] lg:items-center">
                    <div>{text.rank}</div>
                    <div>{text.tool}</div>
                    <div>{text.score}</div>
                    <div>{text.judgement}</div>
                    <div className="text-right">{text.action}</div>
                  </div>
                  <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-sm md:px-5 lg:hidden">
                    <span className="font-black text-zinc-700">{text.sortedBy}</span>
                    <span className="font-black text-zinc-400">Top {tools.length}</span>
                  </div>
                  {tools.map((item, index) => (
                    <ToolRow
                      key={`${category.key}-${item.slug}`}
                      item={item}
                      locale={locale}
                      rank={index + 1}
                      categoryKey={category.key}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="text-xl font-black text-zinc-950">{text.refsTitle}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-500">
                {text.refsText}
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {aiToolScoringReferences.map((reference) => (
              <a
                key={reference.href}
                href={reference.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 transition hover:border-lime-300 hover:bg-lime-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black text-zinc-950">
                    {reference.label}
                  </h3>
                  <ExternalLink size={15} className="text-zinc-400" />
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  {locale === "en" ? reference.useEn : reference.useZh}
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
