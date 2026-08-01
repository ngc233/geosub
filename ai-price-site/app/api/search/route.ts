import { ArticleStatus, Locale, Prisma, ProductCategory, PublishStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import {
  getProductSearchAliases,
  getSearchResources,
  scoreSearchText,
  type PublicSearchResult,
} from "../../../lib/public-search";
import { getPricingDetailPath, getPricingPlanPath } from "../../../lib/pricing-routes";
import {
  isPreparedSiteLocale,
  normalizeSiteLocale,
  type PreparedSiteLocale,
} from "../../../lib/site-locale";
import { prisma } from "../../../lib/prisma";
import { getActiveSearchAliases } from "../../../lib/search-aliases";

export const dynamic = "force-dynamic";

const MAX_QUERY_LENGTH = 80;
const MAX_RESULTS = 10;

const getPublishedSearchProducts = unstable_cache(
  async () => prisma.product.findMany({
    where: {
      status: PublishStatus.PUBLISHED,
      category: { in: [ProductCategory.AI, ProductCategory.STREAMING] },
      plans: {
        some: {
          status: PublishStatus.PUBLISHED,
          regionPrices: { some: { status: PublishStatus.PUBLISHED } },
        },
      },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      provider: true,
      description: true,
      officialUrl: true,
      category: true,
      plans: {
        where: {
          status: PublishStatus.PUBLISHED,
          regionPrices: { some: { status: PublishStatus.PUBLISHED } },
        },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          billingCycle: true,
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
  }),
  ["public-search-products-v1"],
  { revalidate: 300 },
);

const getPublishedSearchArticles = unstable_cache(
  async (articleLocale: Locale) => prisma.article.findMany({
    where: {
      locale: articleLocale,
      status: ArticleStatus.PUBLISHED,
      noindex: false,
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      excerpt: true,
    },
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    take: 80,
  }),
  ["public-search-articles-v1"],
  { revalidate: 300 },
);

type PopularSearchRow = {
  query: string;
  search_count: bigint;
};

const getPopularSearches = unstable_cache(
  async (locale: PreparedSiteLocale) => {
    const rows = await prisma.$queryRaw<PopularSearchRow[]>(Prisma.sql`
      SELECT
        (ARRAY_AGG(
          TRIM("metadata"->>'query')
          ORDER BY "created_at" DESC
        ))[1] AS "query",
        COUNT(*) AS "search_count"
      FROM "event_logs"
      WHERE "created_at" >= NOW() - INTERVAL '30 days'
        AND "event_key" = 'search_digital_service'
        AND COALESCE("locale", 'zh') = ${locale}
        AND COALESCE("page_path", '') NOT LIKE '/admin%'
        AND COALESCE("page_path", '') NOT LIKE '%tracking-test%'
        AND LENGTH(TRIM(COALESCE("metadata"->>'query', ''))) BETWEEN 2 AND 40
        AND TRIM(COALESCE("metadata"->>'query', '')) !~* '(@|https?://|www\.)'
      GROUP BY LOWER(TRIM("metadata"->>'query'))
      HAVING COUNT(*) >= 3
        AND COUNT(DISTINCT COALESCE("session_id", "anonymous_id")) >= 2
      ORDER BY COUNT(*) DESC, MAX("created_at") DESC
      LIMIT 6
    `);

    return rows.map((row) => row.query);
  },
  ["public-search-popular-v1"],
  { revalidate: 900 },
);

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

function getArticleLocale(locale: PreparedSiteLocale) {
  if (locale === "zh") return Locale.ZH;
  if (locale === "en") return Locale.EN;
  return null;
}

function getPlanResultTitle(productName: string, planName: string) {
  const normalizedProductName = productName.trim().toLocaleLowerCase();
  const normalizedPlanName = planName.trim().toLocaleLowerCase();

  return normalizedPlanName.startsWith(normalizedProductName)
    ? planName
    : `${productName} ${planName}`;
}

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, MAX_QUERY_LENGTH);
  const requestedLocale = request.nextUrl.searchParams.get("locale");
  const locale: PreparedSiteLocale = isPreparedSiteLocale(requestedLocale)
    ? requestedLocale
    : "zh";

  if (request.nextUrl.searchParams.get("popular") === "1") {
    try {
      return json({ popular: await getPopularSearches(locale) });
    } catch {
      return json({ popular: [] });
    }
  }

  if (query.length < 2) {
    return json({ query, results: [] });
  }

  const articleLocale = getArticleLocale(locale);

  try {
    const [products, articles, controlledAliases] = await Promise.all([
      getPublishedSearchProducts(),
      articleLocale
        ? getPublishedSearchArticles(articleLocale)
        : Promise.resolve([]),
      getActiveSearchAliases(locale),
    ]);

    const normalizedLocale = normalizeSiteLocale(locale);
    const results: PublicSearchResult[] = [];
    const productAliasesById = new Map<string, string[]>();
    const planAliasesById = new Map<string, string[]>();
    for (const alias of controlledAliases) {
      const target = alias.targetKind === "product"
        ? productAliasesById
        : planAliasesById;
      const targetId = alias.targetKind === "product"
        ? alias.productId
        : alias.planId;
      if (!targetId) continue;
      target.set(targetId, [...(target.get(targetId) || []), alias.alias]);
    }

    for (const product of products) {
      const category = product.category === ProductCategory.STREAMING ? "streaming" : "ai";
      const productScore = scoreSearchText(query, [
        product.name,
        product.slug,
        product.provider,
        product.description,
        ...getProductSearchAliases(product.slug),
        ...(productAliasesById.get(product.id) || []),
      ]);

      if (productScore > 0) {
        results.push({
          id: `product:${product.id}`,
          kind: "product",
          title: product.name,
          subtitle: product.provider || (category === "streaming" ? "Streaming" : "AI"),
          href: getPricingDetailPath(normalizedLocale, category, product.slug),
          score: productScore + 20,
          productId: product.id,
          logoSlug: product.slug,
          officialUrl: product.officialUrl || undefined,
          category,
        });
      }

      for (const plan of product.plans) {
        const planScore = scoreSearchText(query, [
          plan.name,
          plan.slug,
          plan.description,
          `${product.name} ${plan.name}`,
          `${product.slug}-${plan.slug}`,
          ...(planAliasesById.get(plan.id) || []),
        ]);

        if (planScore <= 0) continue;

        const resultTitle = getPlanResultTitle(product.name, plan.name);

        results.push({
          id: `plan:${plan.id}`,
          kind: "plan",
          title: resultTitle,
          subtitle: product.name,
          href: getPricingPlanPath(normalizedLocale, category, product.slug, plan.slug),
          score: planScore + 10,
          productId: product.id,
          planId: plan.id,
          logoSlug: product.slug,
          officialUrl: product.officialUrl || undefined,
          category,
        });
      }
    }

    for (const article of articles) {
      const score = scoreSearchText(query, [
        article.title,
        article.subtitle,
        article.excerpt,
        article.slug,
      ]);
      if (score <= 0) continue;

      results.push({
        id: `article:${article.id}`,
        kind: "article",
        title: article.title,
        subtitle: article.subtitle || article.excerpt || "",
        href: `/${locale}/guides/${article.slug}`,
        score,
        articleId: article.id,
      });
    }

    for (const resource of getSearchResources(locale, query)) {
      results.push({
        id: `resource:${resource.id}`,
        kind: resource.kind,
        title: resource.title,
        subtitle: resource.subtitle,
        href: `/${locale}${resource.path}`,
        score: resource.score,
      });
    }

    const uniqueResults = [...new Map(
      results
        .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
        .map((result) => [result.href, result]),
    ).values()].slice(0, MAX_RESULTS);

    return json({ query, results: uniqueResults });
  } catch {
    return json({ query, results: [], unavailable: true }, 503);
  }
}
