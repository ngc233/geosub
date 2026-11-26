import Link from "next/link";
import { ArrowLeft, ArrowRight, CircleHelp } from "lucide-react";
import type { ReactNode } from "react";
import GuideCards from "./GuideCards";
import GuideIcon from "./GuideIcon";
import { inferGuideIcon, type GuideCard } from "../lib/guide-presentation";
import { getGuideHubCopy } from "../lib/guide-hub-copy";
import type { CanvasLocale } from "../lib/canvas-ui-copy";

export default function GuideCollection({
  eyebrow,
  title,
  description,
  cards,
  emptyText,
  showBack = true,
  steps = [],
  navigation,
  locale = "zh",
}: {
  eyebrow: string;
  title: string;
  description?: string | null;
  cards: GuideCard[];
  emptyText: string;
  showBack?: boolean;
  steps?: GuideCard[];
  navigation?: ReactNode;
  locale?: CanvasLocale;
}) {
  const copy = getGuideHubCopy(locale);
  const isMainHub = !showBack;
  const showEditorialSection = cards.length > 0 || !isMainHub;
  const heroPills = isMainHub
    ? cards.length > 0
      ? [...copy.heroHighlights.slice(0, 3), copy.dynamicArticlesCount(cards.length)]
      : copy.heroHighlights
    : [];

  return (
    <div className="gs-public-unified gs-guide-scope">
      <div className="gs-guide-index pt-6 pb-10 gap-6 md:pt-10 md:pb-18 md:gap-9 flex flex-col">
        {steps.length > 0 && (
          <link
            rel="preload"
            href={new URL("../assets/fonts/web/geosub-price-numerals-700.woff2", import.meta.url).href}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        )}

        <header className="gs-guide-index-intro">
          {showBack && (
            <Link href={`/${locale}/guides`} className="gs-guide-back inline-flex items-center gap-1.5 mb-3">
              <ArrowLeft size={15} aria-hidden="true" />
              <span>{copy.backToGuides}</span>
            </Link>
          )}
          <div className="mb-3">
            <span className="gs-guide-eyebrow">
              <i aria-hidden="true" />
              {eyebrow}
            </span>
          </div>
          <h1 className="mb-3">{title}</h1>
          {description && <p>{description}</p>}
          {heroPills.length > 0 && (
            <ul className="gs-guide-hero-highlights mt-4 flex flex-wrap gap-2" aria-label={eyebrow}>
              {heroPills.map((pill) => (
                <li key={pill} className="gs-guide-hero-pill">
                  {pill}
                </li>
              ))}
            </ul>
          )}
        </header>

        {steps.length > 0 && (
          <section className="gs-guide-start" aria-labelledby="gs-guide-playbook-heading">
            <div className="gs-guide-start-head mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <span className="gs-guide-start-kicker">{copy.startKicker}</span>
                <h2 id="gs-guide-playbook-heading">{copy.startTitle}</h2>
              </div>
              <span className="gs-guide-caption">{copy.startMeta}</span>
            </div>

            <div className="gs-guide-steps grid grid-cols-1 md:grid-cols-2 gap-4">
              {steps.map((step, index) => {
                const iconKey = inferGuideIcon(step);
                const stepNumber = String(index + 1).padStart(2, "0");
                return (
                  <Link
                    key={step.href}
                    href={step.href}
                    className="gs-guide-step p-5 md:p-5.5 flex flex-col gap-2.5"
                    data-gs-motion-card
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          data-gs-ui="tag"
                          className="gs-guide-step-number basis-7 shrink-0 inline-flex items-center justify-center w-7 h-7"
                          aria-hidden="true"
                        >
                          {stepNumber}
                        </span>
                        <span className="gs-guide-step-category">{step.category}</span>
                      </div>
                      <span className="gs-guide-step-icon w-8 h-8 grid place-items-center shrink-0">
                        <GuideIcon icon={iconKey} size={17} />
                      </span>
                    </div>

                    <strong className="gs-guide-step-title leading-snug">{step.title}</strong>

                    {step.description && (
                      <p className="gs-guide-step-desc leading-relaxed">{step.description}</p>
                    )}

                    <div className="gs-guide-step-footer gs-guide-caption mt-auto pt-2 flex items-center justify-between gap-3">
                      <span>
                        {step.minutes ? copy.minutesLabel(step.minutes) : null}
                        {step.minutes && step.sectionsCount ? " · " : null}
                        {step.sectionsCount ? copy.checkpointsLabel(step.sectionsCount) : null}
                      </span>
                      <span className="gs-guide-card-cta inline-flex items-center gap-1">
                        <span>{copy.stepReadCta}</span>
                        <ArrowRight size={15} aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {showEditorialSection && (
          <GuideCards
            cards={cards}
            emptyText={emptyText}
            locale={locale}
            heading={isMainHub ? copy.editorialTitle : copy.collectionTitle}
          />
        )}

        {navigation}

        {isMainHub && (
          <section className="gs-guide-bridges" aria-labelledby="gs-guide-bridges-heading">
            <div className="gs-guide-bridges-head mb-4">
              <span className="gs-guide-bridges-kicker">{copy.bridgesKicker}</span>
              <h2 id="gs-guide-bridges-heading">{copy.bridgesTitle}</h2>
              <p className="mt-1">{copy.bridgesSubtitle}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {copy.bridges.map((bridge) => (
                <Link
                  key={bridge.href}
                  href={bridge.href}
                  className="gs-guide-bridge-card p-4.5 flex flex-col gap-2.5"
                  data-gs-motion-card
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="gs-guide-card-icon w-9 h-9 grid place-items-center shrink-0">
                      <GuideIcon icon={bridge.icon} size={18} />
                    </span>
                    {bridge.badge && <span className="gs-guide-card-pill">{bridge.badge}</span>}
                  </div>
                  <strong className="gs-guide-bridge-title">{bridge.title}</strong>
                  {bridge.description && <p className="gs-guide-bridge-desc">{bridge.description}</p>}
                  <span className="gs-guide-card-cta gs-guide-caption mt-auto pt-1 inline-flex items-center gap-1">
                    <span>{bridge.title}</span>
                    <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <aside className="gs-guide-contact p-5 md:py-5.5 md:px-6.5 flex-wrap md:flex-nowrap flex items-center gap-5">
          <span className="gs-guide-contact-icon w-10 h-10 grid place-items-center shrink-0">
            <CircleHelp size={20} aria-hidden="true" />
          </span>
          <div className="flex-1 min-w-0">
            <strong>{copy.contactTitle}</strong>
            <p className="mt-0.5">{copy.contactBody}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <Link
              href={copy.contactSecondaryHref}
              className="gs-guide-secondary-link flex-1 md:flex-none justify-center"
              data-gs-ui="button"
            >
              {copy.contactSecondaryLabel}
            </Link>
            <Link
              href={copy.contactPrimaryHref}
              className="gs-guide-primary-link flex-1 md:flex-none justify-center"
              data-gs-ui="button"
            >
              {copy.contactPrimaryLabel}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
