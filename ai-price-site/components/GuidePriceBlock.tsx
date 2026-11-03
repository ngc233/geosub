import Link from "next/link";
import {ArrowRight} from "lucide-react";
import CountryFlag from "./CountryFlag";
import GuidePriceBlockStatus from "./GuidePriceBlockStatus";
import {getPlanTabLabel} from "../lib/pricing-labels";
import {PublicCurrencyLabel,PublicFxNote,PublicMoney} from "./PricingDisplayContext";
import {getPublicPricingProduct} from "../lib/pricing-product-store";
import {getProductOverviewDecisionPlans} from "../lib/pricing-product-overview-copy";
import {selectGuideQuotes,type GuidePriceContext} from "../lib/guide-price-block";
import {getBillingCycleLabel,getBillingCycleSuffix} from "../lib/billing-cycle-label";
import {getPricingPlanPath,getPricingDetailPath} from "../lib/pricing-routes";
import {taxSummary} from "../lib/pricing-r2";

export default async function GuidePriceBlock({context}:{context:GuidePriceContext}) {
  const fallback=context.planSlug?getPricingPlanPath("zh",context.category,context.productSlug,context.planSlug):getPricingDetailPath("zh",context.category,context.productSlug);
  let product;
  try{product=await getPublicPricingProduct(context.productSlug,"zh");}catch{return <GuidePriceBlockStatus status="error" href={fallback}/>;}
  const plans=product?getProductOverviewDecisionPlans(product):[];
  const plan=context.planSlug?plans.find(item=>item.slug===context.planSlug):plans.find(item=>item.slug===product?.defaultPlan)||plans[0];
  const rows=plan?selectGuideQuotes(plan):[];
  if(!product||!plan||!rows.length)return <GuidePriceBlockStatus status="empty" href={fallback}/>;
  const platform=plan.regions[0]?.billingPlatform,platformLabel=platform==="ios"?"App Store":platform==="web"?"Web":platform==="android"||platform==="google_play"?"Google Play":"来源平台";
  const href=getPricingPlanPath("zh",context.category,context.productSlug,plan.slug);
  return <section className="gs-guide-price-block" data-article-price-block={rows.length===1?"single":"comparison"}>
    <h2>当前报价与证据</h2><h3>{product.name} · {getPlanTabLabel(product.name,plan.name)}</h3><p>{platformLabel} · {getBillingCycleLabel(plan.billing,"zh")} · <PublicCurrencyLabel/> 折算</p>
    <p>使用同一套餐的公开报价说明读数方法，不代表购买资格。文章更新时间与价格采集日期分别记录。</p><PublicFxNote/>
    <div className="gs-guide-price-rows">{rows.map(row=><article key={row.code} data-article-quote={row.code} data-price-usd={row.priceUsd}>
      <h3><CountryFlag code={row.code}/>{row.country}{row.code==="US"&&<span>美国基准</span>}</h3>
      <strong><PublicMoney value={row.priceUsd}/><small>{getBillingCycleSuffix(plan.billing,"zh")}</small></strong>
      <p>{row.localPrice} · {taxSummary(row)}</p><p>来源 {row.sourceName||platformLabel}</p><p>价格采集 {row.lastCheckedAt||"—"}<br/>汇率基准 {row.fxRateDate||"—"}</p>
      <Link href={row.observationId?`/zh/price-records/${row.observationId}`:href}>查看证据<ArrowRight aria-hidden="true"/></Link>
    </article>)}</div><Link href={href}>比较全部地区与税费<ArrowRight aria-hidden="true"/></Link>
  </section>;
}
