import type { Metadata } from "next";
import Link from "next/link";
import GuideCollection from "../../../components/GuideCollection";
import { guideHubExcludedArticleSlugs } from "../../../components/CoreGuideHub";
import {
  formatArticleDate,
  getArticleTypeLabel,
  getPublishedArticleCategories,
  getPublishedArticleTags,
  getPublishedArticles,
} from "../../../lib/articles";
import { loadCoreGuideHubStates } from "../../../lib/core-guide-cms";
import {
  buildFoundationalGuideSteps,
  getGuideHubCopy,
} from "../../../lib/guide-hub-copy";
import { getLocaleRobotsPolicy } from "../../../lib/seo-indexing-policy";

export const metadata: Metadata = {
  title: "구독 및 지역별 가격 가이드",
  description:
    "디지털 구독 서비스, 지역별 가격, 환율 기준, 세금 규정, 결제 조건 및 도구 비교에 대한 실용 가이드를 확인하세요.",
  robots: getLocaleRobotsPolicy("ko"),
};

export default async function KoreanGuidesPage() {
  const [articles, categories, tags, states] = await Promise.all([
    getPublishedArticles("KO"),
    getPublishedArticleCategories("KO"),
    getPublishedArticleTags("KO"),
    loadCoreGuideHubStates("ko"),
  ]);
  const copy = getGuideHubCopy("ko");
  const editorialArticles = articles.filter(
    (article) => !guideHubExcludedArticleSlugs.has(article.slug),
  );

  const core = buildFoundationalGuideSteps("ko", (slug) => {
    const state = states.get(slug);
    return !state?.managed || state.published;
  });

  const cards = editorialArticles.map((article) => ({
    href: `/ko/guides/${article.slug}`,
    title: article.title,
    description: article.excerpt,
    category: article.category?.name || getArticleTypeLabel(article.articleType, "ko"),
    date: formatArticleDate(article.publishedAt, "ko"),
    minutes: article.readingTime,
  }));

  const hasTaxonomy = categories.length > 0 || tags.length > 0;

  return (
    <GuideCollection
      locale="ko"
      eyebrow={copy.hubEyebrow}
      title={copy.hubTitle}
      description={copy.hubDescription}
      cards={cards}
      steps={core}
      emptyText="현재 추가로 게시된 한국어 심층 가이드가 없습니다."
      showBack={false}
      navigation={
        hasTaxonomy ? (
          <section className="gs-guide-taxonomy p-4.5 md:p-5 flex flex-col gap-3">
            {categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="gs-guide-taxonomy-label">{copy.taxonomyCategoriesLabel}</span>
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/ko/guides/category/${category.slug}`}
                    className="gs-guide-taxonomy-pill"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="gs-guide-taxonomy-label">{copy.taxonomyTagsLabel}</span>
                {tags.slice(0, 18).map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/ko/guides/tag/${tag.slug}`}
                    className="gs-guide-taxonomy-tag"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}
          </section>
        ) : undefined
      }
    />
  );
}
