import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import GuideIcon from "./GuideIcon";
import { GuideContents, GuideCopyLink } from "./GuideReadingTools";
import GuideRelatedPrices from "./GuideRelatedPrices";
import { getDefaultArticleQuickTools, getGuideHubCopy } from "../lib/guide-hub-copy";
import type { GuideLink } from "../lib/guide-presentation";
import type { CanvasLocale } from "../lib/canvas-ui-copy";

export default function GuideArticle({
  eyebrow,
  title,
  description,
  metadata,
  children,
  relatedLinks = [],
  relatedLabel,
  quickTools,
  tocEnabled = true,
  locale = "zh",
}: {
  eyebrow: string;
  title: string;
  description?: string | null;
  metadata?: ReactNode;
  children: ReactNode;
  relatedLinks?: GuideLink[];
  relatedLabel?: string;
  quickTools?: GuideLink[];
  tocEnabled?: boolean;
  locale?: CanvasLocale;
}) {
  const copy = getGuideHubCopy(locale);
  const resolvedRelatedLabel = relatedLabel ?? (locale === "en" ? "Related reading" : "相关阅读");
  const resolvedQuickTools = quickTools ?? getDefaultArticleQuickTools(locale, "general");

  return (
    <div className="gs-public-unified gs-guide-scope">
      <div className="gs-guide-article-layout pt-6 pb-10 md:pt-9 md:pb-16 flex flex-col md:grid items-start">
        <header className="gs-guide-article-header min-w-0">
          <div className="gs-guide-breadcrumb mb-3 flex flex-wrap items-center gap-1.5">
            <Link href={`/${locale}/guides`} className="inline-flex items-center gap-1">
              <ArrowLeft size={14} aria-hidden="true" />
              <span>{copy.backToGuides}</span>
            </Link>
            <span aria-hidden="true">/</span>
            <span className="gs-guide-breadcrumb-current">{eyebrow}</span>
          </div>
          <h1 className="font-bold">{title}</h1>
          {metadata && (
            <div className="gs-guide-article-meta gap-y-2 gap-x-4 flex flex-wrap">{metadata}</div>
          )}
        </header>

        <GuideContents enabled={tocEnabled} locale={locale} />

        <article className="gs-guide-article min-w-0 flex flex-col gap-5">
          {description && (
            <aside className="gs-guide-summary p-5 md:py-5 md:pr-6" data-guide-summary>
              <strong>{locale === "en" ? "Key takeaway" : "先说结论"}</strong>
              <p className="mt-2" data-guide-description>
                {description}
              </p>
            </aside>
          )}
          <div className="gs-guide-paper p-5 md:p-8">{children}</div>
        </article>

        <aside className="gs-guide-side w-full gap-3.5 min-w-0 flex flex-col">
          <Suspense fallback={null}>
            <GuideRelatedPrices links={relatedLinks} locale={locale} />
          </Suspense>
          {resolvedQuickTools.length > 0 && (
            <section className="gs-guide-side-tools p-3.5" aria-label={copy.articleQuickToolsTitle}>
              <h2 className="mt-1 mx-2 mb-2">{copy.articleQuickToolsTitle}</h2>
              <div className="gs-guide-side-tools-list flex flex-col gap-1">
                {resolvedQuickTools.map((tool) => (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="gs-guide-price-row flex items-center justify-between gap-2.5 p-2.5"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className="gs-guide-side-icon w-8 h-8 grid place-items-center shrink-0">
                        <GuideIcon icon={tool.icon} size={15} />
                      </span>
                      <span className="flex flex-col gap-0.5 min-w-0">
                        <strong className="font-semibold leading-snug">{tool.title}</strong>
                        {tool.description && <small className="leading-snug">{tool.description}</small>}
                      </span>
                    </span>
                    <ArrowRight size={14} className="shrink-0" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          )}
          <GuideCopyLink locale={locale} />
        </aside>
      </div>

      {relatedLinks.length > 0 && (
        <section className="gs-guide-related pt-8 pb-10 md:pt-10 md:pb-18">
          <h2 className="mb-4">{resolvedRelatedLabel}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {relatedLinks.map((link, i) => (
              <Link
                key={`${link.href}-${i}`}
                href={link.href}
                className="gs-guide-related-card p-5 flex flex-col gap-2.5"
                data-gs-motion-card
              >
                {link.badge && (
                  <span className="gs-guide-related-head flex items-center gap-2">
                    <span className="gs-guide-side-icon w-7 h-7 grid place-items-center shrink-0">
                      <GuideIcon icon={link.icon} size={14} />
                    </span>
                    <span className="gs-guide-card-pill">{link.badge}</span>
                  </span>
                )}
                <strong>{link.title}</strong>
                {link.description && <p className="gs-guide-related-desc">{link.description}</p>}
                <span className="gs-guide-card-cta gs-guide-caption mt-auto pt-2 inline-flex items-center gap-1">
                  <span>{copy.readArticleCta}</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
