import Link from "next/link";
import { FileText, RotateCcw, Trash2 } from "lucide-react";
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

export default async function ArticleTrashPage() {
  const articles = await getAdminArticles({ trashed: true });

  return (
    <div>
      <AdminPageHeader
        eyebrow="Articles"
        title="文章回收站"
        description="已删除的文章会先进入回收站，不再出现在前台、列表页和 sitemap。确认不需要后再永久删除。"
        action={
          <Link
            href="/admin/articles"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            返回文章列表
          </Link>
        }
      />

      <AdminCard>
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">回收站内容</h2>
            <p className="mt-1 text-sm text-slate-500">
              当前有 {articles.length} 篇文章在回收站。恢复后会回到草稿状态，需要重新发布才会展示。
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <div className="min-w-[920px]">
            <div className="grid grid-cols-[minmax(260px,1.4fr)_110px_110px_150px_180px] bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-400">
              <div>标题</div>
              <div>类型</div>
              <div>删除前状态</div>
              <div>删除时间</div>
              <div>操作</div>
            </div>

            <div className="divide-y divide-slate-100 bg-white">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="grid grid-cols-[minmax(260px,1.4fr)_110px_110px_150px_180px] items-center px-5 py-4 text-sm"
                >
                  <div>
                    <div className="font-black text-slate-950">{article.title}</div>
                    <div className="mt-1 font-mono text-xs text-slate-400">
                      /zh/guides/{article.slug}
                    </div>
                    {article.excerpt ? (
                      <div className="mt-2 line-clamp-1 text-xs text-slate-500">
                        {article.excerpt}
                      </div>
                    ) : null}
                  </div>

                  <div className="font-bold text-slate-600">
                    {articleTypeLabels[article.articleType]}
                  </div>

                  <div>
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                      {articleStatusLabels[article.status]}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-500">
                    {formatArticleDate(article.deletedAt)}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <form action={restoreArticleFromTrashAction}>
                      <input type="hidden" name="id" value={article.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 text-xs font-black text-blue-700 hover:text-blue-900"
                      >
                        <RotateCcw size={13} />
                        恢复
                      </button>
                    </form>
                    <form action={permanentlyDeleteArticleAction}>
                      <input type="hidden" name="id" value={article.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 text-xs font-black text-rose-600 hover:text-rose-700"
                      >
                        <Trash2 size={13} />
                        永久删除
                      </button>
                    </form>
                  </div>
                </div>
              ))}

              {articles.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <FileText className="mx-auto text-slate-300" size={36} />
                  <div className="mt-4 text-sm font-bold text-slate-500">
                    回收站是空的。
                  </div>
                  <Link
                    href="/admin/articles"
                    className="mt-5 inline-flex rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-800"
                  >
                    返回文章列表
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
