import { adminListActionClassName } from "@/components/admin/admin-control";
import { withAdminReturnTo, adminListLocation } from "@/lib/admin-workflow-context";
import AdminSegmentedControl from "@/components/admin/AdminSegmentedControl";
import { adminButtonClassName } from "@/components/admin/AdminButton";
import AdminPagination from "@/components/admin/AdminPagination";
import { createAdminListView } from "@/lib/admin-list-params";
import { AdminActionForm } from "@/components/admin/AdminPermissions";
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
  if (status === "ARCHIVED") return "bg-admin-chip text-admin-text-muted ring-admin-border dark:bg-admin-chip dark:text-admin-text-muted";
  return "bg-admin-surface-subtle text-admin-text-secondary ring-admin-border";
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
  searchParams?: Promise<{ state?: string; page?: string; }>;
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

  const list = createAdminListView(visibleRows, { basePath: "/admin/articles", params: query, pageSize: 25, pageParam: "page", id: "articles-list" });
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
              href={withAdminReturnTo("/admin/articles/new?locale=ZH",adminListLocation("/admin/articles",query))}
            >
              <Plus size={16} />
              新建中文
            </AdminLinkButton>
            <AdminLinkButton
              href={withAdminReturnTo("/admin/articles/new?locale=EN",adminListLocation("/admin/articles",query))}
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
          <div className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">全部文章</div>
          <div className="mt-2 text-3xl font-semibold text-admin-text dark:text-admin-text">{articles.length}</div>
          <div className="mt-2 text-sm text-admin-text-muted dark:text-admin-text-muted">后台已创建的内容总数。</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">已发布</div>
          <div className="mt-2 text-3xl font-semibold text-emerald-700">{publishedCount}</div>
          <div className="mt-2 text-sm text-admin-text-muted dark:text-admin-text-muted">可在前台展示的文章。</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">草稿</div>
          <div className="mt-2 text-3xl font-semibold text-admin-text dark:text-admin-text">{draftCount}</div>
          <div className="mt-2 text-sm text-admin-text-muted dark:text-admin-text-muted">仍在编辑中的内容。</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">已下架</div>
          <div className="mt-2 text-3xl font-semibold text-admin-text-secondary dark:text-admin-text-secondary">{archivedCount}</div>
          <div className="mt-2 text-sm text-admin-text-muted dark:text-admin-text-muted">不会在前台展示。</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">内容待完善</div>
          <div className="mt-2 text-3xl font-semibold text-amber-700">{needsWorkCount}</div>
          <div className="mt-2 text-sm text-admin-text-muted dark:text-admin-text-muted">正文、内链、搜索表达或技术信息仍有缺口。</div>
        </AdminCard>
      </div>

      <AdminCard>
        <div className="mb-5 min-w-0">
          <AdminSegmentedControl ariaLabel="文章状态" value={selectedState} items={articleFilters.map(([value, label]) => ({
            value, label: `${label} ${articleRows.filter(({article, quality}) =>
              value === "published" ? article.status === "PUBLISHED"
                : value === "editing" ? ["DRAFT", "REVIEW", "SCHEDULED"].includes(article.status)
                  : value === "needs-work" ? quality.status !== "ready"
                    : value === "archived" ? article.status === "ARCHIVED" : true
            ).length}`,
            href: value === "all" ? "/admin/articles" : `/admin/articles?state=${value}`,
          }))} />
        </div>

        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">内容列表</h2>
            <p className="mt-1 text-sm text-admin-text-muted dark:text-admin-text-muted">
              当前有 {indexableCount} 篇已发布且允许收录的文章会进入搜索入口。
            </p>
          </div>
          <AdminLink
            href="/zh/guides"
            target="_blank"
            className="text-sm font-medium text-admin-accent hover:underline"
          >
            查看前台指南页
          </AdminLink>
        </div>

        <AdminPagination {...list.pagination} ariaLabel="列表分页" className="mb-4" id="articles-list" />
        <div className="overflow-x-auto rounded-xl border border-admin-border dark:border-admin-border-strong">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[minmax(220px,1.4fr)_100px_100px_170px_120px_110px_200px]
              bg-admin-surface-subtle px-5 py-3 text-xs font-semibold uppercase tracking-wide
              text-admin-text-faint dark:bg-admin-chip">
              <div>标题</div>
              <div>类型</div>
              <div>状态</div>
              <div>内容质量</div>
              <div>发布时间</div>
              <div>更新</div>
              <div>操作</div>
            </div>

            <div className="divide-y divide-admin-border bg-admin-surface dark:bg-admin-surface">
              {list.items.map(({ article, quality }) => (
                <div
                  key={article.id}
                  id={`articles-row-${article.id}`}
                  className="grid grid-cols-[minmax(220px,1.4fr)_100px_100px_170px_120px_110px_200px] items-center px-5 py-4 text-sm"
                >
                  <div>
                    <AdminLink
                      href={withAdminReturnTo(`/admin/articles/${article.id}/edit`, adminListLocation("/admin/articles",query,`articles-row-${article.id}`))}
                      className="font-semibold text-admin-text transition hover:text-blue-700 dark:text-admin-text"
                    >
                      {article.title}
                    </AdminLink>
                    <div className="mt-1 font-mono text-xs text-admin-text-faint">
                      /{article.locale === "EN" ? "en" : "zh"}/guides/{article.slug}
                    </div>
                    <span className="mt-2 inline-flex rounded-full bg-admin-chip px-2 py-0.5 text-[11px] font-semibold text-admin-text-secondary dark:bg-admin-chip dark:text-admin-text-secondary">
                      {article.locale === "EN" ? "English" : "简体中文"}
                    </span>
                    {article.excerpt ? (
                      <div className="mt-2 line-clamp-1 text-xs text-admin-text-muted dark:text-admin-text-muted">{article.excerpt}</div>
                    ) : null}
                  </div>

                  <div className="font-semibold text-admin-text-secondary dark:text-admin-text-secondary">
                    {getArticleTypeLabel(article.articleType, article.locale === "EN" ? "en" : "zh")}
                  </div>

                  <div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClassName(article.status)}`}>
                      {articleStatusLabels[article.status]}
                    </span>
                  </div>

                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                      quality.status === "ready"
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : quality.status === "needs_work"
                          ? "bg-amber-50 text-amber-700 ring-amber-200"
                          : "bg-red-50 text-red-700 ring-red-200"
                    }`}>
                      {quality.score} · {quality.statusLabel}
                    </span>
                    <div className="mt-2 line-clamp-2 text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
                      {quality.nextAction}
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-admin-text-muted dark:text-admin-text-muted">
                    {formatArticleDate(article.publishedAt, article.locale === "EN" ? "en" : "zh")}
                  </div>

                  <div className="text-xs font-semibold text-admin-text-muted dark:text-admin-text-muted">
                    {formatArticleDate(article.updatedAt, article.locale === "EN" ? "en" : "zh")}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <AdminLink
                      href={withAdminReturnTo(`/admin/articles/${article.id}/edit`, adminListLocation("/admin/articles",query,`articles-row-${article.id}`))}
                      className={adminListActionClassName}
                    >
                      编辑
                    </AdminLink>
                    <AdminLink
                      href={`/admin/articles/${article.id}/preview`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-admin-text-secondary hover:text-admin-text dark:text-admin-text-secondary dark:hover:text-admin-text"
                    >
                      <Eye size={13} />
                      预览
                    </AdminLink>
                    {article.status === "PUBLISHED" ? (
                      <AdminLink
                        href={`/${article.locale === "EN" ? "en" : "zh"}/guides/${article.slug}`}
                        target="_blank"
                        className="text-xs font-semibold text-admin-text-secondary hover:text-admin-text dark:text-admin-text-secondary dark:hover:text-admin-text"
                      >
                        查看
                      </AdminLink>
                    ) : null}
                    {article.status !== "ARCHIVED" ? (
                      <AdminActionForm action={archiveArticleAction}>
                        <input type="hidden" name="id" value={article.id} />
                        <button
                          type="submit"
                          className={adminButtonClassName({ variant: "secondary", size: "sm", className: "" })}
                        >
                          <Archive size={13} />
                          下架
                        </button>
                      </AdminActionForm>
                    ) : null}
                    <AdminActionForm action={moveArticleToTrashAction}>
                      <input type="hidden" name="id" value={article.id} />
                      <button
                        type="submit"
                        className={adminButtonClassName({ variant: "danger", size: "sm", className: "" })}
                      >
                        <Trash2 size={13} />
                        删除
                      </button>
                    </AdminActionForm>
                  </div>
                </div>
              ))}

              {visibleRows.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <FileText className="mx-auto text-admin-text-secondary" size={36} />
                  <div className="mt-4 text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">
                    {articles.length === 0 ? "还没有文章。" : "当前筛选下没有文章。"}
                  </div>
                  {articles.length === 0 ? (
                    <AdminLinkButton
                      href={withAdminReturnTo("/admin/articles/new",adminListLocation("/admin/articles",query))}
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
      <AdminPagination {...list.pagination} ariaLabel="列表底部分页" className="mt-4" />
      </AdminCard>
    </div>
  );
}
