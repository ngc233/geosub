"use client";
import Link from "next/link";
import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import type { HomepageRepresentative } from "../lib/homepage-summary";
import { savingsPercent } from "../lib/homepage-display";
import PublicCurrencySelect, { usePublicCurrency, usePageDisplayRates } from "./PublicCurrencySelect";
import { PublicSegments, PublicComparisonBar } from "./PublicControls";
import PublicPriceNumber from "./PublicPriceNumber";
import PublicIcon from "./PublicIcon";
import HomepageProductMark from "./HomepageProductMark";
import HomepageCountryFlag from "./HomepageCountryFlag";
import HomepageMap from "./HomepageMap";
const rankingPageSize=6;
const names=new Intl.DisplayNames(["zh-CN"],{type:"region"});
export default function HomepagePricing({products,rates,map}:{products:HomepageRepresentative[];rates:Record<string,number>;map:{land:string;points:Record<string,number[]>}}) {
  usePageDisplayRates(rates);
  const [preferred]=usePublicCurrency();const [category,setCategory]=useState("all");
  const rankingId=useId();
  const [visibleCount,setVisibleCount]=useState(rankingPageSize);
  const ranking=useRef<HTMLDivElement>(null), nextFocus=useRef<number|null>(null);
  const rankingViewport=useRef<HTMLDivElement>(null);
  const finishRankingResize=useCallback(()=>{
    if(rankingViewport.current)delete rankingViewport.current.dataset.heightChanging;
    if(nextFocus.current===null)return;
    ranking.current?.querySelectorAll<HTMLAnchorElement>('.gs-home-ranking-link')[nextFocus.current]?.focus({preventScroll:true});
    nextFocus.current=null;
  },[]);
  useLayoutEffect(()=>{
    const viewport=rankingViewport.current, content=ranking.current;
    if(!viewport||!content)return;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    // Start at the natural SSR height without an entrance animation. Observe
    // the inner list, not the animated viewport, to avoid a resize feedback loop.
    viewport.style.setProperty('--gs-ranking-height',`${content.getBoundingClientRect().height}px`);
    const update=()=>{
      const height=content.getBoundingClientRect().height;
      const moving=!reduced.matches&&Math.abs(viewport.getBoundingClientRect().height-height)>0.5;
      if(moving)viewport.dataset.heightChanging='true';
      viewport.style.setProperty('--gs-ranking-height',`${height}px`);
      if(!moving)finishRankingResize();
    };
    const observer=new ResizeObserver(update);observer.observe(content);
    const preference=()=>{if(reduced.matches)finishRankingResize();};
    reduced.addEventListener('change',preference);
    return()=>{observer.disconnect();reduced.removeEventListener('change',preference);};
  },[products.length,finishRankingResize]);
  const chooseCategory=(value:string)=>{nextFocus.current=null;setCategory(value);setVisibleCount(rankingPageSize);};
  const currency=rates[preferred]>0?preferred:"USD", rate=rates[currency]??1;
  const ranked=[...products].sort((a,b)=>b.saving-a.saving||a.slug.localeCompare(b.slug));
  const rows=ranked.filter(row=>category==="all"||row.category===category);
  if(!products.length)return null;
  return <>
    <section data-gs-enter="a" className="gs-home-map-panel" aria-label="代表套餐地区价格">

      {currency!==preferred&&<p role="status">{preferred} 汇率不可用，当前显示 USD；可选择其他币种。</p>}
      <HomepageMap products={products} map={map} currency={currency} rate={rate} controls={<PublicCurrencySelect displayCurrency={currency}/>}/>
    </section>
    <section data-gs-enter="a" className="gs-home-section" aria-labelledby="home-ranking">
      <div className="gs-home-section-heading"><div><h2 id="home-ranking">省钱排行榜</h2><p>每个产品一个代表套餐，按比美国低多少排序</p></div><PublicSegments label="排行榜分类" options={[{value:"all",label:"全部"},{value:"ai",label:"AI 订阅"},{value:"streaming",label:"流媒体"}]} value={category} onChange={chooseCategory}/></div>
      <div className="gs-home-ranking"><div className="gs-home-ranking-head" aria-hidden="true"><span>#</span><span>订阅</span><span>最便宜地区</span><span>每月</span><span>比美国低</span></div><div ref={rankingViewport} className="gs-home-ranking-viewport" onTransitionEnd={event=>{if(event.target===event.currentTarget&&event.propertyName==='height')finishRankingResize();}}><div ref={ranking} id={rankingId} role="list" aria-label="订阅省钱排名">
        {rows.map((product,index)=><div key={product.slug} role="listitem" className="gs-home-ranking-row" hidden={index>=visibleCount} data-gs-motion-row>
          <span className="gs-home-rank">{index+1}</span><Link className="gs-home-product-name gs-home-ranking-link" href={product.href}><HomepageProductMark product={product} className="gs-home-ranking-mark"/><span><strong>{product.name}</strong><small>{product.plan}</small></span></Link>
          <div className="gs-home-region-price"><span className="gs-home-country-name"><HomepageCountryFlag code={product.lowest.code}/>{names.of(product.lowest.code)}</span><span className="gs-home-row-price"><PublicPriceNumber value={product.lowest.usd*rate} currency={currency} cycle="monthly" changeKey={currency}/></span></div>
          <PublicComparisonBar hideValue label={`${savingsPercent(product.saving)}%`} value={savingsPercent(product.saving)} maximum={100} tone={product.saving>0?"low":"baseline"}/>
        </div>)}
        {!rows.length&&<p>此分类没有符合代表套餐条件的产品。<button data-gs-ui="button" onClick={()=>chooseCategory("all")}>查看全部</button></p>}
      </div></div></div>
      <div className="gs-home-ranking-more" data-has-more={rows.length>visibleCount}>
        {rows.length>visibleCount&&<button type="button" data-gs-ui="button" aria-controls={rankingId} onClick={()=>{nextFocus.current=visibleCount;setVisibleCount(count=>Math.min(count+rankingPageSize,rows.length));}}><span>加载更多</span><span className="gs-home-ranking-remaining">还有 {rows.length-visibleCount} 个产品</span><PublicIcon name="ChevronDown" size={16}/></button>}
        <span role="status" className="gs-sr-only">已显示 {Math.min(visibleCount,rows.length)} 个，共 {rows.length} 个产品</span>
      </div>
    </section>
    <section data-gs-enter="a" className="gs-home-section gs-home-discovery" aria-labelledby="home-categories"><div className="gs-home-category-panel"><h2 id="home-categories">按分类找</h2><div className="gs-home-categories">
      {(["ai","streaming"] as const).map(kind=>{const items=ranked.filter(p=>p.category===kind);if(!items.length)return null;return <article key={kind} className="gs-home-card" data-gs-motion-card><div className="gs-home-brand-stack gs-home-category-avatars">{items.slice(0,3).map(p=><Link key={p.slug} className="gs-home-category-product-link" href={p.href} prefetch={false} aria-label={p.planDisplayName}><HomepageProductMark product={p} className="gs-home-category-avatar"/></Link>)}{items.length>3&&<span className="gs-home-brand-more">+{items.length-3}</span>}</div><Link className="gs-home-category-link" href={`/zh/${kind==="ai"?"ai-pricing":"streaming-pricing"}/`}><div className="gs-home-category-title"><h3>{kind==="ai"?"AI 订阅":"流媒体"}</h3><p>{items.length} 个产品</p></div><p className="gs-home-category-saving">最多能省 <strong>{savingsPercent(items[0].saving)}%</strong><span className="gs-sr-only"> · {items[0].planDisplayName}</span></p><span className="gs-home-category-action gs-sr-only">查看全部{kind==="ai"?" AI 订阅":"流媒体"}<PublicIcon name="ArrowRight" size={20}/></span></Link></article>;})}
    </div></div><div className="gs-home-recent-placeholder" aria-hidden="true"/></section>
  </>;
}
