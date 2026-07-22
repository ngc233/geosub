import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "../../../../../components/admin/AdminCard";
import { getArticleSeoDraft } from "../../../../../lib/article-seo-draft";
import { getArticleCategories, getArticleTags } from "../../../../../lib/articles";
import { prisma } from "../../../../../lib/prisma";
import { generateArticleSeoDraftAction } from "../../actions";
import ArticleForm from "../../ArticleForm";

function normalizeText(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, " ")
    .trim();
}

function keywordParts(...values: Array<string | null | undefined>) {
  return values
    .flatMap((value) => normalizeText(value).split(/\s+/))
    .filter((part) => part.length >= 2);
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    saved?: string;
    created?: string;
    error?: string;
    seoDrafted?: string;
    seoPreview?: string;
  }>;
}) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};

  const article = await prisma.article.findUnique({
    where: {
      id,
    },
    include: {
      tagLinks: {
        include: {
          tag: true,
        },
      },
      relations: true,
    },
  });

  if (!article || article.deletedAt) {
    notFound();
  }

  const [categories, tags, products, relatedArticles] = await Promise.all([
    getArticleCategories(article.locale),
    getArticleTags(article.locale),
    prisma.product.findMany({
      where: {
        status: "PUBLISHED",
      },
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          name: "asc",
        },
      ],
    }),
    prisma.article.findMany({
      where: {
        locale: article.locale,
        status: "PUBLISHED",
        noindex: false,
        deletedAt: null,
        id: {
          not: id,
        },
      },
      include: {
        tagLinks: true,
      },
      orderBy: [
        {
          publishedAt: "desc",
        },
        {
          updatedAt: "desc",
        },
      ],
      take: 30,
    }),
  ]);

  const articleText = normalizeText(
    [
      article.title,
      article.subtitle,
      article.excerpt,
      article.bodyMarkdown,
      article.seoKeywords,
      ...article.tagLinks.map((link) => link.tag.name),
    ].join(" "),
  );
  const selectedTagIds = article.tagLinks.map((link) => link.tagId);

  const scoredProducts = products
    .map((product) => {
      let score = 0;
      const productKeywords = unique(
        keywordParts(product.name, product.slug, product.provider),
      );

      for (const keyword of productKeywords) {
        if (articleText.includes(keyword)) {
          score += keyword.length >= 5 ? 10 : 5;
        }
      }

      if (articleText.includes(normalizeText(product.name))) {
        score += 12;
      }

      return {
        product,
        score,
      };
    })
    .sort((a, b) => b.score - a.score || a.product.sortOrder - b.product.sortOrder);

  const sortedProducts = scoredProducts.map((item) => item.product);
  const recommendedProductIds = scoredProducts
    .filter((item) => item.score > 0)
    .slice(0, 6)
    .map((item) => item.product.id);

  const scoredRelatedArticles = relatedArticles
    .map((candidate) => {
      let score = 0;

      if (article.categoryId && candidate.categoryId === article.categoryId) {
        score += 8;
      }

      const candidateTagIds = candidate.tagLinks.map((link) => link.tagId);
      const sharedTagCount = candidateTagIds.filter((tagId) =>
        selectedTagIds.includes(tagId),
      ).length;
      score += sharedTagCount * 6;

      const titleKeywords = unique(keywordParts(candidate.title, candidate.slug));
      for (const keyword of titleKeywords) {
        if (articleText.includes(keyword)) {
          score += keyword.length >= 5 ? 6 : 3;
        }
      }

      return {
        article: candidate,
        score,
      };
    })
    .sort((a, b) => {
      const publishedDiff =
        (b.article.publishedAt?.getTime() || 0) -
        (a.article.publishedAt?.getTime() || 0);
      return b.score - a.score || publishedDiff;
    });

  const sortedRelatedArticles = scoredRelatedArticles.map((item) => item.article);
  const recommendedRelatedArticleIds = scoredRelatedArticles
    .filter((item) => item.score > 0)
    .slice(0, 6)
    .map((item) => item.article.id);
  const seoDraft = query?.seoPreview === "1" ? await getArticleSeoDraft(article.id) : null;

  return (
    <div>
      <AdminPageHeader
        eyebrow="Articles"
        title="编辑文章"
        description="修改正文、发布状态和 SEO 信息。发布后会自动刷新前台文章页和 sitemap。"
        action={
          <div className="flex gap-3">
            {article.status === "PUBLISHED" && !article.noindex ? (
              <Link
                href={`/${article.locale === "EN" ? "en" : "zh"}/guides/${article.slug}`}
                target="_blank"
                className="text-sm font-black text-slate-700 hover:text-slate-950"
              >
                查看前台
              </Link>
            ) : null}
            <Link href="/admin/articles" className="text-sm font-black text-blue-700 hover:text-blue-900">
              返回列表
            </Link>
          </div>
        }
      />

      {query?.saved === "1" || query?.created === "1" ? (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          已保存。
        </div>
      ) : null}

      {query?.seoDrafted === "1" ? (
        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
          已应用 SEO 草稿。
        </div>
      ) : null}

      {query?.error === "slug" ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          这个 URL 标识已经存在，请换一个。
        </div>
      ) : null}

      <div className="mb-5 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-black text-slate-950">SEO 草稿助手</div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              根据已保存的标题、摘要、正文、分类、标签和内链关系生成 SEO 建议。现在会先预览评分，不会直接覆盖。
            </p>
          </div>
          <Link
            href={`/admin/articles/${article.id}/edit?seoPreview=1`}
            className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-800"
          >
            生成 SEO 草稿预览
          </Link>
        </div>
      </div>

      {seoDraft ? (
        <div className="mb-5 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-base font-black text-slate-950">SEO 草稿预览</h2>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                  评分 {seoDraft.score}/100
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                先核对标题、描述和问题提示，确认后再写入文章 SEO 字段。
              </p>
            </div>
            <div className="flex gap-2">
              <form action={generateArticleSeoDraftAction}>
                <input type="hidden" name="id" value={article.id} />
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-700"
                >
                  应用草稿
                </button>
              </form>
              <Link
                href={`/admin/articles/${article.id}/edit`}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
              >
                取消
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs font-black uppercase text-slate-400">SEO 标题</div>
              <div className="mt-2 text-sm font-bold text-slate-900">{seoDraft.seoTitle}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs font-black uppercase text-slate-400">Canonical</div>
              <div className="mt-2 break-all text-sm font-bold text-slate-900">
                {seoDraft.canonicalUrl}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 md:col-span-2">
              <div className="text-xs font-black uppercase text-slate-400">SEO 描述</div>
              <div className="mt-2 text-sm leading-6 text-slate-700">{seoDraft.seoDescription}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs font-black uppercase text-slate-400">关键词</div>
              <div className="mt-2 text-sm leading-6 text-slate-700">{seoDraft.seoKeywords}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs font-black uppercase text-slate-400">结构化数据</div>
              <div className="mt-2 text-sm font-bold text-slate-900">
                {seoDraft.structuredDataType}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <div className="text-sm font-black text-amber-800">需要留意</div>
              {seoDraft.issues.length > 0 ? (
                <ul className="mt-2 space-y-2 text-sm leading-6 text-amber-800">
                  {seoDraft.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-amber-800">暂未发现明显问题。</p>
              )}
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="text-sm font-black text-emerald-800">已满足</div>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-emerald-800">
                {seoDraft.strengths.map((strength) => (
                  <li key={strength}>{strength}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      <ArticleForm
        article={article}
        categories={categories}
        tags={tags}
        products={sortedProducts}
        relatedArticles={sortedRelatedArticles}
        selectedTagIds={selectedTagIds}
        selectedProductIds={article.relations
          .filter((relation) => relation.relationType === "RELATED_PRODUCT" && relation.productId)
          .map((relation) => relation.productId as string)}
        selectedRelatedArticleIds={article.relations
          .filter((relation) => relation.relationType === "RELATED_ARTICLE" && relation.relatedArticleId)
          .map((relation) => relation.relatedArticleId as string)}
        recommendedProductIds={recommendedProductIds}
        recommendedRelatedArticleIds={recommendedRelatedArticleIds}
      />
    </div>
  );
}
