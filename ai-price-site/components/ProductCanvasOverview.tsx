import Link from "next/link";
import type { ReactNode } from "react";
import type { SubscriptionProduct } from "../lib/public-pricing-model";
import { productCanvasModel } from "../lib/product-canvas";
import { homepageDisplayRates } from "../lib/homepage-summary";
import type { ExchangeRateSnapshot } from "../lib/exchange-rates";
import { formatPublicDate } from "../lib/public-date";
import { canvasUiCopy, isDatePrefixLocale, type CanvasLocale } from "../lib/canvas-ui-copy";
import BrandIcon from "./BrandIcon";
import ProductCanvasPricing from "./ProductCanvasPricing";
import TrackedLink from "./analytics/TrackedLink";
import PublicIcon from "./PublicIcon";

/** The legacy renderer owns content resolution and passes its unchanged facts,
 * schema and editorial slots. Shared across unified locales (zh / en).
 * Uses <main> for contentAttributes to satisfy the managed-content readback fence. */
export default function ProductCanvasOverview({
  product,
  title,
  description,
  basePath,
  backLabel,
  rates,
  contentAttributes,
  schema,
  eligibility,
  officialLabel,
  navigation,
  locale = "zh",
  children,
}: {
  product: SubscriptionProduct;
  title: string;
  description: string;
  basePath: string;
  backLabel: string;
  rates: Record<string, ExchangeRateSnapshot>;
  contentAttributes: Record<string, string | number | undefined>;
  schema: ReactNode;
  eligibility: ReactNode;
  officialLabel: string;
  navigation: ReactNode;
  locale?: CanvasLocale;
  children: ReactNode;
}) {
  const copy = canvasUiCopy[locale];
  const model = productCanvasModel(product, locale);
  const date = formatPublicDate(product.updatedAt, new Date(), locale);
  const isManaged = contentAttributes["data-content-kind"] === "managed";
  const conciseDescription =
    !isManaged && model.plans.length > 0
      ? copy.product.conciseDesc(model.plans.length, model.rows.length)
      : description;

  return (
    <div className="gs-public-unified gs-product-scope">
      <main className="gs-product-page gs-pricing-layout" {...contentAttributes}>
        <div className="gs-pricing-navigation" role="region" aria-label={copy.common.productNavAria}>
          {navigation}
        </div>
        <div className="gs-product-content">
          <link
            rel="preload"
            href={new URL("../assets/fonts/web/geosub-price-numerals-700.woff2", import.meta.url).href}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
          {schema}
          <nav className="gs-product-breadcrumb" aria-label={copy.common.breadcrumbAria}>
            <Link href={basePath}>{backLabel}</Link>
            <span aria-hidden="true">/</span>
            <span>{product.name}</span>
          </nav>
          <ProductCanvasPricing
            locale={locale}
            model={model}
            rates={homepageDisplayRates(rates)}
            hero={
              <div className="gs-product-intro">
                <div className="gs-product-identity">
                  <BrandIcon
                    product={{
                      slug: product.slug,
                      name: product.name,
                      logoUrl: product.logoUrl,
                      officialUrl: product.officialUrl,
                    }}
                    size="xl"
                    priority
                    decorative
                  />
                  <div>
                    <h1>{title}</h1>
                    <p>
                      {product.brand}
                      {model.plans.length > 0 && (
                        <>
                          {" "}
                          · {copy.product.plansCount(model.plans.length)} ·{" "}
                          {copy.product.regionsCount(model.rows.length)}
                          {date && (
                            <>
                              {" "}
                              ·{" "}
                              {isDatePrefixLocale(locale) ? (
                                <>
                                  {copy.product.updatedSuffix}{" "}
                                  <time dateTime={date.dateTime}>{date.text}</time>
                                </>
                              ) : (
                                <>
                                  <time dateTime={date.dateTime}>{date.text}</time>
                                  {copy.product.updatedSuffix}
                                </>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <p className="gs-product-description">{conciseDescription}</p>
                {eligibility}
                {product.officialUrl && (
                  <TrackedLink
                    href={product.officialUrl}
                    eventKey="click_official"
                    eventName="Open official website"
                    buttonKey={product.slug}
                    placement="product_overview_hero"
                    target="_blank"
                    rel="noreferrer"
                    data-gs-ui="button"
                  >
                    {officialLabel}
                    <PublicIcon name="ExternalLink" size={16} />
                  </TrackedLink>
                )}
              </div>
            }
          />
          <div className="gs-product-related">{children}</div>
        </div>
      </main>
    </div>
  );
}
