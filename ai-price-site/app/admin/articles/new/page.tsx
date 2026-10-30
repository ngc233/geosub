import { safeAdminReturnTo } from "@/lib/admin-workflow-context";
import AdminSegmentedControl from "@/components/admin/AdminSegmentedControl";
import AdminLink from "@/components/admin/AdminLink";
import type { Locale } from "@prisma/client";
import { AdminPageHeader } from "../../../../components/admin/AdminCard";
import { getArticleCategories, getArticleTags } from "../../../../lib/articles";
import { prisma } from "../../../../lib/prisma";
import ArticleForm from "../ArticleForm";

export default async function NewArticlePage({
  searchParams,
}: {
  searchParams?: Promise<{
    returnTo?:string;
    brief?: string;
    error?: string;
    locale?: string;
    opportunity?: string;
    topic?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const locale: Locale = params.locale === "EN" ? "EN" : "ZH";
  const [categories, tags, products, relatedArticles] = await Promise.all([
    getArticleCategories(locale),
    getArticleTags(locale),
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
        locale,
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
          <div className="flex flex-wrap items-center gap-3">
            <AdminSegmentedControl ariaLabel="内容语言" value={locale} items={[
              {value:"ZH",label:"中文",href:"/admin/articles/new?locale=ZH"},
              {value:"EN",label:"English",href:"/admin/articles/new?locale=EN"}
            ]} />
            <AdminLink href="/admin/articles" className="text-sm font-medium text-admin-accent hover:underline">
              返回文章列表
            </AdminLink>
          </div>
        }
      />

      {params?.error === "missing" ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          标题和 URL 标识不能为空。
        </div>
      ) : null}

      {params?.error === "slug" ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          这个 URL 标识已经存在，请换一个。
        </div>
      ) : null}

      <ArticleForm
        returnTo={safeAdminReturnTo(params.returnTo,"/admin/articles")}
        defaultLocale={locale}
        defaultTitle={params.topic?.slice(0, 160) || ""}
        defaultExcerpt={params.brief?.slice(0, 300) || ""}
        searchOpportunityQuery={params.opportunity?.slice(0, 240) || ""}
        categories={categories}
        tags={tags}
        products={products}
        relatedArticles={relatedArticles}
      />
    </div>
  );
}
