import { getChinesePlanDisplayName } from "../../../lib/pricing-labels";
import { type CanvasLocale } from "../../../lib/canvas-ui-copy";
import { isUnifiedPublicLocale } from "../../../lib/public-style-rollout";
import { retiredGuideSlugs } from "../../../lib/public-launch-routes";
import { getPublicPricingProduct } from "../../../lib/pricing-product-store";
import { loadCountryHub } from "../../../lib/cached-country-hub";
import { priorityCountries } from "../../../lib/country-hubs";
import {
  matchChromeSearchCatalog,
  minimumCountrySearchPrice,
  minimumSearchPrice,
  type ChromePopularItem,
  type ChromeSearchCatalogEntry,
  type ChromeSearchIndexPayload,
} from "../../../lib/public-chrome-search";
import { selectCurrentOrLegacyPlans } from "../../../lib/current-plan-scope";
import { ArticleStatus, Locale, Prisma, ProductCategory, PublishStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import {
  getProductSearchAliases,
  getSearchResources,
  scoreSearchText,
  type PublicSearchResult,
} from "../../../lib/public-search";
import { getLocalizedRegionName } from "../../../lib/locale-format";
import { getPricingDetailPath, getPricingPlanPath } from "../../../lib/pricing-routes";
import {
  isPreparedSiteLocale,
  normalizeSiteLocale,
  type PreparedSiteLocale,
} from "../../../lib/site-locale";
import { prisma } from "../../../lib/prisma";
import { PUBLIC_PRICING_NAVIGATION_CACHE_TAG } from "../../../lib/public-pricing-cache";
import { getPlanEditorialIndexingStatus } from "../../../lib/product-editorial-content";
import { getActiveSearchAliases } from "../../../lib/search-aliases";
import { fictionalHomepageSource, isHomepageFixtureEnabled } from "../../../lib/test-fixtures/homepage";
import { getGameMarketName } from "../../../lib/game-catalog-meta";
import { names as gameNames } from "../../../lib/game-offers";
import { readPublishedGameCatalog } from "../../../lib/read-game-offers";

export const dynamic = "force-dynamic";

const MAX_QUERY_LENGTH = 80;
const MAX_RESULTS = 10;

// Chrome uses the same bounded alias catalogue across keystrokes; legacy search is unchanged.
const getChromeSearchAliases = unstable_cache(
  getActiveSearchAliases,
  ["public-chrome-search-aliases-v1"],
  { revalidate: 300 },
);

const getPublishedSearchProducts = unstable_cache(
  async () =>
    prisma.product.findMany({
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
  async (articleLocale: Locale) =>
    prisma.article.findMany({
      where: {
        locale: articleLocale,
        slug: { notIn: [...retiredGuideSlugs] },
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

type TopClickedProductRow = {
  slug: string;
};

const getTopClickedProductSlugs = unstable_cache(
  async (locale: PreparedSiteLocale): Promise<string[]> => {
    try {
      const rows = await prisma.$queryRaw<TopClickedProductRow[]>(Prisma.sql`
        SELECT p."slug" AS "slug"
        FROM "event_logs" e
        JOIN "products" p ON (
          p."id" = e."product_id"
          OR COALESCE(e."metadata"->>'button', '') = p."slug"
          OR COALESCE(e."page_path", '') LIKE ('%/' || p."slug")
          OR COALESCE(e."page_path", '') LIKE ('%/' || p."slug" || '/%')
        )
        WHERE e."created_at" >= NOW() - INTERVAL '30 days'
          AND p."status" = 'published'
          AND p."category" IN ('ai', 'streaming')
          AND COALESCE(e."locale", 'zh') = ${locale}
          AND COALESCE(e."page_path", '') NOT LIKE '/admin%'
          AND COALESCE(e."page_path", '') NOT LIKE '%tracking-test%'
          AND COALESCE(e."source", '') NOT IN ('manual_test', 'affiliate_test')
          AND e."event_key" IN (
            'click_digital_service_card',
            'page_view',
            'select_plan',
            'click_official',
            'click_affiliate'
          )
        GROUP BY p."id", p."slug"
        ORDER BY COUNT(*) DESC, MAX(e."created_at") DESC
        LIMIT 6
      `);
      return rows.map((row) => row.slug);
    } catch {
      return [];
    }
  },
  ["public-chrome-top-clicked-products-v1"],
  { revalidate: 900 },
);

function getPlanResultTitle(productName: string, planName: string) {
  const normalizedProductName = productName.trim().toLocaleLowerCase();
  const normalizedPlanName = planName.trim().toLocaleLowerCase();

  return normalizedPlanName.startsWith(normalizedProductName)
    ? planName
    : `${productName} ${planName}`;
}

const searchLowestTagByLocale: Record<CanvasLocale, string> = {
  zh: "最低",
  "zh-tw": "最低",
  en: "Lowest",
  ja: "最安",
  ko: "최저",
  es: "Mínimo",
};

const searchStoreFallbackByLocale: Record<CanvasLocale, string> = {
  zh: "官方商店",
  "zh-tw": "官方商店",
  en: "Official store",
  ja: "公式ストア",
  ko: "공식 스토어",
  es: "Tienda oficial",
};

const searchEditionByLocale: Record<CanvasLocale, Record<string, string>> = {
  zh: { standard: "标准版", ultimate: "终极版", ps5: "PS5", xbox: "Xbox", pc: "PC" },
  "zh-tw": { standard: "標準版", ultimate: "終極版", ps5: "PS5", xbox: "Xbox", pc: "PC" },
  en: { standard: "Standard", ultimate: "Ultimate", ps5: "PS5", xbox: "Xbox", pc: "PC" },
  ja: { standard: "通常版", ultimate: "アルティメット版", ps5: "PS5", xbox: "Xbox", pc: "PC" },
  ko: { standard: "스탠다드 에디션", ultimate: "얼티밋 에디션", ps5: "PS5", xbox: "Xbox", pc: "PC" },
  es: { standard: "Edición Estándar", ultimate: "Edición Definitiva", ps5: "PS5", xbox: "Xbox", pc: "PC" },
};

function formatCountryFromPlanSubtitle(locale: CanvasLocale, planText: string) {
  switch (locale) {
    case "zh":
    case "zh-tw":
      return `${planText} 起`;
    case "ja":
      return `${planText} から`;
    case "ko":
      return `${planText}부터`;
    case "es":
      return `Desde ${planText}`;
    case "en":
    default:
      return `From ${planText}`;
  }
}

async function buildChromeSearchIndexUncached(
  locale: CanvasLocale,
): Promise<ChromeSearchIndexPayload> {
  const normalizedLocale = normalizeSiteLocale(locale);
  const lowestTag = searchLowestTagByLocale[locale];
  const [products, controlledAliases, clickedSlugs, countryHubs, gameCatalog] = await Promise.all([
    getPublishedSearchProducts(),
    getChromeSearchAliases(locale),
    getTopClickedProductSlugs(locale),
    Promise.allSettled(priorityCountries.map((country) => loadCountryHub(country.code))),
    readPublishedGameCatalog(locale).catch(() => ({ games: [] })),
  ]);

  const productAliasesById = new Map<string, string[]>();
  const planAliasesById = new Map<string, string[]>();
  for (const alias of controlledAliases) {
    const target = alias.targetKind === "product" ? productAliasesById : planAliasesById;
    const targetId = alias.targetKind === "product" ? alias.productId : alias.planId;
    if (!targetId) continue;
    target.set(targetId, [...(target.get(targetId) || []), alias.alias]);
  }

  const detailPairs = await Promise.all(
    products.map(async (p) => [p.slug, await getPublicPricingProduct(p.slug, normalizedLocale)] as const),
  );
  const detailsBySlug = new Map(detailPairs);
  const planLabel = (productName: string, plan: string) =>
    locale === "zh" ? getChinesePlanDisplayName(productName, plan) : plan;

  const entries: ChromeSearchCatalogEntry[] = [];
  const seenProductSlugs = new Set<string>();

  for (const product of products) {
    const detail = detailsBySlug.get(product.slug);
    if (!detail) continue;
    const category = product.category === ProductCategory.STREAMING ? "streaming" : "ai";
    const prodMin = minimumSearchPrice(detail, undefined, normalizedLocale);
    if (prodMin) {
      seenProductSlugs.add(product.slug);
      entries.push({
        id: `product:${product.id}`,
        kind: "product",
        title: product.name,
        subtitle: `${planLabel(detail.name, prodMin.plan)} · ${lowestTag} · ${prodMin.country}`,
        href: getPricingDetailPath(normalizedLocale, category, product.slug),
        minimumUsd: prodMin.usd,
        cycle: prodMin.cycle,
        logoSlug: product.slug,
        terms: [
          product.name,
          product.slug,
          product.provider || "",
          product.description || "",
          ...getProductSearchAliases(product.slug),
          ...(productAliasesById.get(product.id) || []),
        ].filter(Boolean),
      });
    }

    const searchablePlans = selectCurrentOrLegacyPlans(product.plans, (plan) =>
      getPlanEditorialIndexingStatus(product.slug, plan.slug) === "current",
    );
    for (const plan of searchablePlans) {
      const planMin = minimumSearchPrice(detail, plan.slug, normalizedLocale);
      if (!planMin) continue;
      const resultTitle = getPlanResultTitle(product.name, plan.name);
      entries.push({
        id: `plan:${plan.id}`,
        kind: "plan",
        title: planLabel(detail.name, planMin.plan),
        subtitle: `${planLabel(detail.name, planMin.plan)} · ${lowestTag} · ${planMin.country}`,
        href: getPricingPlanPath(normalizedLocale, category, product.slug, plan.slug),
        minimumUsd: planMin.usd,
        cycle: planMin.cycle,
        logoSlug: product.slug,
        terms: [
          resultTitle,
          plan.name,
          plan.slug,
          plan.description || "",
          `${product.name} ${plan.name}`,
          `${product.slug}-${plan.slug}`,
          ...(planAliasesById.get(plan.id) || []),
        ].filter(Boolean),
      });
    }
  }

  const editionMap = searchEditionByLocale[locale];
  for (const game of gameCatalog.games) {
    if (!game.bestVariant || game.bestVariant.lowestUsd === null || seenProductSlugs.has(game.slug)) {
      continue;
    }
    seenProductSlugs.add(game.slug);
    const lowestCountry = game.bestVariant.lowestMarket
      ? getLocalizedRegionName(game.bestVariant.lowestMarket, locale) ?? getGameMarketName(game.bestVariant.lowestMarket)
      : searchStoreFallbackByLocale[locale];
    const gameTitle =
      locale === "zh" || locale === "zh-tw"
        ? game.meta.title
        : game.meta.englishTitle || game.meta.title;
    const platText = editionMap[game.bestVariant.platform] ?? gameNames[game.bestVariant.platform];
    const edText = editionMap[game.bestVariant.edition] ?? gameNames[game.bestVariant.edition];
    entries.push({
      id: `product:${game.id}`,
      kind: "product",
      title: gameTitle,
      subtitle: `${platText} ${edText} · ${lowestTag} · ${lowestCountry}`,
      href: `/${locale}/games/${game.slug}`,
      minimumUsd: game.bestVariant.lowestUsd,
      logoSlug: game.slug,
      terms: [
        game.meta.title,
        game.name,
        game.slug,
        game.meta.englishTitle || "",
        game.meta.publisher,
        ...game.meta.searchAliases,
        ...(productAliasesById.get(game.id) || []),
      ].filter(Boolean),
    });
  }

  // In local dev fixture mode, supplement any missing fictional products so instant
  // search and dynamic brand pills match the homepage & country previews.
  if (isHomepageFixtureEnabled()) {
    const fixture = fictionalHomepageSource();
    const byProduct = new Map<string, typeof fixture.prices>();
    for (const row of fixture.prices) {
      if (row.productSlug === "fictional-no-us" || row.planSlug === "fictional-extra") continue;
      if (seenProductSlugs.has(row.productSlug)) continue;
      const list = byProduct.get(row.productSlug) ?? [];
      list.push(row);
      byProduct.set(row.productSlug, list);
    }
    for (const [slug, rows] of byProduct) {
      const cheapest = [...rows].sort((a, b) => a.amount - b.amount)[0];
      if (!cheapest) continue;
      const minCountry = getLocalizedRegionName(cheapest.countryCode, locale) ?? cheapest.countryCode;
      const href = getPricingDetailPath(normalizedLocale, cheapest.category, slug);
      seenProductSlugs.add(slug);
      entries.push({
        id: `product:fixture-${slug}`,
        kind: "product",
        title: cheapest.productName,
        subtitle: `${planLabel(cheapest.productName, cheapest.planName)} · ${lowestTag} · ${minCountry}`,
        href,
        minimumUsd: cheapest.amount,
        cycle: "monthly",
        logoSlug: slug,
        terms: [cheapest.productName, slug, ...getProductSearchAliases(slug)],
      });
    }
  }

  priorityCountries.forEach((country, index) => {
    const hub = countryHubs[index];
    if (hub.status !== "fulfilled") return;
    const minimum = minimumCountrySearchPrice(hub.value);
    if (!minimum) return;
    const localizedCountryTitle = getLocalizedRegionName(country.code, locale) ?? country.en;
    const planText =
      locale === "zh"
        ? planLabel(minimum.productName, minimum.planName)
        : `${minimum.productName} ${minimum.planName}`;
    entries.push({
      id: `country:${country.code}`,
      kind: "country",
      title: localizedCountryTitle,
      subtitle: formatCountryFromPlanSubtitle(locale, planText),
      href: `/${locale}/countries/${country.slug}`,
      minimumUsd: minimum.usd!,
      cycle: "monthly",
      countryCode: country.code,
      terms: [localizedCountryTitle, country.zh, country.en, country.code, country.slug],
    });
  });

  // Build dynamic popular quick-jump pills ranked by real 30-day clicks/views in event_logs,
  // falling back smoothly to published featured products when click history is sparse.
  const productEntries = entries.filter((entry) => entry.kind === "product");
  const productBySlug = new Map(productEntries.map((entry) => [entry.logoSlug!, entry]));
  const preferredFallbackOrder = ["chatgpt", "netflix", "claude", "youtube-premium", "gemini", "suno"];
  const orderedPopularSlugs = [
    ...clickedSlugs,
    ...preferredFallbackOrder,
    ...productEntries.map((entry) => entry.logoSlug!),
  ].filter(
    (slug, index, arr) =>
      Boolean(slug) && !slug.startsWith("e2e-") && productBySlug.has(slug) && arr.indexOf(slug) === index,
  );

  const popular: ChromePopularItem[] = orderedPopularSlugs.slice(0, 5).map((slug) => {
    const entry = productBySlug.get(slug)!;
    return {
      id: entry.id,
      title: entry.title,
      href: entry.href,
      logoSlug: slug,
    };
  });

  const topCountry = entries.find((entry) => entry.kind === "country");
  if (topCountry) {
    popular.push({
      id: topCountry.id,
      title: topCountry.title,
      href: topCountry.href,
      countryCode: topCountry.countryCode,
    });
  }

  return { entries, popular };
}

const getCachedChromeSearchIndex = unstable_cache(
  buildChromeSearchIndexUncached,
  ["public-chrome-search-index-v3"],
  { revalidate: 300, tags: [PUBLIC_PRICING_NAVIGATION_CACHE_TAG] },
);

async function loadChromeSearchIndex(locale: CanvasLocale): Promise<ChromeSearchIndexPayload> {
  if (isHomepageFixtureEnabled()) {
    return buildChromeSearchIndexUncached(locale);
  }
  return getCachedChromeSearchIndex(locale);
}

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

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, MAX_QUERY_LENGTH);
  const requestedLocale = request.nextUrl.searchParams.get("locale");
  const locale: PreparedSiteLocale = isPreparedSiteLocale(requestedLocale) ? requestedLocale : "zh";

  if (request.nextUrl.searchParams.get("popular") === "1") {
    try {
      return json({ popular: await getPopularSearches(locale) });
    } catch {
      return json({ popular: [] });
    }
  }

  const chrome = isUnifiedPublicLocale(locale) && request.nextUrl.searchParams.get("view") === "chrome";

  if (chrome && isUnifiedPublicLocale(locale) && request.nextUrl.searchParams.get("index") === "1") {
    try {
      const index = await loadChromeSearchIndex(locale);
      return json(index);
    } catch (error) {
      console.warn(
        `[public-search] chrome index unavailable: ${error instanceof Error ? error.message : "unknown_error"}`,
      );
      return json({ entries: [], popular: [], unavailable: true }, 503);
    }
  }

  const minQueryLength = chrome ? 1 : 2;

  if (query.length < minQueryLength) {
    return json({ query, results: [] });
  }

  if (chrome && isUnifiedPublicLocale(locale)) {
    try {
      const index = await loadChromeSearchIndex(locale);
      return json({
        query,
        results: matchChromeSearchCatalog(index.entries, query),
      });
    } catch (error) {
      console.warn(
        `[public-search] chrome query unavailable: ${error instanceof Error ? error.message : "unknown_error"}`,
      );
      return json({ query, results: [], unavailable: true }, 503);
    }
  }

  const articleLocale = getArticleLocale(locale);

  try {
    const [products, articles, controlledAliases] = await Promise.all([
      getPublishedSearchProducts(),
      articleLocale ? getPublishedSearchArticles(articleLocale) : Promise.resolve([]),
      getActiveSearchAliases(locale),
    ]);

    const normalizedLocale = normalizeSiteLocale(locale);
    const results: PublicSearchResult[] = [];
    const productAliasesById = new Map<string, string[]>();
    const planAliasesById = new Map<string, string[]>();
    for (const alias of controlledAliases) {
      const target = alias.targetKind === "product" ? productAliasesById : planAliasesById;
      const targetId = alias.targetKind === "product" ? alias.productId : alias.planId;
      if (!targetId) continue;
      target.set(targetId, [...(target.get(targetId) || []), alias.alias]);
    }

    for (const product of products) {
      const category = product.category === ProductCategory.STREAMING ? "streaming" : "ai";
      const productScore = scoreSearchText(
        query,
        [
          product.name,
          product.slug,
          product.provider,
          product.description,
          ...getProductSearchAliases(product.slug),
          ...(productAliasesById.get(product.id) || []),
        ],
        minQueryLength,
      );

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

      const searchablePlans = selectCurrentOrLegacyPlans(product.plans, (plan) =>
        getPlanEditorialIndexingStatus(product.slug, plan.slug) === "current",
      );
      for (const plan of searchablePlans) {
        const planScore = scoreSearchText(
          query,
          [
            plan.name,
            plan.slug,
            plan.description,
            `${product.name} ${plan.name}`,
            `${product.slug}-${plan.slug}`,
            ...(planAliasesById.get(plan.id) || []),
          ],
          minQueryLength,
        );

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

    const uniqueResults = [
      ...new Map(
        results
          .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
          .map((result) => [result.href, result]),
      ).values(),
    ].slice(0, MAX_RESULTS);

    return json({ query, results: uniqueResults });
  } catch (error) {
    console.warn(
      `[public-search] search query unavailable: ${error instanceof Error ? error.message : "unknown_error"}`,
    );
    return json({ query, results: [], unavailable: true }, 503);
  }
}
