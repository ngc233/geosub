"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowRight, Clock3, ExternalLink, FileText, Link2, Percent, UserRound } from "lucide-react";
import { PublicCard, PublicEvidence, PublicSelect, PublicTag } from "./ui/PublicControls";
import { RegionEvidencePanel } from "./ExpandableRegionPriceTable";
import { PublicFxNote, usePublicPricingDisplay } from "./PricingDisplayContext";
import TrackedLink from "./analytics/TrackedLink";
import { getPlanTabLabel } from "../lib/pricing-labels";
import { dateRange, priceDifference, taxSummary } from "../lib/pricing-r2";
import { usableCountryDisplayRate, type ProductCountryRow } from "../lib/product-country-display";
import type { ExchangeRateSnapshot } from "../lib/exchange-rates";
import type { CountryPagePilot } from "../lib/country-page-pilot";

type Props = {
  productName: string; productSlug: string; productPath: string; countryName: string; countryCode: string; countrySlug: string; countryHref?: string;
  title: string; description: string; decisionSummary: string; localContext: string; availabilityCaution: string; dataNote: string;
  rows: ProductCountryRow[]; displayRate?: ExchangeRateSnapshot; sourceRate?: ExchangeRateSnapshot;
  sourceLabel: string; sourceUrl?: string; officialUrl?: string; priceEvent?: CountryPagePilot["priceEvent"]; eventPlanName?: string;
  eligibility: ReactNode;
};
const confidence = {high:"高",medium:"中",low:"低",unknown:"待复核"};

export default function ProductCountryPageView(props: Props) {
  const { rows, productName, productSlug, productPath, countryName, countryCode } = props;
  const [planSlug,setPlanSlug]=useState(()=>rows.find(r=>productSlug==="chatgpt"&&r.slug==="plus")?.slug || rows[0]?.slug || "");
  const selected=rows.find(r=>r.slug===planSlug) || rows[0];
  const display = usePublicPricingDisplay();
  const currency = display.currency;
  const money = display.format;
  const collected=dateRange(rows.flatMap(r=>[r.region.lastCheckedAt,r.us?.lastCheckedAt,r.highest.lastCheckedAt]));
  const fx=dateRange(rows.flatMap(r=>[r.region.fxRateDate,r.us?.fxRateDate,r.highest.fxRateDate]));
  const difference=selected ? priceDifference(selected.region.priceUsd,selected.us?.priceUsd) : null;
  const sourceRate=props.sourceRate;
  return <div data-gs-product-country data-country-code={countryCode}>
    <nav className="gs-pc-breadcrumb" aria-label="面包屑"><Link href="/zh/countries">按国家</Link><span>/</span>{props.countryHref?<Link href={props.countryHref}>{countryName}</Link>:<span>{countryName}</span>}<span>/</span><Link href={productPath}>{productName}</Link></nav>
    <header className="gs-pc-heading"><h1>{props.title}</h1><p>{selected?`${getPlanTabLabel(productName,selected.name)} 当地标价 ${selected.region.localPrice}，折算约 ${money(selected.region.priceUsd)}。`:props.description}</p><div className="gs-pc-heading-tools"><p>App Store · 月付 · {currency} 折算</p><PublicSelect label="摘要套餐" hideLabel value={selected?.slug||""} disabled={!rows.length} options={rows.map(r=>({value:r.slug,label:getPlanTabLabel(productName,r.name)}))} onChange={setPlanSlug} /></div></header>
    {selected ? <>
      <PublicCard className="gs-pc-summary" data-pc-summary>
        <div className="gs-pc-metrics">
          {[{key:"local",label:`${countryName}当前价`,region:selected.region},{key:"us",label:"美国同档（参考）",region:selected.us},{key:"high",label:"同平台最高",region:selected.highest}].map(({key,label,region})=><div key={key} data-pc-metric={key} className={`gs-pc-metric${key==="local"&&difference!==null&&difference<0?" gs-pc-low-metric":""}`}>
            <p>{label} · {getPlanTabLabel(productName,selected.name)}</p><strong>{region?money(region.priceUsd):"—"}</strong>
            <p>{region ? `${key==="high"?`${region.country} · `:""}${region.localPrice}`:"暂无同套餐美国参考价"}</p>
            {region&&<p>{taxSummary(region)}</p>}{key==="local"&&difference!==null&&<p className={difference<0?"gs-pc-low":difference>0?"gs-pc-high":""}>较美国 {difference>0?"+":""}{difference}%</p>}
          </div>)}
        </div>
        <div className="gs-pc-provenance"><span><Clock3 aria-hidden="true" />复核状态待确认</span><span>价格采集 {collected}</span><span>报价汇率 {fx}</span><span>{rows.length} 档 · App Store · 月付</span></div>
        <PublicEvidence animated title={display.rates[currency]?.isStale?"展示汇率较旧 · 查看口径":"查看来源与汇率口径"}>
          <p>{props.sourceLabel} · 价格采集 {collected} · 正式报价汇率 {fx}</p>
          <PublicFxNote />
          <p>{sourceRate&&usableCountryDisplayRate(sourceRate)?`本币汇率快照：1 USD = ${sourceRate.rate.toLocaleString("zh-CN",{maximumFractionDigits:4})} ${sourceRate.quoteCurrency} · ${sourceRate.rateDate||"—"}${sourceRate.isStale?" · 汇率快照已超过 18 小时，等待下一轮同步":""}`:"当前没有可安全展示的本币汇率快照"}</p>
          <p>价格、报价汇率与展示汇率分别记录；不同汇率日期的折算不混作本币调价。</p>
          {props.sourceUrl&&<a href={props.sourceUrl} target="_blank" rel="noreferrer">查看 App Store 证据<ExternalLink aria-hidden="true" /></a>}
        </PublicEvidence>
      </PublicCard>
      <PublicCard className="gs-pc-section gs-pc-conclusion"><h2><span>1</span>价格结论</h2><p>{getPlanTabLabel(productName,selected.name)} 当地标价 {selected.region.localPrice}，折算约 {money(selected.region.priceUsd)}；{selected.us?`美国同档 ${money(selected.us.priceUsd)}${difference===null?"":`，较美国 ${difference>0?"+":""}${difference}%`}。`:"暂无同套餐美国参考价。"}</p><p>{props.description}</p><p>{props.decisionSummary}</p><p>{props.localContext}</p></PublicCard>
      <PublicCard className="gs-pc-section gs-pc-plans"><h2><span>2</span>{countryName}已收录套餐</h2><p>仅列出该地区已核验的 App Store 月付项目。美元金额用于比较，不代表实际扣款币种。</p>
        <div className="gs-pc-table-head" aria-hidden="true"><span>套餐</span><span>当地标价 / 月</span><span>{currency} 折算 / 月</span><span>税费</span><span>证据与入口</span></div>
        {rows.map(row=><article className="gs-pc-record" key={row.slug} data-pc-plan={row.slug} data-selected={row.slug===selected.slug}>
          <div className="gs-pc-price-row"><button type="button" aria-pressed={row.slug===selected.slug} onClick={()=>setPlanSlug(row.slug)} aria-label={`摘要选择 ${row.name}`}><strong>{getPlanTabLabel(productName,row.name)}</strong><span>App Store · 月付</span></button><span className="gs-pc-local">{row.region.localPrice}</span><strong className="gs-pc-price">{money(row.region.priceUsd)}</strong><span className="gs-pc-tax">{taxSummary(row.region)}<small>采集 {row.region.lastCheckedAt||"—"}</small></span></div>
          <PublicEvidence animated title="查看证据与套餐" label={`${row.name} 查看证据与套餐`}>
            <PublicTag>已核验</PublicTag>
            <p>全球价格位次 {row.region.rank}/{row.count}{row.nearby.length?` · 相邻价位：${row.nearby.map(r=>`${r.country} ${money(r.priceUsd)}`).join(" · ")}`:""}</p>
            <RegionEvidencePanel region={row.region} referencePrice={row.us?.priceUsd||0} hasUsReference={Boolean(row.us)} displayCurrencyLabel={currency} formatDisplayPrice={money} locale="zh" panelId={`pc-evidence-${row.slug}`} />
            <div className="gs-pc-evidence-links"><TrackedLink href={`${productPath}/${row.slug}`} eventKey="click_related_plan" eventName="Open plan from country page" buttonKey={row.slug} placement="country_page_price_table" source="country_page">查看全球套餐比较<ArrowRight aria-hidden="true" /></TrackedLink>{row.region.observationId&&<Link href={`/zh/price-records/${row.region.observationId}`}>原始价格快照<ArrowRight aria-hidden="true" /></Link>}</div>
          </PublicEvidence>
        </article>)}
      </PublicCard>
      <PublicCard className="gs-pc-section gs-pc-tax-section"><h2><span>3</span>税费与购买条件</h2><div className="gs-pc-tax-grid">
        <div><FileText aria-hidden="true" /><h3>税费处理</h3><p>{taxSummary(selected.region)}</p><p>{selected.region.taxFrontendNote||selected.region.tax}</p><PublicTag>税务可信度 · {confidence[selected.region.taxConfidence||"unknown"]}</PublicTag></div>
        <div><Percent aria-hidden="true" /><h3>税率</h3><PublicTag>待核验</PublicTag><p>暂无可独立确认的具体税率，请核对原始税务说明和最终结算页；不对标价重复加税。</p></div>
        <div><UserRound aria-hidden="true" /><h3>账号与付款条件</h3><PublicTag>逐项确认</PublicTag><p>{props.availabilityCaution}</p></div>
      </div><div className="gs-pc-eligibility">{props.eligibility}</div>{selected.region.sourceUrl&&<a className="gs-pc-source" href={selected.region.sourceUrl} target="_blank" rel="noreferrer"><Link2 aria-hidden="true" />查看原始来源 · {countryName} App Store · {productName}<ExternalLink aria-hidden="true" /></a>}</PublicCard>
    </>:<PublicCard className="gs-pc-section"><h2>暂无符合条件的本地区价格</h2><p>没有可发布记录时不补价格或参考基准，请稍后重试。</p></PublicCard>}
    <PublicCard className="gs-pc-section gs-pc-history"><h2><span>4</span>变动记录</h2>{props.priceEvent?<div className="gs-pc-history-event"><time>{props.priceEvent.confirmedAt}</time><div><PublicTag>已有本币变动证据</PublicTag><p>{props.eventPlanName||props.priceEvent.planSlug}：{props.priceEvent.previousLocalPrice}<ArrowRight aria-hidden="true" />{props.priceEvent.currentLocalPrice}</p><p>来源复核 {props.priceEvent.confirmedAt}</p><a href={props.priceEvent.sourceUrl} target="_blank" rel="noreferrer">查看已登记来源<ExternalLink aria-hidden="true" /></a></div></div>:<p>当前未发现达到公开门槛的本币调价；汇率变化不会被记作调价。</p>}<p>这里只呈现已登记的来源复核记录，不代表完整变动历史。</p><Link href={`/zh/price-history/${productSlug}`}>查看本币价格记录与公开观测<ArrowRight aria-hidden="true" /></Link></PublicCard>
    <PublicCard className="gs-pc-section gs-pc-faq"><h2><span>5</span>常见问题</h2><PublicEvidence animated title="折算价变化等于涨价吗？"><p>{props.dataNote}</p><p>应先比较同套餐、同平台、同周期的本币标价，再分别核对价格采集与汇率日期。</p></PublicEvidence><PublicEvidence animated title="当地标价是否代表可以购买？"><p>{props.availabilityCaution}</p><p>GeoSub 展示公开标价和已有证据，实际资格、付款方式和最终税费以官方结算页为准。</p></PublicEvidence></PublicCard>
    <footer className="gs-pc-footnote"><p>{props.dataNote}</p><Link href={productPath}>返回产品价格<ArrowRight aria-hidden="true" /></Link>{props.officialUrl&&<TrackedLink href={props.officialUrl} eventKey="click_official" eventName="Open official website from country page" buttonKey={countryCode.toLowerCase()} placement="country_page_footer" source="country_page" target="_blank" rel="noreferrer">访问官方网站<ExternalLink aria-hidden="true" /></TrackedLink>}</footer>
  </div>;
}
