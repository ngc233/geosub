"use client";

import Link from "next/link";
import {useMemo,useState,useSyncExternalStore,type CSSProperties} from "react";
import {ArrowRight,ChevronDown,ChevronLeft,ChevronRight,Search} from "lucide-react";
import CountryFlag from "./CountryFlag";
import {PublicButton,PublicEvidence,PublicInput,PublicSelect} from "./ui/PublicControls";
import {PublicCurrencyLabel,PublicMoney} from "./PricingDisplayContext";
import {comparisonRows,comparisonPreview,comparisonScope,quoteDifference,type ComparisonPlan} from "../lib/overview-comparison";
import {getBillingCycleLabel} from "../lib/billing-cycle-label";

const platformName=(value:string)=>value==="ios"?"App Store":value==="web"?"Web":value==="android"?"Google Play":"来源平台";
function subscribeMobile(change:()=>void){const media=matchMedia("(max-width:767px)");media.addEventListener("change",change);return()=>media.removeEventListener("change",change);}
const mobileSnapshot=()=>matchMedia("(max-width:767px)").matches;
const serverMobile=()=>false;
export default function ProductRegionComparison({plans,regionLinks={}}:{plans:ComparisonPlan[];regionLinks?:Record<string,string>}) {
  const mobile=useSyncExternalStore(subscribeMobile,mobileSnapshot,serverMobile);
  const scopes=[...new Set(plans.map(comparisonScope))];
  const [scope,setScope]=useState(scopes.find(key=>key==="ios:monthly")||scopes[0]||"");
  const selectedPlans=plans.filter(plan=>comparisonScope(plan)===scope);
  const [query,setQuery]=useState(""),[sort,setSort]=useState("");
  const sortPlan=selectedPlans.find(plan=>plan.slug===sort)?.slug||selectedPlans.find(plan=>plan.slug==="plus")?.slug||selectedPlans[0]?.slug||"";
  const [all,setAll]=useState(false),[page,setPage]=useState(1),[expanded,setExpanded]=useState<string|null|undefined>();
  const rows=useMemo(()=>comparisonRows(selectedPlans,query,sortPlan),[selectedPlans,query,sortPlan]);
  const pages=Math.max(1,Math.ceil(rows.length/20)),activePage=Math.min(page,pages),shown=all?rows.slice((activePage-1)*20,activePage*20):comparisonPreview(rows,sortPlan);
  const reset=()=>{setPage(1);setExpanded(undefined);};
  if(!plans.length)return null;
  return <section className="gs-overview-comparison" aria-labelledby="overview-regions-title" data-overview-comparison style={{"--gs-overview-plan-count":selectedPlans.length} as CSSProperties}>
    <div className="gs-overview-comparison-tools"><h2 id="overview-regions-title">地区 × 套餐</h2>
      {scopes.length>1&&<PublicSelect label="比较平台与周期" value={scope} options={scopes.map(key=>{const plan=plans.find(p=>comparisonScope(p)===key)!;return{value:key,label:`${platformName(plan.platform)} · ${getBillingCycleLabel(plan.billing,"zh")}`};})} onChange={value=>{setScope(value);reset();}} />}
      <PublicInput label="搜索比较地区" hideLabel type="search" startIcon={<Search aria-hidden="true"/>} placeholder="搜索地区" value={query} onChange={event=>{setQuery(event.target.value);reset();}}/>
      <PublicSelect label="地区比较排序" hideLabel value={sortPlan} options={selectedPlans.map(plan=>({value:plan.slug,label:`按 ${plan.name} 价格升序`}))} onChange={value=>{setSort(value);reset();}}/>
      <PublicButton variant="secondary" disabled={all||rows.length<=4} onClick={()=>{setAll(true);reset();}}>显示全部 {rows.length} 个地区</PublicButton>
    </div>
    <p className="gs-overview-comparison-scope">{platformName(selectedPlans[0]?.platform||"")} · {selectedPlans[0]?getBillingCycleLabel(selectedPlans[0].billing,"zh"):"—"} · <PublicCurrencyLabel/> 折算；价格颜色仅表示相对美国同套餐的位置。</p>
    <div className="gs-overview-comparison-table">
      <div className="gs-overview-comparison-head" aria-hidden="true"><span>地区</span>{selectedPlans.map(plan=><span key={plan.slug}>{plan.name}</span>)}<span>税费说明</span><span>入口</span></div>
      <div className="gs-motion-list" key={`${scope}-${query}-${sortPlan}-${all}-${activePage}`}>
        {shown.map((row,index)=>{const open=(expanded===undefined?index===0:expanded===row.code),taxes=[...new Set(Object.values(row.quotes).map(quote=>quote.tax))];const first=selectedPlans.find(plan=>row.quotes[plan.slug]);return <article key={row.code} className="gs-overview-comparison-row" data-overview-region={row.code}>
          <div className="gs-overview-comparison-country"><CountryFlag code={row.code}/><strong>{row.country}</strong><button type="button" className="gs-overview-row-toggle" aria-label={`${row.country}各套餐报价`} aria-expanded={open} aria-controls={`overview-region-${row.code}`} onClick={()=>setExpanded(open?null:row.code)}><ChevronDown aria-hidden="true"/></button></div>
          <div className="gs-overview-quotes" data-open={open} aria-hidden={mobile&&!open} inert={mobile&&!open} id={`overview-region-${row.code}`}><div>{selectedPlans.map(plan=>{const quote=row.quotes[plan.slug],reference=plan.regions.find(item=>item.code==="US"),difference=quoteDifference(quote,reference);return <div key={plan.slug} className="gs-overview-quote" data-overview-quote={plan.slug}>
            <span className="gs-overview-mobile-plan">{plan.name}</span>{quote?<Link href={plan.href} className={difference!==null&&difference<0?"gs-price-low":difference!==null&&difference>0?"gs-price-high":undefined} aria-label={`${row.country} ${plan.name} 套餐价格`}><PublicMoney value={quote.priceUsd}/></Link>:<span className="gs-overview-unavailable" title="暂无此平台、周期的地区报价">—</span>}
            <span className="gs-overview-mobile-tax">{quote?.tax||"暂无报价"}</span>
          </div>;})}</div></div>
          <span className="gs-overview-tax">{taxes.length===1?taxes[0]:"按套餐核对"}</span>
          {first&&<Link className="gs-overview-region-link" href={regionLinks[row.code]||first.href}>{regionLinks[row.code]?"查看地区分析":"查看套餐"}<ArrowRight aria-hidden="true"/></Link>}
        </article>;})}
        {!shown.length&&<p role="status" className="gs-overview-empty">没有匹配的地区。请调整搜索文字。</p>}
      </div>
      <div className="gs-overview-comparison-foot"><span role="status">已显示 {shown.length} / {rows.length} 个地区</span><PublicEvidence animated title="税费说明与来源证据">{shown.map(row=><div key={row.code}><h3>{row.country}</h3>{selectedPlans.filter(plan=>row.quotes[plan.slug]).map(plan=>{const quote=row.quotes[plan.slug];return <p key={plan.slug}>{plan.name} · {quote.localPrice} · {quote.tax} · 采集 {quote.lastCheckedAt||"—"} · 汇率 {quote.fxRateDate||"—"} <Link href={quote.observationId?`/zh/price-records/${quote.observationId}`:plan.href}>查看证据<ArrowRight aria-hidden="true"/></Link></p>;})}</div>)}</PublicEvidence></div>
    </div>
    {all&&<nav className="gs-public-pagination" aria-label="地区比较分页"><span>每页 20 条 · 第 {activePage} / {pages} 页</span><PublicButton variant="secondary" disabled={activePage===1} onClick={()=>{setPage(activePage-1);setExpanded(undefined);}}><ChevronLeft aria-hidden="true"/>上一页</PublicButton><PublicButton variant="secondary" disabled={activePage===pages} onClick={()=>{setPage(activePage+1);setExpanded(undefined);}}>下一页<ChevronRight aria-hidden="true"/></PublicButton></nav>}
  </section>;
}
