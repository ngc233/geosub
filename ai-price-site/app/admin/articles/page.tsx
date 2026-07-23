import Link from "next/link";
import { Archive, FileText, Plus, Trash2 } from "lucide-react";
import { AdminLinkButton } from "../../../components/admin/AdminButton";
import { AdminCard, AdminPageHeader } from "../../../components/admin/AdminCard";
import {
  articleStatusLabels,
  formatArticleDate,
  getArticleTypeLabel,
  getAdminArticles,
} from "../../../lib/articles";
import { archiveArticleAction, moveArticleToTrashAction } from "./actions";

function statusClassName(status: string) {
  if (status === "PUBLISHED") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "SCHEDULED") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (status === "REVIEW") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (status === "ARCHIVED") return "bg-slate-100 text-slate-500 ring-slate-200";
  return "bg-zinc-50 text-zinc-600 ring-zinc-200";
}

export default async function AdminArticlesPage() {
  const [articles, trashedArticles] = await Promise.all([
    getAdminArticles(),
    getAdminArticles({ trashed: true }),
  ]);
  const publishedCount = articles.filter((article) => article.status === "PUBLISHED").length;
  const draftCount = articles.filter((article) => article.status === "DRAFT").length;
  const archivedCount = articles.filter((article) => article.status === "ARCHIVED").length;
  const indexableCount = articles.filter((article) => !article.noindex && article.status === "PUBLISHED").length;
  const missingSeoCount = articles.filter(
    (article) => !article.seoTitle || !article.seoDescription,
  ).length;

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
          <div className="text-sm font-bold text-slate-500">SEO 待补</div>
          <div className="mt-2 text-3xl font-black text-amber-700">{missingSeoCount}</div>
          <div className="mt-2 text-sm text-slate-500">缺标题或描述的文章。</div>
        </AdminCard>
      </div>

      <AdminCard>
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">内容列表</h2>
            <p className="mt-1 text-sm text-slate-500">
              当前有 {indexableCount} 篇已发布且允许收录的文章会进入搜索入口。
            </p>
          </div>
          <Link
            href="/zh/guides"
            target="_blank"
            className="text-sm font-black text-blue-700 hover:text-blue-900"
          >
            查看前台指南页
          </Link>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[minmax(220px,1.4fr)_110px_110px_110px_130px_120px_170px] bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-400">
              <div>标题</div>
              <div>类型</div>
              <div>状态</div>
              <div>SEO</div>
              <div>发布时间</div>
              <div>更新</div>
              <div>操作</div>
            </div>

            <div className="divide-y divide-slate-100 bg-white">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="grid grid-cols-[minmax(220px,1.4fr)_110px_110px_110px_130px_120px_170px] items-center px-5 py-4 text-sm"
                >
                  <div>
                    <Link
                      href={`/admin/articles/${article.id}/edit`}
                      className="font-black text-slate-950 transition hover:text-blue-700"
                    >
                      {article.title}
                    </Link>
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
                    {article.noindex ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                        不收录
                      </span>
                    ) : article.seoTitle && article.seoDescription ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
                        完整
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-200">
                        待补
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-bold text-slate-500">
                    {formatArticleDate(article.publishedAt, article.locale === "EN" ? "en" : "zh")}
                  </div>

                  <div className="text-xs font-bold text-slate-500">
                    {formatArticleDate(article.updatedAt, article.locale === "EN" ? "en" : "zh")}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/admin/articles/${article.id}/edit`}
                      className="text-xs font-black text-blue-700 hover:text-blue-900"
                    >
                      编辑
                    </Link>
                    {article.status === "PUBLISHED" && !article.noindex ? (
                      <Link
                        href={`/${article.locale === "EN" ? "en" : "zh"}/guides/${article.slug}`}
                        target="_blank"
                        className="text-xs font-black text-slate-600 hover:text-slate-950"
                      >
                        查看
                      </Link>
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

              {articles.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <FileText className="mx-auto text-slate-300" size={36} />
                  <div className="mt-4 text-sm font-bold text-slate-500">还没有文章。</div>
                  <AdminLinkButton
                    href="/admin/articles/new"
                    className="mt-5"
                  >
                    新建第一篇
                  </AdminLinkButton>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
