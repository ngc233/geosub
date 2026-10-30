import { adminButtonClassName } from "@/components/admin/AdminButton";
import AdminPagination from "@/components/admin/AdminPagination";
import { createAdminListView } from "@/lib/admin-list-params";
import { AdminActionForm } from "@/components/admin/AdminPermissions";
import AdminLink from "@/components/admin/AdminLink";
import { FileText, RotateCcw, Trash2 } from "lucide-react";
import { AdminLinkButton } from "../../../../components/admin/AdminButton";
import { AdminCard, AdminPageHeader } from "../../../../components/admin/AdminCard";
import {
  articleStatusLabels,
  articleTypeLabels,
  formatArticleDate,
  getAdminArticles,
} from "../../../../lib/articles";
import {
  permanentlyDeleteArticleAction,
  restoreArticleFromTrashAction,
} from "../actions";

export default async function ArticleTrashPage({ searchParams }: { searchParams?: Promise<{ page?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const articles = await getAdminArticles({ trashed: true });

  const list = createAdminListView(articles, { basePath: "/admin/articles/trash", params: params, pageSize: 25, pageParam: "page", id: "trash-list" });
  return (
    <div>
      <AdminPageHeader
        eyebrow="Articles"
        title="文章回收站"
        description="已删除的文章会先进入回收站，不再出现在前台、列表页和 sitemap。确认不需要后再永久删除。"
        action={
          <AdminLink
            href="/admin/articles"
            className={adminButtonClassName({variant:"secondary",size:"md",className:""})}
          >
            返回文章列表
          </AdminLink>
        }
      />

      <AdminCard>
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">回收站内容</h2>
            <p className="mt-1 text-sm text-admin-text-muted dark:text-admin-text-muted">
              当前有 {articles.length} 篇文章在回收站。恢复后会回到草稿状态，需要重新发布才会展示。
            </p>
          </div>
        </div>

        <AdminPagination {...list.pagination} ariaLabel="列表分页" className="mb-4" id="trash-list" />
        <div className="overflow-x-auto rounded-xl border border-admin-border dark:border-admin-border-strong">
          <div className="min-w-[920px]">
            <div className="grid grid-cols-[minmax(260px,1.4fr)_110px_110px_150px_180px]
              bg-admin-surface-subtle px-5 py-3 text-xs font-semibold uppercase tracking-wide
              text-admin-text-faint dark:bg-admin-chip">
              <div>标题</div>
              <div>类型</div>
              <div>删除前状态</div>
              <div>删除时间</div>
              <div>操作</div>
            </div>

            <div className="divide-y divide-admin-border bg-admin-surface dark:bg-admin-surface">
              {list.items.map((article) => (
                <div
                  key={article.id}
                  className="grid grid-cols-[minmax(260px,1.4fr)_110px_110px_150px_180px] items-center px-5 py-4 text-sm"
                >
                  <div>
                    <div className="font-semibold text-admin-text dark:text-admin-text">{article.title}</div>
                    <div className="mt-1 font-mono text-xs text-admin-text-faint">
                      /zh/guides/{article.slug}
                    </div>
                    {article.excerpt ? (
                      <div className="mt-2 line-clamp-1 text-xs text-admin-text-muted dark:text-admin-text-muted">
                        {article.excerpt}
                      </div>
                    ) : null}
                  </div>

                  <div className="font-semibold text-admin-text-secondary dark:text-admin-text-secondary">
                    {articleTypeLabels[article.articleType]}
                  </div>

                  <div>
                    <span className="inline-flex rounded-full bg-admin-chip px-2.5 py-1 text-xs font-semibold
                      text-admin-text-secondary ring-1 ring-admin-border
                      dark:bg-admin-chip dark:text-admin-text-secondary">
                      {articleStatusLabels[article.status]}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-admin-text-muted dark:text-admin-text-muted">
                    {formatArticleDate(article.deletedAt)}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <AdminActionForm action={restoreArticleFromTrashAction}>
                      <input type="hidden" name="id" value={article.id} />
                      <button
                        type="submit"
                        className={adminButtonClassName({ variant: "secondary", size: "sm", className: "" })}
                      >
                        <RotateCcw size={13} />
                        恢复
                      </button>
                    </AdminActionForm>
                    <AdminActionForm action={permanentlyDeleteArticleAction} confirmMessage={`永久删除「${article.title}」？此操作不可恢复。`}>
                      <label className="mb-2 flex items-start gap-2 text-xs"><input type="checkbox" name="confirmDelete" required />我确认永久删除，不可恢复</label>
                      <input type="hidden" name="id" value={article.id} />
                      <button
                        type="submit"
                        className={adminButtonClassName({ variant: "danger", size: "sm", className: "" })}
                      >
                        <Trash2 size={13} />
                        永久删除
                      </button>
                    </AdminActionForm>
                  </div>
                </div>
              ))}

              {articles.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <FileText className="mx-auto text-admin-text-secondary" size={36} />
                  <div className="mt-4 text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">
                    回收站是空的。
                  </div>
                  <AdminLinkButton
                    href="/admin/articles"
                    className="mt-5"
                  >
                    返回文章列表
                  </AdminLinkButton>
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
