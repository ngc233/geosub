import AdminLink from "@/components/admin/AdminLink";
import { AdminCard, AdminPageHeader } from "../../../components/admin/AdminCard";
import { prisma } from "../../../lib/prisma";
import {
  getProductSeoGateMode,
  getProductSitemapDecision,
} from "../../../lib/product-seo-indexing-policy";
import { getProductSeoQualityAudits } from "../../../lib/product-seo-quality-data";
import {
  type ProductSeoQualityStatus,
} from "../../../lib/seo-page-quality";
import { seoIndexableLocales } from "../../../lib/seo-indexing-policy";

export const dynamic = "force-dynamic";

function scoreArticleSeo(item: {
  title?: string | null;
  description?: string | null;
  canonicalUrl?: string | null;
  noindex?: boolean | null;
}) {
  const issues: string[] = [];

  if (!item.title || item.title.length < 10) issues.push("标题过短或缺失");
  if (!item.description || item.description.length < 50) {
    issues.push("描述过短或缺失");
  }
  if (!item.canonicalUrl) issues.push("未设置 canonical");
  if (item.noindex) issues.push("禁止收录");

  return {
    score: Math.max(0, 100 - issues.length * 25),
    issues,
  };
}

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

export default async function AdminSeoPage() {
  const [articles, productAudits] = await Promise.all([
    prisma.article.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      take: 50,
    }),
    getProductSeoQualityAudits(),
  ]);

  const articleAudits = articles
    .map((article) => {
      const path = `/zh/guides/${article.slug}`;

      return {
        id: article.id,
        title: article.title,
        path,
        editPath: `/admin/articles/${article.id}/edit`,
        ...scoreArticleSeo({
          title: article.seoTitle || article.title,
          description: article.seoDescription || article.excerpt,
          canonicalUrl: article.canonicalUrl || path,
          noindex: article.noindex,
        }),
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
  const previewPlanPages = productAudits.reduce(
    (total, item) =>
      total +
      (getProductSitemapDecision(item.status, "enforce").included
        ? item.currentPlanCount * seoIndexableLocales.length
        : 0),
    0,
  );

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
                : "当前 sitemap 和页面 robots 会按同一质量结论执行，只提交达到收录标准的产品。"}
            </p>
          </div>
          <div className="shrink-0 rounded-lg border border-blue-200 bg-white px-4 py-3 text-sm text-blue-950">
            <div className="font-black">执行后预计提交</div>
            <div className="mt-1 text-2xl font-black">{previewPlanPages} 个套餐页</div>
            <div className="mt-1 text-xs text-blue-700">
              {seoIndexableLocales.length} 种重点语言
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
            数据和页面内容达到当前标准。
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
            <div className="grid grid-cols-[90px_130px_150px_minmax(220px,1fr)_230px_300px_140px] bg-slate-50 px-5 py-3 text-xs font-black uppercase text-slate-400">
              <div>分数</div>
              <div>质量状态</div>
              <div>收录影响</div>
              <div>产品</div>
              <div>数据概况</div>
              <div>优先处理</div>
              <div>操作</div>
            </div>

            <div className="divide-y divide-slate-100 bg-white">
              {productAudits.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[90px_130px_150px_minmax(220px,1fr)_230px_300px_140px] items-center px-5 py-4 text-sm"
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
                  <div className="text-xs font-bold leading-5 text-slate-600">
                    {
                      getProductSitemapDecision(item.status, gateMode)
                        .currentAction
                    }
                    <div className="mt-1 font-normal text-slate-400">
                      执行后 {item.currentPlanCount * seoIndexableLocales.length} 个套餐页
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
              ))}

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
          <h2 className="text-lg font-black text-slate-950">文章基础 SEO</h2>
          <p className="mt-1 text-sm text-slate-500">
            文章暂时检查标题、描述、canonical 和 noindex。下一阶段再加入正文深度、内链和搜索意图检查。
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[90px_minmax(260px,1fr)_300px_140px] bg-slate-50 px-5 py-3 text-xs font-black uppercase text-slate-400">
              <div>分数</div>
              <div>文章</div>
              <div>问题</div>
              <div>操作</div>
            </div>
            <div className="divide-y divide-slate-100 bg-white">
              {articleAudits.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[90px_minmax(260px,1fr)_300px_140px] items-center px-5 py-4 text-sm"
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
                  </div>
                  <div className="text-xs leading-5 text-slate-500">
                    {item.issues.length > 0
                      ? item.issues.join("、")
                      : "基础项完整"}
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
