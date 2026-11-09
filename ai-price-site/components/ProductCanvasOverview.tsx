import Link from "next/link";
import type { ReactNode } from "react";
import type { SubscriptionProduct } from "../lib/public-pricing-model";
import { productCanvasModel } from "../lib/product-canvas";
import { homepageDisplayRates } from "../lib/homepage-summary";
import type { ExchangeRateSnapshot } from "../lib/exchange-rates";
import { formatPublicDate } from "../lib/public-date";
import BrandIcon from "./BrandIcon";
import ProductCanvasPricing from "./ProductCanvasPricing";
import TrackedLink from "./analytics/TrackedLink";
import PublicIcon from "./PublicIcon";

/** The legacy renderer owns content resolution and passes its unchanged facts,
 * schema and editorial slots. This component only presents Chinese overviews.
 * A matrix needs page-specific layout; controls, prices and flags stay shared. */
export default function ProductCanvasOverview({ product, title, description, basePath, backLabel,
  rates, contentAttributes, schema, eligibility, officialLabel, navigation, children }: {
  product: SubscriptionProduct; title: string; description: string; basePath: string; backLabel: string;
  rates: Record<string, ExchangeRateSnapshot>; contentAttributes: Record<string, string | number | undefined>;
  schema: ReactNode; eligibility: ReactNode; officialLabel: string; navigation: ReactNode; children: ReactNode;
}) {
  const model = productCanvasModel(product), date = formatPublicDate(product.updatedAt);
  return <div className="gs-public-unified gs-product-scope"><main className="gs-product-page" {...contentAttributes}>
    <link rel="preload" href={new URL("../assets/fonts/web/geosub-price-numerals-700.woff2", import.meta.url).href} as="font" type="font/woff2" crossOrigin="anonymous"/>
    {schema}
    <nav className="gs-product-breadcrumb" aria-label="面包屑"><Link href={basePath}>{backLabel}</Link><span aria-hidden="true">/</span><span>{product.name}</span></nav>
    <ProductCanvasPricing model={model} rates={homepageDisplayRates(rates)} hero={<div className="gs-product-intro">
      <div className="gs-product-identity"><BrandIcon product={{slug:product.slug,name:product.name,logoUrl:product.logoUrl,officialUrl:product.officialUrl}} size="xl" priority decorative/><div><h1>{title}</h1><p>{product.brand}{model.plans.length > 0 && <> · {model.plans.length} 个套餐 · {model.rows.length} 个地区{date && <> · <time dateTime={date.dateTime}>{date.text}</time>更新</>}</>}</p></div></div>
      <p className="gs-product-description">{description}</p>{eligibility}
      {product.officialUrl && <TrackedLink href={product.officialUrl} eventKey="click_official" eventName="Open official website" buttonKey={product.slug}
        placement="product_overview_hero" target="_blank" rel="noreferrer" data-gs-ui="button">{officialLabel}<PublicIcon name="ExternalLink" size={16}/></TrackedLink>}
    </div>}/>
    <div className="gs-product-related">{children}</div>
    <details className="gs-product-navigation"><summary>浏览其他产品</summary>{navigation}</details>
  </main></div>;
}
