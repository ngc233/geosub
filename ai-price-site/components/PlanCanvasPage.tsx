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
import { getChinesePlanDisplayName, getPlanTabLabel } from "../lib/pricing-labels";
import { getPricingDetailPath, getPricingPlanPath } from "../lib/pricing-routes";
import { formatPublicDate } from "../lib/public-date";
import PublicIcon from "./PublicIcon";
import TrackedLink from "./analytics/TrackedLink";
import PlanCanvasPricing, { PlanKeycapSwitcher, PlanWorkRows } from "./PlanCanvasPricing";

type PlanEditorialData = {
  content: NonNullable<ReturnType<typeof getProductEditorialContent>>;
  billing?: PlanBillingContent | null;
};

export default function PlanCanvasPage({ product, plan, title, description, rates, incomes, basePath, backLabel,
  schema, eligibility, editorial, pilots, faq, navigation, reference }: {
  product: SubscriptionProduct; plan: ProductPlan; title: string; description: string;
  rates: Record<string, ExchangeRateSnapshot>; incomes: PlanAffordabilityRow[]; basePath: string; backLabel: string;
  schema: ReactNode; eligibility: ReactNode; editorial: PlanEditorialData | null; pilots: ReactNode; faq: ReactNode; navigation: ReactNode; reference: ReactNode;
}) {
  const guides = (["payment-account", "price-guide", "methodology"] as const).map(slug => ({ ...getCoreGuideDefinition("zh", slug), href: `/zh/guides/${slug}` }));
  const work = planWorkHours(plan, incomes);
  const { us, lowest } = planDistribution(plan);
  const sources = planIncomeSources(work.rows);
  const name = getPlanTabLabel(product.name, getChinesePlanDisplayName(product.name, plan.name));
  const updated = formatPublicDate(plan.freshness?.priceCollectedAt);
  const categoryKey = basePath.includes("streaming-pricing") ? "streaming" : "ai";
  const overviewHref = getPricingDetailPath("zh", categoryKey, product.slug);
  const editorialLead = editorial?.content.plan.difference.trim().split(/[。.!?！？]/u, 1)[0]?.trim();
  const conciseDescription = plan.regions.length > 0
    ? `${editorialLead ? `${editorialLead}。` : ""}覆盖 ${plan.regions.length} 个国家/地区的 ${getPricingChannelLabel(plan)} 核验价格，支持多币种折算、美国基准对比${work.rows.length >= 3 ? "与当地工时负担参考" : "与原始采集快照核查"}。`
    : description;
  const displayRates = homepageDisplayRates(rates);
  const keycapOptions = product.plans.map(option => {
    const label = getPlanTabLabel(product.name, getChinesePlanDisplayName(product.name, option.name));
    if (!option.regions.length) {
      return {
        slug: option.slug,
        label,
        href: null,
        minUsd: null,
        hasDiscount: false,
        disabledHint: option.priceStatus === "pending" ? "待审" : "暂无",
      };
    }
    const minUsd = Math.min(...option.regions.map(region => region.priceUsd));
    const usRegion = option.regions.find(region => region.code.toUpperCase() === "US");
    return {
      slug: option.slug,
      label,
      href: getPricingPlanPath("zh", categoryKey, product.slug, option.slug),
      minUsd,
      hasDiscount: Boolean(usRegion && minUsd < usRegion.priceUsd),
    };
  });
  return <div className="gs-public-unified gs-plan-scope"><div className="gs-plan-page gs-pricing-layout">
    <div className="gs-pricing-navigation" role="region" aria-label="产品导航">{navigation}</div>
    <div className="gs-plan-content">
    <link rel="preload" href={new URL("../assets/fonts/web/geosub-price-numerals-700.woff2", import.meta.url).href} as="font" type="font/woff2" crossOrigin="anonymous"/>
    {schema}
    <nav className="gs-plan-breadcrumb" aria-label="面包屑"><Link href={basePath}>{backLabel}</Link><span aria-hidden="true">/</span><Link href={overviewHref}>{product.name}</Link><span aria-hidden="true">/</span><span>{name}</span></nav>
    <header className="gs-plan-intro">
      <div className="gs-plan-title-row">
        <div className="gs-plan-title-block">
          <h1>{title}</h1>
          <p>{getPricingChannelLabel(plan)} · 每{publicBillingLabel(plan.billing)} · {plan.regions.length} 个地区{updated && <> · <time dateTime={updated.dateTime}>{updated.text}</time>采集</>}</p>
        </div>
        {product.plans.length > 1 && (
          <PlanKeycapSwitcher
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
    <PlanCanvasPricing plan={plan} product={{ name: product.name, slug: product.slug, brand: product.brand, updatedAt: product.updatedAt }} rates={displayRates} rateDates={Object.fromEntries(Object.entries(rates).map(([code, rate]) => [code, rate.rateDate]))}/>
    {editorial && (
      <section className="gs-plan-panel gs-canvas-editorial" aria-labelledby="plan-editorial-title">
        <div className="gs-canvas-editorial-head">
          <h2 id="plan-editorial-title">{name} 套餐定位</h2>
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
            <PublicIcon name="ExternalLink" size={16}/>
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
                  <PublicIcon name="ExternalLink" size={16}/>
                </TrackedLink>
              ))}
            </div>
          </div>
        ) : null}
        {editorial.content.plan.availabilityNote ? (
          <p className="gs-canvas-editorial-note">
            <strong>{editorial.content.availabilityLabel}：</strong>
            {editorial.content.plan.availabilityNote}
          </p>
        ) : null}
      </section>
    )}
    {work.rows.length >= 3 && <section className="gs-plan-panel gs-plan-work" aria-labelledby="plan-work-title">
      <div><h2 id="plan-work-title">为什么各地价格不同</h2><p>价格比较和当地收入负担是两个不同的角度。较低的折算价格，不一定意味着当地收入负担更低。</p><p className="gs-plan-work-note">按同一套餐的美元月费与当地名义收入换算，不代表实际工资或购买资格。</p><small>世界银行人均国民收入或名义人均 GDP（各行注明年份），按每月 160 工作小时换算；不使用购买力平价收入。</small></div>
      <PlanWorkRows rows={work.rows} rates={homepageDisplayRates(rates)} usPrice={us?.priceUsd} lowestCode={lowest?.code}/><div className="gs-plan-work-sources">{sources.map(group => <small key={group.source}>来源：{group.source}{sources.length > 1 && <>（{group.countries.join("、")}）</>}</small>)}</div>
    </section>}
    {pilots}
    <div className="gs-plan-guidance" data-has-notes={Boolean(eligibility)}>
      <section className="gs-plan-panel gs-plan-buy">
        <div className="gs-plan-buy-intro">
          <div>
            <h2>怎么买到这个价格</h2>
            <p>{guides[0].description}</p>
          </div>
          <div className="gs-plan-official"><span>官方定价参考：</span>{reference}</div>
        </div>
        <div className="gs-plan-guide-links">{guides.map(guide => <Link key={guide.slug} href={guide.href}>{guide.title}<PublicIcon name="ArrowRight" size={16}/></Link>)}</div>
      </section>
      {eligibility && <section className="gs-plan-panel gs-plan-notes"><h2>买之前注意</h2>{eligibility}</section>}
    </div>
    {faq}
    </div>
  </div></div>;
}
