import Link from "next/link";
import { AdminPageHeader } from "../../../../components/admin/AdminCard";
import { getArticleCategories, getArticleTags } from "../../../../lib/articles";
import { prisma } from "../../../../lib/prisma";
import ArticleForm from "../ArticleForm";

export default async function NewArticlePage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const [categories, tags, products, relatedArticles] = await Promise.all([
    getArticleCategories("ZH"),
    getArticleTags("ZH"),
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
        locale: "ZH",
        status: "PUBLISHED",
        noindex: false,
        deletedAt: null,
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

  return (
    <div>
      <AdminPageHeader
        eyebrow="Articles"
        title="新建文章"
        description="创建可发布到前台指南页的内容。保存为发布状态后，文章会进入指南列表和 sitemap。"
        action={
          <Link href="/admin/articles" className="text-sm font-black text-blue-700 hover:text-blue-900">
            返回文章列表
          </Link>
        }
      />

      {params?.error === "missing" ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          标题和 URL 标识不能为空。
        </div>
      ) : null}

      {params?.error === "slug" ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          这个 URL 标识已经存在，请换一个。
        </div>
      ) : null}

      <ArticleForm
        categories={categories}
        tags={tags}
        products={products}
        relatedArticles={relatedArticles}
      />
    </div>
  );
}
