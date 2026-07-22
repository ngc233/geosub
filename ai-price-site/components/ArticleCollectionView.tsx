import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  formatArticleDate,
  getArticleTypeLabel,
  type ArticleListItem,
} from "../lib/articles";
import type { SiteLocale } from "../lib/site-locale";

export default function ArticleCollectionView({
  eyebrow,
  title,
  description,
  articles,
  emptyText,
  locale = "zh",
  showBack = true,
  categories = [],
  tags = [],
}: {
  eyebrow: string;
  title: string;
  description?: string | null;
  articles: ArticleListItem[];
  emptyText: string;
  locale?: SiteLocale;
  showBack?: boolean;
  categories?: Array<{ id: string; slug: string; name: string }>;
  tags?: Array<{ id: string; slug: string; name: string }>;
}) {
  const featured = articles[0] || null;
  const rest = featured ? articles.slice(1) : articles;
  const guidesPath = `/${locale}/guides`;
  const copy =
    locale === "en"
      ? {
          back: "Back to guides",
          minutes: "min read",
          read: "Read article",
          categories: "Browse categories",
          tags: "Popular tags",
        }
      : {
          back: "返回指南",
          minutes: "分钟读完",
          read: "阅读全文",
          categories: "按分类浏览",
          tags: "热门标签",
        };

  return (
    <main className="min-h-screen bg-[#faf8f2] px-5 py-16">
      <section className="mx-auto max-w-6xl">
        {showBack ? (
          <Link href={guidesPath} className="text-sm font-black text-blue-700 hover:text-blue-900">
            {copy.back}
          </Link>
        ) : null}

        <div className={showBack ? "mt-8 max-w-3xl" : "max-w-3xl"}>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-5 text-lg leading-8 text-zinc-600">{description}</p>
          ) : null}
        </div>

        {categories.length > 0 || tags.length > 0 ? (
          <section className="mt-10 grid gap-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-950/[0.03] md:grid-cols-2">
            {categories.length > 0 ? (
              <div>
                <h2 className="text-base font-black text-zinc-950">{copy.categories}</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`${guidesPath}/category/${category.slug}`}
                      className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-bold text-zinc-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {tags.length > 0 ? (
              <div>
                <h2 className="text-base font-black text-zinc-950">{copy.tags}</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {tags.slice(0, 18).map((tag) => (
                    <Link
                      key={tag.id}
                      href={`${guidesPath}/tag/${tag.slug}`}
                      className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                    >
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {featured ? (
          <Link
            href={`${guidesPath}/${featured.slug}`}
            className="mt-10 block rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm shadow-zinc-950/[0.03] transition hover:-translate-y-0.5 hover:shadow-md md:p-9"
          >
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-zinc-500">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                {getArticleTypeLabel(featured.articleType, locale)}
              </span>
              <span>{formatArticleDate(featured.publishedAt, locale)}</span>
              <span>{featured.readingTime || 1} {copy.minutes}</span>
              {featured.category ? <span>{featured.category.name}</span> : null}
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-tight text-zinc-950">
              {featured.title}
            </h2>
            {featured.excerpt ? (
              <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-600">
                {featured.excerpt}
              </p>
            ) : null}
            <div className="mt-7 inline-flex items-center gap-2 text-sm font-black text-blue-700">
              {copy.read} <ArrowRight size={16} />
            </div>
          </Link>
        ) : (
          <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm font-bold text-zinc-500">
            {emptyText}
          </div>
        )}

        {rest.length > 0 ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((article) => (
              <Link
                key={article.id}
                href={`${guidesPath}/${article.slug}`}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-950/[0.03] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-zinc-500">
                  <span>{getArticleTypeLabel(article.articleType, locale)}</span>
                  <span>·</span>
                  <span>{formatArticleDate(article.publishedAt, locale)}</span>
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
