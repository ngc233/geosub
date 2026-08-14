import AdminLink from "@/components/admin/AdminLink";
import { Archive, Eye, FileText, Plus, Trash2 } from "lucide-react";
import { AdminLinkButton } from "../../../components/admin/AdminButton";
import { AdminCard, AdminPageHeader } from "../../../components/admin/AdminCard";
import {
  articleStatusLabels,
  formatArticleDate,
  getArticleTypeLabel,
  getAdminArticles,
} from "../../../lib/articles";
import { evaluateArticleContentQuality } from "../../../lib/article-content-quality";
import { archiveArticleAction, moveArticleToTrashAction } from "./actions";

function statusClassName(status: string) {
  if (status === "PUBLISHED") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "SCHEDULED") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (status === "REVIEW") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (status === "ARCHIVED") return "bg-slate-100 text-slate-500 ring-slate-200";
  return "bg-zinc-50 text-zinc-600 ring-zinc-200";
}

const articleFilters = [
  ["all", "全部"],
  ["published", "已发布"],
  ["editing", "编辑中"],
  ["needs-work", "待完善"],
  ["archived", "已下架"],
] as const;

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams?: Promise<{ state?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  const selectedState = articleFilters.some(([value]) => value === query.state)
    ? query.state || "all"
    : "all";
  const [articles, trashedArticles] = await Promise.all([
    getAdminArticles(),
    getAdminArticles({ trashed: true }),
  ]);
  const publishedCount = articles.filter((article) => article.status === "PUBLISHED").length;
  const draftCount = articles.filter((article) => article.status === "DRAFT").length;
  const archivedCount = articles.filter((article) => article.status === "ARCHIVED").length;
  const indexableCount = articles.filter((article) => !article.noindex && article.status === "PUBLISHED").length;
  const articleRows = articles.map((article) => ({
    article,
    quality: evaluateArticleContentQuality({
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
    }),
  }));
  const needsWorkCount = articleRows.filter(
    ({ quality }) => quality.status !== "ready",
  ).length;
  const visibleRows = articleRows.filter(({ article, quality }) => {
    if (selectedState === "published") return article.status === "PUBLISHED";
    if (selectedState === "editing") {
      return ["DRAFT", "REVIEW", "SCHEDULED"].includes(article.status);
    }
    if (selectedState === "needs-work") return quality.status !== "ready";
    if (selectedState === "archived") return article.status === "ARCHIVED";
    return true;
  });

  return (
    <div>
      <AdminPageHeader
        eyebrow="Articles"
        title="文章发布"
        description="统一管理中文和英文指南、价格分析、产品对比及方法论内容。发布后会进入对应语言的指南页和 sitemap。"
        action={
          <div className="flex flex-wrap gap-3">
            <AdminLinkButton
              href="/admin/articles/taxonomy"
              variant="secondary"
            >
              分类与标签
            </AdminLinkButton>
            <AdminLinkButton
              href="/admin/articles/trash"
              variant="secondary"
            >
              <Trash2 size={16} />
              回收站 {trashedArticles.length}
            </AdminLinkButton>
            <AdminLinkButton
              href="/admin/articles/new?locale=ZH"
            >
              <Plus size={16} />
              新建中文
            </AdminLinkButton>
            <AdminLinkButton
              href="/admin/articles/new?locale=EN"
              variant="secondary"
            >
              <Plus size={16} />
              New English
            </AdminLinkButton>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">全部文章</div>
          <div className="mt-2 text-3xl font-black text-slate-950">{articles.length}</div>
          <div className="mt-2 text-sm text-slate-500">后台已创建的内容总数。</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">已发布</div>
          <div className="mt-2 text-3xl font-black text-emerald-700">{publishedCount}</div>
          <div className="mt-2 text-sm text-slate-500">可在前台展示的文章。</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">草稿</div>
          <div className="mt-2 text-3xl font-black text-slate-950">{draftCount}</div>
          <div className="mt-2 text-sm text-slate-500">仍在编辑中的内容。</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">已下架</div>
          <div className="mt-2 text-3xl font-black text-slate-600">{archivedCount}</div>
          <div className="mt-2 text-sm text-slate-500">不会在前台展示。</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">内容待完善</div>
          <div className="mt-2 text-3xl font-black text-amber-700">{needsWorkCount}</div>
          <div className="mt-2 text-sm text-slate-500">正文、内链、搜索表达或技术信息仍有缺口。</div>
        </AdminCard>
      </div>

      <AdminCard>
        <div className="mb-5 flex flex-wrap gap-2">
          {articleFilters.map(([value, label]) => {
            const active = selectedState === value;
            const count = articleRows.filter(({ article, quality }) => {
              if (value === "published") return article.status === "PUBLISHED";
              if (value === "editing") return ["DRAFT", "REVIEW", "SCHEDULED"].includes(article.status);
              if (value === "needs-work") return quality.status !== "ready";
              if (value === "archived") return article.status === "ARCHIVED";
              return true;
            }).length;

            return (
              <AdminLink
                key={value}
                href={value === "all" ? "/admin/articles" : `/admin/articles?state=${value}`}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-black transition ${
                  active
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
                }`}
              >
                {label}
                <span className={active ? "text-blue-100" : "text-slate-400"}>{count}</span>
              </AdminLink>
            );
          })}
        </div>

        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">内容列表</h2>
            <p className="mt-1 text-sm text-slate-500">
              当前有 {indexableCount} 篇已发布且允许收录的文章会进入搜索入口。
            </p>
          </div>
          <AdminLink
            href="/zh/guides"
            target="_blank"
            className="text-sm font-black text-blue-700 hover:text-blue-900"
          >
            查看前台指南页
          </AdminLink>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[minmax(220px,1.4fr)_100px_100px_170px_120px_110px_200px] bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-400">
              <div>标题</div>
              <div>类型</div>
              <div>状态</div>
              <div>内容质量</div>
              <div>发布时间</div>
              <div>更新</div>
              <div>操作</div>
            </div>

            <div className="divide-y divide-slate-100 bg-white">
              {visibleRows.map(({ article, quality }) => (
                <div
                  key={article.id}
                  className="grid grid-cols-[minmax(220px,1.4fr)_100px_100px_170px_120px_110px_200px] items-center px-5 py-4 text-sm"
                >
                  <div>
                    <AdminLink
                      href={`/admin/articles/${article.id}/edit`}
                      className="font-black text-slate-950 transition hover:text-blue-700"
                    >
                      {article.title}
                    </AdminLink>
                    <div className="mt-1 font-mono text-xs text-slate-400">
                      /{article.locale === "EN" ? "en" : "zh"}/guides/{article.slug}
                    </div>
                    <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-600">
                      {article.locale === "EN" ? "English" : "简体中文"}
                    </span>
                    {article.excerpt ? (
                      <div className="mt-2 line-clamp-1 text-xs text-slate-500">{article.excerpt}</div>
                    ) : null}
                  </div>

                  <div className="font-bold text-slate-600">
                    {getArticleTypeLabel(article.articleType, article.locale === "EN" ? "en" : "zh")}
                  </div>

                  <div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${statusClassName(article.status)}`}>
                      {articleStatusLabels[article.status]}
                    </span>
                  </div>

                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${
                      quality.status === "ready"
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : quality.status === "needs_work"
                          ? "bg-amber-50 text-amber-700 ring-amber-200"
                          : "bg-red-50 text-red-700 ring-red-200"
                    }`}>
                      {quality.score} · {quality.statusLabel}
                    </span>
                    <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                      {quality.nextAction}
                    </div>
                  </div>

                  <div className="text-xs font-bold text-slate-500">
                    {formatArticleDate(article.publishedAt, article.locale === "EN" ? "en" : "zh")}
                  </div>

                  <div className="text-xs font-bold text-slate-500">
                    {formatArticleDate(article.updatedAt, article.locale === "EN" ? "en" : "zh")}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <AdminLink
                      href={`/admin/articles/${article.id}/edit`}
                      className="text-xs font-black text-blue-700 hover:text-blue-900"
                    >
                      编辑
                    </AdminLink>
                    <AdminLink
                      href={`/admin/articles/${article.id}/preview`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs font-black text-slate-600 hover:text-slate-950"
                    >
                      <Eye size={13} />
                      预览
                    </AdminLink>
                    {article.status === "PUBLISHED" ? (
                      <AdminLink
                        href={`/${article.locale === "EN" ? "en" : "zh"}/guides/${article.slug}`}
                        target="_blank"
                        className="text-xs font-black text-slate-600 hover:text-slate-950"
                      >
                        查看
                      </AdminLink>
                    ) : null}
                    {article.status !== "ARCHIVED" ? (
                      <form action={archiveArticleAction}>
                        <input type="hidden" name="id" value={article.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 text-xs font-black text-slate-600 hover:text-slate-950"
                        >
                          <Archive size={13} />
                          下架
                        </button>
                      </form>
                    ) : null}
                    <form action={moveArticleToTrashAction}>
                      <input type="hidden" name="id" value={article.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 text-xs font-black text-rose-600 hover:text-rose-700"
                      >
                        <Trash2 size={13} />
                        删除
                      </button>
                    </form>
                  </div>
                </div>
              ))}

              {visibleRows.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <FileText className="mx-auto text-slate-300" size={36} />
                  <div className="mt-4 text-sm font-bold text-slate-500">
                    {articles.length === 0 ? "还没有文章。" : "当前筛选下没有文章。"}
                  </div>
                  {articles.length === 0 ? (
                    <AdminLinkButton
                      href="/admin/articles/new"
                      className="mt-5"
                    >
                      新建第一篇
                    </AdminLinkButton>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
