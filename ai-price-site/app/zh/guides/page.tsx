import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  articleTypeLabels,
  formatArticleDate,
  getPublishedArticleCategories,
  getPublishedArticleTags,
  getPublishedArticles,
} from "../../../lib/articles";

export const metadata: Metadata = {
  title: "GeoSub 指南 - 数字订阅价格、支付与账号教程",
  description:
    "GeoSub 指南汇总数字订阅价格、地区订阅、礼品卡、支付方式、账号注册和 AI 工具测评内容。",
};

const fallbackCategories = [
  {
    title: "价格指南",
    description: "了解不同数字服务在各地区的价格差异、省钱区域和价格变化。",
  },
  {
    title: "地区订阅",
    description: "整理不同国家和地区的订阅可用性、支付限制和使用注意事项。",
  },
  {
    title: "支付与账号",
    description: "整理跨区支付、账号注册、账单地址和订阅风控相关内容。",
  },
];

export default async function GuidesPage() {
  const [articles, categories, tags] = await Promise.all([
    getPublishedArticles("ZH"),
    getPublishedArticleCategories("ZH"),
    getPublishedArticleTags("ZH"),
  ]);
  const featured = articles[0] || null;
  const rest = featured ? articles.slice(1) : articles;

  return (
    <main className="min-h-screen bg-[#faf8f2] px-5 py-16">
      <section className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
            Guides
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
            GeoSub 指南
          </h1>
          <p className="mt-5 text-lg leading-8 text-zinc-600">
            用数据解释全球数字订阅价格差异，整理 AI 工具、支付方式、地区订阅和价格方法论。
          </p>
        </div>

        {categories.length > 0 || tags.length > 0 ? (
          <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-950/[0.03]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              {categories.length > 0 ? (
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-black text-zinc-950">按分类浏览</h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <Link
                        key={category.id}
                        href={`/zh/guides/category/${category.slug}`}
                        className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-bold text-zinc-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        {category.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {tags.length > 0 ? (
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-black text-zinc-950">热门标签</h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tags.slice(0, 18).map((tag) => (
                      <Link
                        key={tag.id}
                        href={`/zh/guides/tag/${tag.slug}`}
                        className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                      >
                        #{tag.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {featured ? (
          <Link
            href={`/zh/guides/${featured.slug}`}
            className="mt-10 grid overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-950/[0.03] transition hover:-translate-y-0.5 hover:shadow-md md:grid-cols-[minmax(0,1fr)_320px]"
          >
            <div className="p-7 md:p-9">
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-zinc-500">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                  推荐阅读
                </span>
                <span>{articleTypeLabels[featured.articleType]}</span>
                <span>{formatArticleDate(featured.publishedAt)}</span>
                <span>{featured.readingTime || 1} 分钟读完</span>
              </div>
              <h2 className="mt-5 text-3xl font-black tracking-tight text-zinc-950">
                {featured.title}
              </h2>
              {featured.excerpt ? (
                <p className="mt-4 text-base leading-8 text-zinc-600">{featured.excerpt}</p>
              ) : null}
              <div className="mt-7 inline-flex items-center gap-2 text-sm font-black text-blue-700">
                阅读全文 <ArrowRight size={16} />
              </div>
            </div>
            <div className="min-h-56 bg-gradient-to-br from-slate-900 via-blue-900 to-emerald-700" />
          </Link>
        ) : (
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {fallbackCategories.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-950/[0.03]"
              >
                <h2 className="text-lg font-black text-zinc-950">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{item.description}</p>
              </article>
            ))}
          </div>
        )}

        {rest.length > 0 ? (
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((article) => (
              <Link
                key={article.id}
                href={`/zh/guides/${article.slug}`}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-950/[0.03] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-zinc-500">
                  <span>{articleTypeLabels[article.articleType]}</span>
                  <span>·</span>
                  <span>{formatArticleDate(article.publishedAt)}</span>
                </div>
                <h2 className="mt-4 text-xl font-black leading-snug text-zinc-950">
                  {article.title}
                </h2>
                {article.excerpt ? (
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-500">
                    {article.excerpt}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
