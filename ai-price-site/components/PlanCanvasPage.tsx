import Link from "next/link";
import type { ReactNode } from "react";
import type { SubscriptionProduct, ProductPlan } from "../lib/public-pricing-model";
import type { PlanAffordabilityRow } from "../lib/affordability";
import type { ExchangeRateSnapshot } from "../lib/exchange-rates";
import { planWorkHours, planIncomeSources, planDistribution } from "../lib/plan-canvas";
import { homepageDisplayRates } from "../lib/homepage-summary";
import { getCoreGuideDefinition } from "../lib/core-guide-content";
import { publicBillingLabel } from "../lib/public-price-format";
import { getPricingChannelLabel } from "../lib/pricing-page-facts";
import { getChinesePlanDisplayName, getPlanTabLabel } from "../lib/pricing-labels";
import { getPricingPlanPath } from "../lib/pricing-routes";
import { formatPublicDate } from "../lib/public-date";
import PublicIcon from "./PublicIcon";
import PlanCanvasPricing, { PlanWorkRows } from "./PlanCanvasPricing";

export default function PlanCanvasPage({ product, plan, title, description, rates, incomes, basePath, backLabel,
  schema, eligibility, fit, fitSummary, overview, faq, related, navigation, reference, legacy }: {
  product: SubscriptionProduct; plan: ProductPlan; title: string; description: string;
  rates: Record<string, ExchangeRateSnapshot>; incomes: PlanAffordabilityRow[]; basePath: string; backLabel: string;
  schema: ReactNode; eligibility: ReactNode; fit: ReactNode; faq: ReactNode; related: ReactNode; navigation: ReactNode; reference: ReactNode; legacy: ReactNode;
  fitSummary: { title: string; body: string } | null; overview: ReactNode;
}) {
  const guides = (["payment-account", "price-guide", "methodology"] as const).map(slug => ({ ...getCoreGuideDefinition("zh", slug), href: `/zh/guides/${slug}` }));
  const work = planWorkHours(plan, incomes);
  const { us, lowest } = planDistribution(plan);
  const sources = planIncomeSources(work.rows);
  const name = getPlanTabLabel(product.name, getChinesePlanDisplayName(product.name, plan.name));
  const updated = formatPublicDate(plan.freshness?.priceCollectedAt);
  const planOption = (option: ProductPlan) => {
      const label = getPlanTabLabel(product.name, option.name);
      return option.regions.length ? <Link key={option.slug} tabIndex={0} data-gs-ui="button" href={getPricingPlanPath("zh", basePath.includes("streaming-pricing") ? "streaming" : "ai", product.slug, option.slug)} aria-current={option.slug === plan.slug ? "page" : undefined}
        data-track-event="select_plan" data-track-name="Select subscription plan" data-track-button={`${product.slug}:${option.slug}`} data-track-placement="plan_tabs" data-track-source="segmented_control">{label}</Link>
        : <span key={option.slug} data-gs-ui="button" aria-disabled="true">{label} {option.priceStatus === "pending" ? "待审" : "暂无"}</span>;
    };
  return <div className="gs-public-unified gs-plan-scope"><main className="gs-plan-page">
    <link rel="preload" href={new URL("../assets/fonts/web/geosub-price-numerals-700.woff2", import.meta.url).href} as="font" type="font/woff2" crossOrigin="anonymous"/>
    {schema}
    <nav className="gs-plan-breadcrumb" aria-label="面包屑"><Link href={basePath}>{backLabel}</Link><span aria-hidden="true">/</span><span>{product.name}</span><span aria-hidden="true">/</span><span>{name}</span></nav>
    <header className="gs-plan-intro"><h1>{title}</h1><p>{getPricingChannelLabel(plan)} · 每{publicBillingLabel(plan.billing)} · {plan.regions.length} 个地区{updated && <> · <time dateTime={updated.dateTime}>{updated.text}</time>采集</>}</p><p className="gs-plan-description">{description}</p></header>
    <PlanCanvasPricing plan={plan} product={{ name: product.name, slug: product.slug, brand: product.brand, updatedAt: product.updatedAt }} rates={homepageDisplayRates(rates)} rateDates={Object.fromEntries(Object.entries(rates).map(([code, rate]) => [code, rate.rateDate]))} tutorial={{ href: guides[0].href, title: guides[0].title, summary: guides[0].description }}/>
    <div className="gs-plan-guidance" data-has-notes={Boolean(eligibility)}>
      <section className="gs-plan-panel gs-plan-buy"><div className="gs-plan-buy-intro"><h2>怎么买到这个价格</h2><p>{guides[0].description}</p></div><div className="gs-plan-guide-links">{guides.map(guide => <Link key={guide.slug} href={guide.href}>{guide.title}<PublicIcon name="ArrowRight" size={16}/></Link>)}</div><div className="gs-plan-official"><span>官方定价参考：</span>{reference}</div></section>
      {eligibility && <section className="gs-plan-panel gs-plan-notes"><h2>买之前注意</h2>{eligibility}</section>}
    </div>
    <section className="gs-plan-panel gs-plan-fit" aria-label="套餐选择">
      {fitSummary && <div className="gs-plan-fit-summary"><h2>{fitSummary.title}</h2><p>{fitSummary.body}</p></div>}
      <div className="gs-plan-fit-actions"><div className="gs-plan-overview"><PublicIcon name="BookOpen" size={20}/>{overview}</div><nav className="gs-plan-options" aria-label="套餐切换">{product.plans.filter(option => option.slug !== plan.slug).map(planOption)}</nav></div>
      <details className="gs-plan-details"><summary>详细套餐说明<PublicIcon name="ChevronDown" size={16}/></summary><div className="gs-plan-editorial">{fit}</div><nav className="gs-plan-options" aria-label="当前套餐">{product.plans.filter(option => option.slug === plan.slug).map(planOption)}</nav><div className="gs-plan-related">{related}</div></details>
    </section>
    {work.rows.length >= 3 && <section className="gs-plan-panel gs-plan-work" aria-labelledby="plan-work-title">
      <div><h2 id="plan-work-title">为什么各地价格不同</h2><p>价格比较和当地收入负担是两个不同的角度。较低的折算价格，不一定意味着当地收入负担更低。</p><p className="gs-plan-work-note">按同一套餐的美元月费与当地名义收入换算，不代表实际工资或购买资格。</p><small>世界银行人均国民收入或名义人均 GDP（各行注明年份），按每月 160 工作小时换算；不使用购买力平价收入。</small></div>
      <PlanWorkRows rows={work.rows} rates={homepageDisplayRates(rates)} usPrice={us?.priceUsd} lowestCode={lowest?.code}/><div className="gs-plan-work-sources">{sources.map(group => <small key={group.source}>来源：{group.source}{sources.length > 1 && <>（{group.countries.join("、")}）</>}</small>)}</div>
    </section>}
    <div className="gs-plan-panel gs-plan-faq">{faq}</div>
    <details className="gs-plan-more"><summary>更多价格说明与产品入口</summary>{navigation}{legacy}</details>
  </main></div>;
}
