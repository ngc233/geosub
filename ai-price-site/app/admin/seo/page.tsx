import AdminLink from "@/components/admin/AdminLink";
import { AdminCard, AdminPageHeader } from "../../../components/admin/AdminCard";
import { prisma } from "../../../lib/prisma";
import {
  getProductPlanSitemapPromotion,
  getProductSeoGateMode,
} from "../../../lib/product-seo-indexing-policy";
import { getCachedProductSeoQualityAudits } from "../../../lib/product-seo-quality-data";
import {
  type ProductSeoQualityStatus,
} from "../../../lib/seo-page-quality";
import {
  seoIndexableLocales,
  seoSitemapBudgets,
} from "../../../lib/seo-indexing-policy";
import {
  parseSeoObservationSnapshots,
  parseSeoTrafficObservationSnapshots,
  SEO_BING_OBSERVATION_SETTING_KEY,
  SEO_OBSERVATION_SETTING_KEY,
} from "../../../lib/seo-observation-snapshots";
import {
  buildSeoSearchPagePriorities,
  SEO_SEARCH_BASELINE_OBSERVED_AT,
  seoSearchPerformanceBaseline,
} from "../../../lib/seo-search-performance-baseline";
import SeoObservationPanel from "./SeoObservationPanel";
import SeoSearchPriorityPanel from "./SeoSearchPriorityPanel";
import SeoTrafficConversionPanel from "./SeoTrafficConversionPanel";
import { getSeoTrafficConversionOverview } from "../../../lib/admin-seo-conversion";
import { evaluateArticleContentQuality } from "../../../lib/article-content-quality";
import { getPipelineGrowthSignals } from "../../../lib/admin-pipeline-growth";
import { buildPlanSitemapPromotionRecommendations } from "../../../lib/plan-sitemap-promotion-recommendation";
import PlanSitemapPromotionPanel from "./PlanSitemapPromotionPanel";
import SeoPageObservationImportPanel from "./SeoPageObservationImportPanel";
import {
  parsePlanSitemapPromotionState,
  SEO_PLAN_PROMOTION_SETTING_KEY,
} from "../../../lib/seo-plan-promotion-state";
import {
  getEffectiveSeoSearchPageObservations,
  parseSeoSearchPageImportState,
  SEO_SEARCH_PAGE_IMPORT_SETTING_KEY,
} from "../../../lib/seo-search-observation-import";

export const dynamic = "force-dynamic";

function scoreClassName(score: number) {
  if (score >= 85) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (score >= 60) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-red-50 text-red-700 ring-red-200";
}

function statusClassName(status: ProductSeoQualityStatus) {
  if (status === "indexable") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (status === "needs_work") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  return "bg-red-50 text-red-700 ring-red-200";
}

function promotionClassName(
  state: ReturnType<typeof getProductPlanSitemapPromotion>["state"],
) {
  if (state === "promoted") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (state === "waiting") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

export default async function AdminSeoPage({
  searchParams,
}: {
  searchParams?: Promise<{
    baselineSaved?: string;
    baselineError?: string;
    bingSaved?: string;
    bingError?: string;
    promotionSaved?: string;
    promotionRolledBack?: string;
    promotionError?: string;
    pageImportSaved?: string;
    pageImportRolledBack?: string;
    pageImportError?: string;
  }>;
}) {
  const query = searchParams ? await searchParams : {};
  const [
    articles,
    productAudits,
    observationSettings,
    trafficConversion,
    pipelineGrowthSignals,
  ] = await Promise.all([
    prisma.article.findMany({
      where: {
        deletedAt: null,
        status: {
          not: "ARCHIVED",
        },
      },
      include: {
        relations: {
          where: {
            status: "PUBLISHED",
          },
          select: {
            relationType: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 50,
    }),
    getCachedProductSeoQualityAudits(),
    prisma.siteSetting.findMany({
      where: {
        settingKey: {
          in: [
            SEO_OBSERVATION_SETTING_KEY,
            SEO_BING_OBSERVATION_SETTING_KEY,
            SEO_PLAN_PROMOTION_SETTING_KEY,
            SEO_SEARCH_PAGE_IMPORT_SETTING_KEY,
          ],
        },
      },
      select: { settingKey: true, valueText: true },
    }),
    getSeoTrafficConversionOverview(),
    getPipelineGrowthSignals(),
  ]);

  const articleAudits = articles
    .map((article) => {
      const path = `/${article.locale === "EN" ? "en" : "zh"}/guides/${article.slug}`;
      const quality = evaluateArticleContentQuality({
        locale: article.locale === "EN" ? "EN" : "ZH",
        status: article.status,
        title: article.title,
        excerpt: article.excerpt,
        bodyMarkdown: article.bodyMarkdown,
        seoTitle: article.seoTitle,
        seoDescription: article.seoDescription,
        seoKeywords: article.seoKeywords,
        canonicalUrl: article.canonicalUrl,
        noindex: article.noindex,
        relatedProductCount: article.relations.filter(
          (relation) => relation.relationType === "RELATED_PRODUCT",
        ).length,
        relatedArticleCount: article.relations.filter(
          (relation) => relation.relationType === "RELATED_ARTICLE",
        ).length,
      });

      return {
        id: article.id,
        title: article.title,
        path,
        editPath: `/admin/articles/${article.id}/edit`,
        ...quality,
      };
    })
    .sort((a, b) => a.score - b.score);

  const indexable = productAudits.filter(
    (item) => item.status === "indexable",
  ).length;
  const needsWork = productAudits.filter(
    (item) => item.status === "needs_work",
  ).length;
  const hold = productAudits.filter((item) => item.status === "hold").length;
  const gateMode = getProductSeoGateMode();
  const observationValueByKey = new Map(
    observationSettings.map((item) => [item.settingKey, item.valueText]),
  );
  const planPromotionState = parsePlanSitemapPromotionState(
    observationValueByKey.get(SEO_PLAN_PROMOTION_SETTING_KEY),
  );
  const searchPageImportState = parseSeoSearchPageImportState(
    observationValueByKey.get(SEO_SEARCH_PAGE_IMPORT_SETTING_KEY),
  );
  const effectiveSearchObservations = getEffectiveSeoSearchPageObservations({
    baseline: seoSearchPerformanceBaseline,
    state: searchPageImportState,
  });
  const promotionByProduct = new Map(
    productAudits.map((item) => [
      item.id,
      getProductPlanSitemapPromotion({
        productSlug: item.slug,
        qualityStatus: item.status,
        gateMode,
        currentPlanCount: item.currentPlanCount,
        promotedProductSlugs: planPromotionState.activeSlugs,
      }),
    ]),
  );
  const promotionSummary = [...promotionByProduct.values()].reduce(
    (summary, promotion) => ({
      productOverviewPages:
        summary.productOverviewPages + promotion.productOverviewPages,
      promotedPlanPages:
        summary.promotedPlanPages + promotion.includedPlanPages,
      waitingProducts:
        summary.waitingProducts + (promotion.state === "waiting" ? 1 : 0),
      waitingPlanPages:
        summary.waitingPlanPages
        + (promotion.state === "waiting" ? promotion.potentialPlanPages : 0),
    }),
    {
      productOverviewPages: 0,
      promotedPlanPages: 0,
      waitingProducts: 0,
      waitingPlanPages: 0,
    },
  );
  const googleObservationSnapshots = parseSeoObservationSnapshots(
    observationValueByKey.get(SEO_OBSERVATION_SETTING_KEY),
  );
  const bingObservationSnapshots = parseSeoTrafficObservationSnapshots(
    observationValueByKey.get(SEO_BING_OBSERVATION_SETTING_KEY),
  );
  const searchPagePriorities = buildSeoSearchPagePriorities(
    effectiveSearchObservations,
  );
  const searchObservationDate = effectiveSearchObservations.reduce(
    (latest, observation) =>
      observation.periodEnd > latest ? observation.periodEnd : latest,
    SEO_SEARCH_BASELINE_OBSERVED_AT,
  );
  const activeProductPlanPages =
    promotionSummary.productOverviewPages + promotionSummary.promotedPlanPages;
  const availableProductPlanPages = Math.max(
    0,
    seoSitemapBudgets.productPlanPages - activeProductPlanPages,
  );
  const promotionRecommendations =
    buildPlanSitemapPromotionRecommendations({
      audits: productAudits,
      demandSignals: pipelineGrowthSignals,
      searchObservations: effectiveSearchObservations,
      trafficConversion,
      gateMode,
      availablePageCapacity: availableProductPlanPages,
      promotedProductSlugs: planPromotionState.activeSlugs,
    });

  return (
    <div>
      <AdminPageHeader
        eyebrow="搜索质量"
        title="页面收录质量"
        description="判断价格页是否真正值得进入搜索结果。评分同时检查搜索信息、地区价格覆盖、数据新鲜度、税务与异常，以及帮助用户做购买判断的内容。"
      />

      <AdminCard className="mb-6 border-blue-200 bg-blue-50/70">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="text-sm font-black text-blue-950">
              产品级收录门禁：{gateMode === "observe" ? "观察模式" : "执行模式"}
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-blue-800">
              {gateMode === "observe"
                ? "当前只预演结果，不会从 sitemap 移除页面，也不会改变页面 robots。确认评分稳定后，再切换为执行模式。"
                : "产品概览按质量门槛提交；套餐页再按搜索优先级分批进入 sitemap，避免一次发布过多相似网址。"}
            </p>
          </div>
          <div className="grid shrink-0 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-blue-200 bg-white px-4 py-3 text-sm text-blue-950">
              <div className="font-black">当前主动推广</div>
              <div className="mt-1 text-2xl font-black">
                {promotionSummary.productOverviewPages
                  + promotionSummary.promotedPlanPages} 个价格页
              </div>
              <div className="mt-1 text-xs leading-5 text-blue-700">
                {promotionSummary.productOverviewPages} 个产品概览 · {promotionSummary.promotedPlanPages} 个套餐页
              </div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-white px-4 py-3 text-sm text-blue-950">
              <div className="font-black">等待下一批</div>
              <div className="mt-1 text-2xl font-black">
                {promotionSummary.waitingProducts} 个产品
              </div>
              <div className="mt-1 text-xs leading-5 text-blue-700">
                共 {promotionSummary.waitingPlanPages} 个双语套餐页待排期
              </div>
            </div>
          </div>
        </div>
      </AdminCard>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">已上线产品</div>
          <div className="mt-2 text-3xl font-black text-slate-950">
            {productAudits.length}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            当前纳入搜索质量检查的产品。
          </div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">可收录</div>
          <div className="mt-2 text-3xl font-black text-emerald-700">
            {indexable}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            数据和内容达标，不代表所有套餐页已进入 sitemap。
          </div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">待完善</div>
          <div className="mt-2 text-3xl font-black text-amber-700">
            {needsWork}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            可以访问，但应先补强再重点推广。
          </div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">建议暂缓收录</div>
          <div className="mt-2 text-3xl font-black text-red-700">{hold}</div>
          <div className="mt-2 text-sm text-slate-500">
            存在覆盖、过期、极端价或重复套餐问题。
          </div>
        </AdminCard>
      </div>

      <PlanSitemapPromotionPanel
        recommendations={promotionRecommendations}
        activePages={activeProductPlanPages}
        pageBudget={seoSitemapBudgets.productPlanPages}
        history={planPromotionState.revisions}
        saved={query.promotionSaved === "1"}
        rolledBack={query.promotionRolledBack === "1"}
        error={query.promotionError || null}
      />

      <SeoObservationPanel
        googleSnapshots={googleObservationSnapshots}
        bingSnapshots={bingObservationSnapshots}
        productPages={promotionSummary.productOverviewPages}
        planPages={promotionSummary.promotedPlanPages}
        indexableLocales={seoIndexableLocales.length}
        googleSaved={query.baselineSaved === "1"}
        googleError={query.baselineError === "invalid"}
        bingSaved={query.bingSaved === "1"}
        bingError={query.bingError === "invalid"}
      />

      <SeoPageObservationImportPanel
        state={searchPageImportState}
        savedEngine={query.pageImportSaved || null}
        rolledBackEngine={query.pageImportRolledBack || null}
        error={query.pageImportError || null}
      />

      <SeoTrafficConversionPanel overview={trafficConversion} />

      <SeoSearchPriorityPanel
        priorities={searchPagePriorities}
        observedAt={searchObservationDate}
      />

      <AdminCard>
        <div className="mb-5">
          <h2 className="text-lg font-black text-slate-950">
            产品价格页质量队列
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            分数低的产品排在前面。先处理第一条原因，通常就是当前最值得做的改进。
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <div className="min-w-[1280px]">
            <div className="grid grid-cols-[90px_130px_240px_minmax(220px,1fr)_230px_280px_140px] bg-slate-50 px-5 py-3 text-xs font-black uppercase text-slate-400">
              <div>分数</div>
              <div>质量状态</div>
              <div>搜索推广</div>
              <div>产品</div>
              <div>数据概况</div>
              <div>优先处理</div>
              <div>操作</div>
            </div>

            <div className="divide-y divide-slate-100 bg-white">
              {productAudits.map((item) => {
                const promotion = promotionByProduct.get(item.id)!;

                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-[90px_130px_240px_minmax(220px,1fr)_230px_280px_140px] items-center px-5 py-4 text-sm"
                  >
                  <div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${scoreClassName(item.score)}`}
                    >
                      {item.score}
                    </span>
                  </div>
                  <div>
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-black ring-1 ${statusClassName(item.status)}`}
                    >
                      {item.statusLabel}
                    </span>
                  </div>
                  <div className="pr-4 text-xs leading-5 text-slate-600">
                    <span
                      className={`inline-flex rounded-md px-2 py-1 font-black ring-1 ${promotionClassName(promotion.state)}`}
                    >
                      {promotion.label}
                    </span>
                    <div className="mt-2 font-bold text-slate-700">
                      {promotion.productOverviewPages} 个概览已提交
                      {promotion.state === "promoted"
                        ? ` · ${promotion.includedPlanPages} 个套餐页已提交`
                        : promotion.state === "waiting"
                          ? ` · ${promotion.potentialPlanPages} 个套餐页待排期`
                          : ""}
                    </div>
                    <div className="mt-1 font-normal text-slate-400">
                      {promotion.reason}
                    </div>
                  </div>
                  <div>
                    <div className="font-black text-slate-950">{item.title}</div>
                    <div className="mt-1 font-mono text-xs text-slate-400">
                      {item.path}
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      搜索 {item.sections.search}/20 · 数据{" "}
                      {item.sections.data}/45 · 可信 {item.sections.trust}/20 ·
                      决策 {item.sections.decision}/15
                    </div>
                  </div>
                  <div className="text-xs leading-6 text-slate-600">
                    <div>
                      基础 SEO {item.completeSeoLocaleCount}/
                      {item.requiredSeoLocaleCount}
                    </div>
                    <div>
                      {item.planCount} 个套餐 · {item.countryCount} 个地区
                    </div>
                    {item.legacyPlanCount > 0 ? (
                      <div className="font-bold text-amber-700">
                        {item.legacyPlanCount} 个历史续订层
                      </div>
                    ) : null}
                    <div>
                      {item.priceCount} 条价格 · {item.stalePriceCount} 条过期
                    </div>
                    <div>{item.taxGapCount} 个地区缺税务资料</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-5 text-slate-700">
                      {item.nextAction}
                    </div>
                    {item.issues.length > 1 ? (
                      <div className="mt-1 text-xs text-slate-400">
                        另有 {item.issues.length - 1} 项待处理
                      </div>
                    ) : null}
                  </div>
                  <div className="flex gap-3">
                    <AdminLink
                      href={item.editPath}
                      className="text-xs font-black text-blue-700 hover:text-blue-900"
                    >
                      编辑
                    </AdminLink>
                    <AdminLink
                      href={item.path}
                      target="_blank"
                      className="text-xs font-black text-slate-600 hover:text-slate-950"
                    >
                      查看
                    </AdminLink>
                  </div>
                  </div>
                );
              })}

              {productAudits.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm font-bold text-slate-500">
                  还没有已上线的产品价格页。
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </AdminCard>

      <AdminCard className="mt-6">
        <div className="mb-5">
          <h2 className="text-lg font-black text-slate-950">文章内容质量</h2>
          <p className="mt-1 text-sm text-slate-500">
            按搜索表达、正文深度、内链路径和技术信息综合判断。先处理分数最低的文章，并按“下一步”补齐最影响收录与转化的内容。
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[90px_minmax(230px,1fr)_230px_260px_140px] bg-slate-50 px-5 py-3 text-xs font-black uppercase text-slate-400">
              <div>分数</div>
              <div>文章</div>
              <div>四项得分</div>
              <div>问题</div>
              <div>操作</div>
            </div>
            <div className="divide-y divide-slate-100 bg-white">
              {articleAudits.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[90px_minmax(230px,1fr)_230px_260px_140px] items-center px-5 py-4 text-sm"
                >
                  <div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${scoreClassName(item.score)}`}
                    >
                      {item.score}
                    </span>
                  </div>
                  <div>
                    <div className="font-black text-slate-950">{item.title}</div>
                    <div className="mt-1 font-mono text-xs text-slate-400">
                      {item.path}
                    </div>
                    <div className="mt-2 text-xs font-bold text-slate-500">
                      {item.statusLabel}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs font-bold text-slate-500">
                    <span>搜索 {item.dimensions.search}/25</span>
                    <span>正文 {item.dimensions.content}/35</span>
                    <span>内链 {item.dimensions.links}/20</span>
                    <span>技术 {item.dimensions.technical}/20</span>
                  </div>
                  <div className="text-xs leading-5 text-slate-500">
                    {item.issues.length > 0
                      ? (
                          <>
                            <div className="font-bold text-slate-700">{item.issues[0].label}</div>
                            <div className="mt-1">下一步：{item.nextAction}</div>
                            {item.issues.length > 1 ? (
                              <div className="mt-1 text-slate-400">另有 {item.issues.length - 1} 项待完善</div>
                            ) : null}
                          </>
                        )
                      : "内容已达到当前发布标准"}
                  </div>
                  <div className="flex gap-3">
                    <AdminLink
                      href={item.editPath}
                      className="text-xs font-black text-blue-700 hover:text-blue-900"
                    >
                      编辑
                    </AdminLink>
                    <AdminLink
                      href={item.path}
                      target="_blank"
                      className="text-xs font-black text-slate-600 hover:text-slate-950"
                    >
                      查看
                    </AdminLink>
                  </div>
                </div>
              ))}
              {articleAudits.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm font-bold text-slate-500">
                  还没有可检测的文章。
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
