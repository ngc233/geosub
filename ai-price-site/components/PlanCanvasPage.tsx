import Link from "next/link";
import type { ReactNode } from "react";
import type { SubscriptionProduct, ProductPlan } from "../lib/public-pricing-model";
import type { PlanAffordabilityRow } from "../lib/affordability";
import type { ExchangeRateSnapshot } from "../lib/exchange-rates";
import type { getProductEditorialContent } from "../lib/product-editorial-content";
import type { PlanBillingContent } from "../lib/plan-billing-content";
import { planWorkHours, planIncomeSources, planDistribution } from "../lib/plan-canvas";
import { homepageDisplayRates } from "../lib/homepage-summary";
import { getCoreGuideDefinition } from "../lib/core-guide-content";
import { publicBillingLabel } from "../lib/public-price-format";
import { getPricingChannelLabel } from "../lib/pricing-page-facts";
import { getChinesePlanDisplayName, getPlanDisplayName, getPlanTabLabel } from "../lib/pricing-labels";
import { getPricingDetailPath, getPricingPlanPath } from "../lib/pricing-routes";
import { formatPublicDate } from "../lib/public-date";
import { canvasIntlLocale, canvasUiCopy, type CanvasLocale } from "../lib/canvas-ui-copy";
import PublicIcon from "./PublicIcon";
import TrackedLink from "./analytics/TrackedLink";
import PlanCanvasPricing, { PlanKeycapSwitcher, PlanWorkRows } from "./PlanCanvasPricing";

type PlanEditorialData = {
  content: NonNullable<ReturnType<typeof getProductEditorialContent>>;
  billing?: PlanBillingContent | null;
};

export default function PlanCanvasPage({
  product,
  plan,
  title,
  description,
  rates,
  incomes,
  basePath,
  backLabel,
  schema,
  eligibility,
  editorial,
  pilots,
  faq,
  navigation,
  reference,
  locale = "zh",
}: {
  product: SubscriptionProduct;
  plan: ProductPlan;
  title: string;
  description: string;
  rates: Record<string, ExchangeRateSnapshot>;
  incomes: PlanAffordabilityRow[];
  basePath: string;
  backLabel: string;
  schema: ReactNode;
  eligibility: ReactNode;
  editorial: PlanEditorialData | null;
  pilots: ReactNode;
  faq: ReactNode;
  navigation: ReactNode;
  reference: ReactNode;
  locale?: CanvasLocale;
}) {
  const copy = canvasUiCopy[locale];
  const intlLocale = canvasIntlLocale(locale);
  const guides = (["payment-account", "price-guide", "methodology"] as const).map((slug) => ({
    ...getCoreGuideDefinition(locale, slug),
    href: `/${locale}/guides/${slug}`,
  }));
  const work = planWorkHours(plan, incomes);
  const { us, lowest } = planDistribution(plan);
  const sources = planIncomeSources(work.rows);
  const displayPlanName =
    locale === "en"
      ? getPlanDisplayName(product.name, plan.name)
      : getChinesePlanDisplayName(product.name, plan.name);
  const name = getPlanTabLabel(product.name, displayPlanName);
  const updated = formatPublicDate(plan.freshness?.priceCollectedAt, new Date(), locale);
  const categoryKey = basePath.includes("streaming-pricing")
    ? "streaming"
    : basePath.includes("software-pricing")
      ? "software"
      : "ai";
  const overviewHref = getPricingDetailPath(locale, categoryKey, product.slug);
  const editorialLead = editorial?.content.plan.difference
    .trim()
    .split(/[。.!?！？]/u, 1)[0]
    ?.trim();
  const channelLabel = getPricingChannelLabel(plan);
  const conciseDescription =
    plan.regions.length > 0
      ? copy.plan.conciseDesc(editorialLead, plan.regions.length, channelLabel, work.rows.length >= 3)
      : description;
  const displayRates = homepageDisplayRates(rates);

  const keycapOptions = product.plans.map((option) => {
    const optDisplay =
      locale === "en"
        ? getPlanDisplayName(product.name, option.name)
        : getChinesePlanDisplayName(product.name, option.name);
    const label = getPlanTabLabel(product.name, optDisplay);
    if (!option.regions.length) {
      return {
        slug: option.slug,
        label,
        href: null,
        minUsd: null,
        hasDiscount: false,
        disabledHint:
          option.priceStatus === "pending"
            ? copy.plan.disabledPending
            : copy.plan.disabledUnavailable,
      };
    }
    const minUsd = Math.min(...option.regions.map((region) => region.priceUsd));
    const usRegion = option.regions.find((region) => region.code.toUpperCase() === "US");
    return {
      slug: option.slug,
      label,
      href: getPricingPlanPath(locale, categoryKey, product.slug, option.slug),
      minUsd,
      hasDiscount: Boolean(usRegion && minUsd < usRegion.priceUsd),
    };
  });

  return (
    <div className="gs-public-unified gs-plan-scope">
      <div className="gs-plan-page gs-pricing-layout">
        <div className="gs-pricing-navigation" role="region" aria-label={copy.common.productNavAria}>
          {navigation}
        </div>
        <div className="gs-plan-content">
          <link
            rel="preload"
            href={new URL("../assets/fonts/web/geosub-price-numerals-700.woff2", import.meta.url).href}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
          {schema}
          <nav className="gs-plan-breadcrumb" aria-label={copy.common.breadcrumbAria}>
            <Link href={basePath}>{backLabel}</Link>
            <span aria-hidden="true">/</span>
            <Link href={overviewHref}>{product.name}</Link>
            <span aria-hidden="true">/</span>
            <span>{name}</span>
          </nav>
          <header className="gs-plan-intro">
            <div className="gs-plan-title-row">
              <div className="gs-plan-title-block">
                <h1>{title}</h1>
                <p>
                  {copy.plan.metaLine(
                    channelLabel,
                    publicBillingLabel(plan.billing, intlLocale),
                    plan.regions.length,
                  )}
                  {updated && (
                    <>
                      {" "}
                      ·{" "}
                      {locale === "en" ? (
                        <>
                          {copy.plan.collectedSuffix}{" "}
                          <time dateTime={updated.dateTime}>{updated.text}</time>
                        </>
                      ) : (
                        <>
                          <time dateTime={updated.dateTime}>{updated.text}</time>
                          {copy.plan.collectedSuffix}
                        </>
                      )}
                    </>
                  )}
                </p>
              </div>
              {product.plans.length > 1 && (
                <PlanKeycapSwitcher
                  locale={locale}
                  overviewHref={overviewHref}
                  productSlug={product.slug}
                  activeSlug={plan.slug}
                  options={keycapOptions}
                  rates={displayRates}
                />
              )}
            </div>
            <p className="gs-plan-description">{conciseDescription}</p>
          </header>

          <PlanCanvasPricing
            locale={locale}
            plan={plan}
            product={{
              name: product.name,
              slug: product.slug,
              brand: product.brand,
              updatedAt: product.updatedAt,
            }}
            rates={displayRates}
            rateDates={Object.fromEntries(
              Object.entries(rates).map(([code, rate]) => [code, rate.rateDate]),
            )}
          />

          {editorial && (
            <section className="gs-plan-panel gs-canvas-editorial" aria-labelledby="plan-editorial-title">
              <div className="gs-canvas-editorial-head">
                <h2 id="plan-editorial-title">{copy.plan.editorialHeading(name)}</h2>
                <TrackedLink
                  href={editorial.content.plan.sourceUrl}
                  eventKey="click_official"
                  eventName="Open official plan guide"
                  buttonKey={`${product.slug}-plan-guide`}
                  placement="plan_editorial"
                  target="_blank"
                  rel="noreferrer"
                  className="gs-canvas-editorial-source"
                >
                  {editorial.content.sourceLabel}
                  <PublicIcon name="ExternalLink" size={16} />
                </TrackedLink>
              </div>
              <div className="gs-canvas-editorial-grid">
                <div className="gs-canvas-editorial-item">
                  <h3>{editorial.content.bestForLabel}</h3>
                  <p>{editorial.content.plan.bestFor}</p>
                </div>
                <div className="gs-canvas-editorial-item">
                  <h3>{editorial.content.differenceLabel}</h3>
                  <p>{editorial.content.plan.difference}</p>
                </div>
              </div>
              {editorial.billing ? (
                <div className="gs-canvas-editorial-billing">
                  <h3>{editorial.billing.title}</h3>
                  <p>{editorial.billing.body}</p>
                  <div className="gs-canvas-editorial-links">
                    {editorial.billing.sources.map((source, index) => (
                      <TrackedLink
                        key={source.href}
                        href={source.href}
                        eventKey="click_official"
                        eventName="Open official billing guide"
                        buttonKey={`${product.slug}-billing-guide-${index + 1}`}
                        placement="plan_editorial"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {source.label}
                        <PublicIcon name="ExternalLink" size={16} />
                      </TrackedLink>
                    ))}
                  </div>
                </div>
              ) : null}
              {editorial.content.plan.availabilityNote ? (
                <p className="gs-canvas-editorial-note">
                  <strong>
                    {editorial.content.availabilityLabel}
                    {locale === "en" ? ": " : "："}
                  </strong>
                  {editorial.content.plan.availabilityNote}
                </p>
              ) : null}
            </section>
          )}

          {work.rows.length >= 3 && (
            <section className="gs-plan-panel gs-plan-work" aria-labelledby="plan-work-title">
              <div>
                <h2 id="plan-work-title">{copy.plan.workHeading}</h2>
                <p>{copy.plan.workDesc}</p>
                <p className="gs-plan-work-note">{copy.plan.workNote}</p>
                <small>{copy.plan.workFootnote}</small>
              </div>
              <PlanWorkRows
                locale={locale}
                rows={work.rows}
                rates={homepageDisplayRates(rates)}
                usPrice={us?.priceUsd}
                lowestCode={lowest?.code}
              />
              <div className="gs-plan-work-sources">
                {sources.map((group) => (
                  <small key={group.source}>
                    {copy.plan.sourcePrefix}
                    {group.source}
                    {sources.length > 1 && (
                      <>
                        {locale === "en"
                          ? ` (${group.countries.join(copy.plan.countryJoiner)})`
                          : `（${group.countries.join(copy.plan.countryJoiner)}）`}
                      </>
                    )}
                  </small>
                ))}
              </div>
            </section>
          )}

          {pilots}

          <div className="gs-plan-guidance" data-has-notes={Boolean(eligibility)}>
            <section className="gs-plan-panel gs-plan-buy">
              <div className="gs-plan-buy-intro">
                <div>
                  <h2>{copy.plan.howToBuyHeading}</h2>
                  <p>{guides[0].description}</p>
                </div>
                <div className="gs-plan-official">
                  <span>{copy.plan.officialPricingRef}</span>
                  {reference}
                </div>
              </div>
              <div className="gs-plan-guide-links">
                {guides.map((guide) => (
                  <Link key={guide.slug} href={guide.href}>
                    {guide.title}
                    <PublicIcon name="ArrowRight" size={16} />
                  </Link>
                ))}
              </div>
            </section>
            {eligibility && (
              <section className="gs-plan-panel gs-plan-notes">
                <h2>{copy.plan.beforeBuyHeading}</h2>
                {eligibility}
              </section>
            )}
          </div>
          {faq}
        </div>
      </div>
    </div>
  );
}
