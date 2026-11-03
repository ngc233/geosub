"use client";

import Link from "next/link";
import {useMemo, useState} from "react";
import {ArrowRight, ChevronLeft, ChevronRight, ExternalLink, Search, X} from "lucide-react";
import BrandIcon from "./BrandIcon";
import CountryIdentity from "./CountryIdentity";
import { PublicMoney, PublicCurrencyLabel, PublicFxNote } from "./PricingDisplayContext";
import {PublicButton, PublicCard, PublicEvidence, PublicFilters, PublicIconButton, PublicInput, PublicSelect, PublicTag} from "./ui/PublicControls";
import {countryDisplaySummary, countryMoney, filterCountryPlans, type CountryPlanFilter, type CountryPlanRow, type CountryPlanSort} from "../lib/country-hub-display";

export type CountryDirectoryItem = {slug:string;code:string;zh:string;en:string;summary:ReturnType<typeof countryDisplaySummary> | null};
export type CountryPlanViewRow = CountryPlanRow & {planHref:string};

export function CountryComparisonMethod() {
  return <PublicCard className="gs-country-methods">
    <PublicEvidence animated title="比较口径" defaultOpen>
      <ol>{[
        ["同产品、同套餐","逐个套餐与美国相同档位比较，不把不同套餐合并为国家综合指数。"],
        ["同平台、同周期","只收录 App Store 月付记录；每项与美国同平台、同周期的套餐比较。"],
        ["税费与汇率分别标注","保留当地商店标价和有效美元参考，分别显示价格采集与汇率日期。"],
      ].map(([title,text],index)=><li key={title}><span className="gs-country-step">{index+1}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol>
      <div className="gs-country-method-note"><PublicTag>逐项核对税费与购买条件</PublicTag><p>价格已通过现有核验门槛。国家汇总未附逐项税费记录，税率和税费说明请查看套餐来源证据。</p></div>
      <p>美国仅作为比较基准，不进入国家目录。</p>
    </PublicEvidence>
  </PublicCard>;
}

export function CountryDirectoryView({countries}:{countries:CountryDirectoryItem[]}) {
  const [query,setQuery]=useState("");
  const directoryOrder=["TR","JP","IN","PH"];
  const visible=countries.filter(country=>`${country.zh} ${country.en} ${country.code}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a,b)=>directoryOrder.indexOf(a.code)-directoryOrder.indexOf(b.code));
  return <section className="gs-country-directory">
    <div className="gs-country-directory-tools"><PublicInput label="搜索国家或地区" hideLabel type="search" startIcon={<Search aria-hidden="true" />} value={query} onChange={event=>setQuery(event.target.value)} placeholder="搜索国家或地区" /><PublicIconButton aria-label="清空国家搜索" disabled={!query} onClick={()=>setQuery("")}><X aria-hidden="true" /></PublicIconButton><span role="status">当前开放 {countries.length} 个地区{query ? ` · 显示 ${visible.length} 个` : ""}</span></div>
    <div className="gs-country-directory-layout">
      <PublicCard className="gs-country-directory-table gs-motion-list" key={query}>
        <div className="gs-country-directory-head" aria-hidden="true"><span>国家与地区</span><span>产品</span><span>已核验套餐</span><span>价格采集</span><span>汇率基准</span><span>入口</span></div>
        {visible.map(country=><Link key={country.code} href={`/zh/countries/${country.slug}`} className="gs-country-directory-row" data-gs-motion-card="country" data-country-code={country.code}>
          <span className="gs-country-identity"><CountryIdentity code={country.code} /><span><strong>{country.zh}</strong><small>{country.en} · 本地货币 {country.summary?.currencies.join(" / ") || "—"}</small></span></span>
          <span className="gs-country-directory-count"><strong>{country.summary?.products ?? "—"}</strong><small> 个产品</small></span>
          <span className="gs-country-directory-count"><strong>{country.summary?.plans ?? "—"}</strong><small> 个套餐</small><small className="gs-country-secondary">可比较 {country.summary?.comparable ?? "—"}</small></span>
          <span className="gs-country-directory-date">{country.summary?.collected.replace(/\b\d{4}-/g,"") || "暂时无法读取"}</span><span className="gs-country-directory-fx">{country.summary?.fx === "—" ? "汇率待更新" : country.summary?.fx || "暂时无法读取"}</span>
          <span className="gs-country-directory-entry"><span className="gs-country-directory-entry-label">查看地区价格</span><ArrowRight aria-hidden="true" /></span>
          <span className="gs-country-mobile-meta">{country.summary ? `${country.summary.products} 个产品 · ${country.summary.plans} 个套餐 · AI ${country.summary.categories[0].total} / 流媒体 ${country.summary.categories[1].total}` : "覆盖数量暂时无法读取"}<br />价格采集 {country.summary?.collected || "—"} · 汇率 {country.summary?.fx === "—" ? "待更新" : country.summary?.fx || "—"}</span>
        </Link>)}
        {!visible.length && <p role="status" className="gs-country-empty">没有找到匹配的国家或地区。</p>}
      </PublicCard>
      <CountryComparisonMethod />
    </div>
  </section>;
}

export function CountryPlansView({rows,countryName,details=[]}:{rows:CountryPlanViewRow[];countryName:string;details?:{href:string;name:string}[]}) {
  const [query,setQuery]=useState("");
  const [page,setPage]=useState(1);
  const [filter,setFilter]=useState<CountryPlanFilter>("all");
  const [sort,setSort]=useState<CountryPlanSort>("original");
  const summary=useMemo(()=>countryDisplaySummary(rows),[rows]);
  const hasUsd=rows.some(row=>row.usd!==null);
  const activeFilter=filter==="lower"&&summary.cheaper===0 ? "all" : filter;
  const activeSort=sort==="price"&&!hasUsd ? "original" : sort;
  const visible=useMemo(()=>filterCountryPlans(rows,query,activeFilter,activeSort),[rows,query,activeFilter,activeSort]);
  const pages=Math.max(1,Math.ceil(visible.length/20)),activePage=Math.min(page,pages);
  const pageRows=visible.slice((activePage-1)*20,activePage*20);
  const firstByCategory=new Map(summary.categories.map(group=>[group.category,visible.find(row=>row.category===group.category)]));
  function resetForCategory(category:string) {setQuery("");setFilter("all");const list=filterCountryPlans(rows,"","all",activeSort);const index=list.findIndex(row=>row.category===category);setPage(Math.max(1,Math.floor(index/20)+1));requestAnimationFrame(()=>document.getElementById(`${category}-plans`)?.scrollIntoView({block:"start",behavior:"instant"}));}
  return <div className="gs-country-detail-content" data-country-uniform-status>
    <PublicCard className="gs-country-summary" data-country-summary>
      <h2>{summary.comparable ? <><span className="gs-country-summary-clause">{summary.comparable} 个可比较套餐中，</span>{" "}<span className="gs-country-summary-clause">{summary.cheaper} 个比美国便宜</span></> : hasUsd ? "暂无有效美国同套餐比较" : `已收录 ${summary.plans} 个套餐，汇率待更新`}</h2>
      <p>按同产品、同档位、同平台、同周期比较；不代表购买资格。</p>
      <p className="gs-country-summary-facts">收录产品 <strong>{summary.products}</strong> · 已核验套餐 <strong>{summary.plans}</strong> · 可与美国比较 <strong>{summary.comparable}</strong> · 比美国便宜 <strong>{summary.cheaper}</strong></p>
      <p className="gs-country-provenance"><span>价格采集 <span className="gs-country-date-value">{summary.collected}</span></span><span>汇率基准 <span className="gs-country-date-value">{summary.fx === "—" ? "汇率待更新" : summary.fx}</span></span><span>App Store · 月付</span></p>
      <p role="status">{!hasUsd&&"当前汇率未满足时效要求，暂不显示折算价和美国价差；当地标价保留。"}税费说明请逐项查看套餐来源证据。</p>
      <p>仅纳入最近 14 天内采集的已发布核验价格。样本数量只描述本站收录，不代表该国全部订阅或整体物价。</p>
    </PublicCard>
    <section className="gs-country-category-summary" aria-labelledby="country-category-title"><h2 id="country-category-title">{summary.comparable?"各品类低于美国的套餐数":"已收录套餐的品类分布"}</h2><div>
      {summary.categories.map(group=><PublicCard key={group.category}>
        <div className="gs-country-category-heading"><h3>{group.category==="ai" ? "AI 订阅" : "流媒体订阅"}</h3><span>{group.comparable ? `${group.cheaper} / ${group.comparable} 可比较套餐` : `${group.total} 个套餐`}</span></div>
        {group.comparable>0&&<div className="gs-country-category-bar" role={group.percent!==null ? "meter" : undefined} aria-label={`${group.category==="ai" ? "AI" : "流媒体"}低于美国的比例`} aria-valuemin={group.percent!==null ? 0 : undefined} aria-valuemax={group.percent!==null ? 100 : undefined} aria-valuenow={group.percent ?? undefined}><span style={{width:`${group.percent ?? 0}%`}} /></div>}
        <p>{group.percent===null ? "价格按现有采集记录展示" : `${group.percent}%`} · 已收录 {group.total} 个套餐</p>
      </PublicCard>)}
    </div></section>
    <section className="gs-country-prices" aria-labelledby="country-prices-title">
      {details.length>0&&<nav className="gs-country-product-details" aria-label="本地区产品详情">{details.map(item=><Link key={item.href} href={item.href}>{item.name}在{countryName}的价格<ArrowRight aria-hidden="true" /></Link>)}</nav>}
      <div className="gs-country-table-tools"><h2 id="country-prices-title">本地套餐价格</h2>
        <PublicFilters items={[{value:"all",label:`全部 ${rows.length}`},{value:"lower",label:`低于美国 ${summary.cheaper}`,disabled:summary.cheaper===0}]} value={activeFilter} onChange={value=>{setFilter(value as CountryPlanFilter);setPage(1);}} disabled={!rows.length} />
        <PublicInput label="搜索产品名称" hideLabel type="search" startIcon={<Search aria-hidden="true" />} placeholder="搜索产品名称" value={query} disabled={!rows.length} onChange={event=>{setQuery(event.target.value);setPage(1);}} />
        <PublicSelect label="套餐排序" hideLabel value={activeSort} onChange={value=>{setSort(value as CountryPlanSort);setPage(1);}} disabled={!rows.length} options={[{value:"original",label:"按现有分类顺序"},{value:"price",label:"美元价格从低到高",disabled:!hasUsd},{value:"name",label:"按产品名称排序"}]} />
      </div>
      <nav className="gs-country-category-links" aria-label="套餐分类">{summary.categories.filter(group=>group.total>0).map(group=><a key={group.category} href={`#${group.category}-plans`} onClick={()=>resetForCategory(group.category)}>{group.category==="ai" ? "AI 订阅" : "流媒体订阅"} <span>{group.total}</span></a>)}</nav>
      <p className="gs-country-results" role="status">显示 {pageRows.length} / {visible.length} 个匹配套餐 · 共 {rows.length} 个</p>
      <PublicCard className="gs-country-price-table">
        <PublicFxNote /><div className="gs-country-price-head" aria-hidden="true"><span>产品与套餐</span><span>当地标价 / 月</span><span><PublicCurrencyLabel /> 参考 / 月</span><span>较美国</span><span>证据</span></div>
        <div className="gs-motion-list" key={`${activeFilter}-${activeSort}-${query}-${activePage}`}>{pageRows.map(row=><article key={`${row.productSlug}:${row.planSlug}`} id={firstByCategory.get(row.category)===row ? `${row.category}-plans` : undefined} className="gs-country-quote" data-country-plan={`${row.productSlug}:${row.planSlug}`}>
          <div className="gs-country-product"><BrandIcon product={{slug:row.productSlug,name:row.productName}} size="sm" /><div><h3>{row.planName}</h3><p>{row.productName} · App Store · 月付</p><span className="gs-country-mobile-local">{countryMoney(row.amount,row.currency)}</span></div></div>
          <span className="gs-country-local gs-country-data">{countryMoney(row.amount,row.currency)}</span>
          <span className={`gs-country-converted${row.difference!==null&&row.difference<0 ? " gs-country-low" : ""}`}>{row.usd!==null ? <span className="gs-country-data"><PublicMoney value={row.usd} /></span> : <span className="gs-country-unknown" aria-label="汇率待更新">—</span>}</span>
          <span className={`gs-country-difference${row.difference!==null&&row.difference<0 ? " gs-country-low" : row.difference!==null&&row.difference>0 ? " gs-country-high" : ""}`} title={row.difference===null ? "暂无有效美国同套餐比较" : row.difference===0 ? "接近美国基准（四舍五入为 0%）" : undefined}>{row.difference===null ? "—" : row.difference===0 ? "0%" : `${row.difference>0?"+":"−"}${Math.abs(row.difference)}%`}</span>
          <PublicEvidence animated title="查看证据" label={`${row.productName} ${row.planName} 查看证据`} responsiveTitle>
            <dl className="gs-country-evidence-grid"><div><dt>税费</dt><dd>国家汇总记录未附逐项税费说明，请进入套餐证据核对。</dd></div><div><dt>来源</dt><dd>{countryName} App Store · 月付</dd></div><div><dt>价格采集日期</dt><dd>{row.checkedAt?.slice(0,10) || "—"}</dd></div><div><dt>汇率基准</dt><dd>{row.fxDate || "汇率待更新"}</dd></div></dl>
            <div className="gs-country-evidence-links"><Link href={row.planHref}>比较所有地区<ArrowRight aria-hidden="true" /></Link>{row.observationId ? <Link href={`/zh/price-records/${row.observationId}`}>原始快照<ArrowRight aria-hidden="true" /></Link> : <a href={row.sourceUrl} target="_blank" rel="noreferrer">官方来源<ExternalLink aria-hidden="true" /></a>}<Link href={`/zh/price-history/${row.productSlug}`}>价格历史<ArrowRight aria-hidden="true" /></Link></div>
          </PublicEvidence>
        </article>)}</div>
        {!visible.length && <div className="gs-country-empty" role="status"><h3>{rows.length ? "没有匹配的套餐" : "暂无符合条件的套餐"}</h3><p>{rows.length ? "调整搜索或筛选后重试。" : "缺失、过期、待审或来源证据不足的价格不参与本页。请稍后回来查看。"}</p></div>}
      </PublicCard>
      {visible.length>20&&<nav className="gs-public-pagination" aria-label="本地套餐分页"><span>每页 20 条 · 第 {activePage} / {pages} 页</span><PublicButton variant="secondary" disabled={activePage===1} onClick={()=>setPage(activePage-1)}><ChevronLeft aria-hidden="true"/>上一页</PublicButton><PublicButton variant="secondary" disabled={activePage===pages} onClick={()=>setPage(activePage+1)}>下一页<ChevronRight aria-hidden="true"/></PublicButton></nav>}
    </section>
    <CountryComparisonMethod />
    <PublicCard className="gs-country-footnote"><p>折算使用 18 小时内有效汇率；税费不重复加算。缺少汇率或美国同套餐价格时不生成价差。</p><p>当地商店列出价格不代表其他地区账号可购买。账号、付款方式、服务覆盖与最终税费请以官方结算页为准。</p></PublicCard>
  </div>;
}
