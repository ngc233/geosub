import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { AdminLinkButton } from "@/components/admin/AdminButton";
import { AdminCard, AdminPageHeader } from "@/components/admin/AdminCard";
import { evaluateArticleContentQuality } from "@/lib/article-content-quality";
import { articleStatusLabels, renderArticleMarkdown } from "@/lib/articles";
import { sanitizeArticleHtml } from "@/lib/content-safety";
import { prisma } from "@/lib/prisma";

export default async function ArticlePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await prisma.article.findUnique({
    where: { id },
    include: {
      category: true,
      relations: {
        where: { status: "PUBLISHED" },
        select: { relationType: true },
      },
    },
  });

  if (!article || article.deletedAt) {
    notFound();
  }

  const localePath = article.locale === "EN" ? "en" : "zh";
  const publicPath = `/${localePath}/guides/${article.slug}`;
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
  const html = sanitizeArticleHtml(
    article.bodyHtml || renderArticleMarkdown(article.bodyMarkdown),
  );

  return (
    <div>
      <AdminPageHeader
        eyebrow="Articles"
        title="文章预览"
        description="这是后台预览，不会改变发布状态，也不会向搜索引擎提交页面。"
        action={
          <div className="flex flex-wrap gap-2">
            <AdminLinkButton href={`/admin/articles/${article.id}/edit`} variant="secondary">
              <ArrowLeft size={16} />
              返回编辑
            </AdminLinkButton>
            {article.status === "PUBLISHED" ? (
              <AdminLinkButton href={publicPath}>
                <ExternalLink size={16} />
                打开正式页面
              </AdminLinkButton>
            ) : null}
          </div>
        }
      />

      <div className="mb-6 grid gap-3 md:grid-cols-[1fr_1fr_1fr_2fr]">
        <AdminCard className="p-4">
          <div className="text-xs font-bold text-slate-400">发布状态</div>
          <div className="mt-2 text-sm font-black text-slate-950">
            {articleStatusLabels[article.status]}
          </div>
        </AdminCard>
        <AdminCard className="p-4">
          <div className="text-xs font-bold text-slate-400">内容质量</div>
          <div className="mt-2 text-sm font-black text-slate-950">
            {quality.score}/100 · {quality.statusLabel}
          </div>
        </AdminCard>
        <AdminCard className="p-4">
          <div className="text-xs font-bold text-slate-400">搜索收录</div>
          <div className="mt-2 text-sm font-black text-slate-950">
            {article.noindex ? "暂不收录" : "允许收录"}
          </div>
        </AdminCard>
        <AdminCard className="p-4">
          <div className="text-xs font-bold text-slate-400">下一步</div>
          <div className="mt-2 text-sm font-black text-slate-950">{quality.nextAction}</div>
        </AdminCard>
      </div>

      <article className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-[#faf8f2] p-5 shadow-sm sm:p-8">
        <header className="border-b border-slate-200 pb-7">
          <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-500">
            <span>{article.locale === "EN" ? "English" : "简体中文"}</span>
            <span>·</span>
            <span>{article.category?.name || "未分类"}</span>
            <span>·</span>
            <span>{publicPath}</span>
          </div>
          <h1 className="mt-4 text-3xl font-black text-slate-950 sm:text-4xl">{article.title}</h1>
          {article.subtitle || article.excerpt ? (
            <p className="mt-4 text-base leading-7 text-slate-600">
              {article.subtitle || article.excerpt}
            </p>
          ) : null}
        </header>

        <div
          className="article-body mt-7 rounded-xl border border-slate-200 bg-white p-5 text-slate-700 sm:p-8"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>
    </div>
  );
}
