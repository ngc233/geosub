"use client";
import HomepageCountryFlag from "./HomepageCountryFlag";
import Link from "next/link";
import { useState } from "react";
import type { HomepageRepresentative } from "../lib/homepage-summary";
import { savingsLabel, savingsPercent } from "../lib/homepage-display";
import PublicCurrencySelect, { usePublicCurrency, usePageDisplayRates } from "./PublicCurrencySelect";
import { PublicSegments, PublicComparisonBar } from "./PublicControls";
import PublicPriceNumber from "./PublicPriceNumber";
import PublicIcon from "./PublicIcon";
import BrandIcon from "./BrandIcon";
import HomepageMap from "./HomepageMap";
const names=new Intl.DisplayNames(["zh-CN"],{type:"region"});
export default function HomepagePricing({products,rates,map}:{products:HomepageRepresentative[];rates:Record<string,number>;map:{land:string;points:Record<string,number[]>}}) {
  usePageDisplayRates(rates);
  const [preferred]=usePublicCurrency();const [category,setCategory]=useState("all");
  const currency=rates[preferred]>0?preferred:"USD", rate=rates[currency]??1;
  const ranked=[...products].sort((a,b)=>b.saving-a.saving||a.slug.localeCompare(b.slug));
  const rows=ranked.filter(row=>category==="all"||row.category===category);
  if(!products.length)return null;
  return <>
    <section data-gs-enter="a" className="gs-home-map-panel" aria-label="代表套餐地区价格">
      <div className="gs-home-section-heading"><strong>各地区价格 · App Store · 月付</strong><PublicCurrencySelect displayCurrency={currency}/></div>
      {currency!==preferred&&<p role="status">{preferred} 汇率不可用，当前显示 USD；可选择其他币种。</p>}
      <HomepageMap products={products} map={map} currency={currency} rate={rate}/>
    </section>
    <section data-gs-enter="a" className="gs-home-section" aria-labelledby="home-ranking">
      <div className="gs-home-section-heading"><div><h2 id="home-ranking">省钱排行榜</h2><p>每个产品一个代表套餐，按比美国低多少排序</p></div><PublicSegments label="排行榜分类" options={[{value:"all",label:"全部"},{value:"ai",label:"AI 订阅"},{value:"streaming",label:"流媒体"}]} value={category} onChange={setCategory}/></div>
      <div className="gs-home-ranking" role="list" aria-label="订阅省钱排名">
        {ranked.map(product=><div key={product.slug} className="gs-home-rank-slot" data-visible={rows.includes(product)} inert={!rows.includes(product)} aria-hidden={!rows.includes(product)}><div role="listitem" className="gs-home-ranking-row" data-gs-motion-card>
          <span className="gs-home-rank">{rows.indexOf(product)+1}</span><Link className="gs-home-product-name" href={product.href}><BrandIcon product={product} size="sm" appearance="public"/><span><strong>{product.name}</strong><small>{product.plan}</small></span></Link>
          <span className="gs-home-country-name"><HomepageCountryFlag code={product.lowest.code}/>{names.of(product.lowest.code)}</span><span className="gs-home-row-price"><PublicPriceNumber value={product.lowest.usd*rate} currency={currency} cycle="monthly" changeKey={currency}/></span>
          <PublicComparisonBar hideValue label={savingsLabel(product.saving)} value={savingsPercent(product.saving)} maximum={100} tone={product.saving>0?"low":"baseline"}/>
        </div></div>)}
        {!rows.length&&<p>此分类没有符合代表套餐条件的产品。<button data-gs-ui="button" onClick={()=>setCategory("all")}>查看全部</button></p>}
      </div>
    </section>
    <section data-gs-enter="a" className="gs-home-section" aria-labelledby="home-categories"><h2 id="home-categories">按分类找</h2><div className="gs-home-categories">
      {(["ai","streaming"] as const).map(kind=>{const items=ranked.filter(p=>p.category===kind);if(!items.length)return null;return <Link key={kind} className="gs-home-card" data-gs-motion-card href={`/zh/${kind==="ai"?"ai-pricing":"streaming-pricing"}/`}><div className="gs-home-brand-stack">{items.slice(0,3).map(p=><BrandIcon key={p.slug} product={p} appearance="public" size="sm"/>)}{items.length>3&&<span>+{items.length-3}</span>}</div><h3>{kind==="ai"?"AI 订阅":"流媒体"}</h3><p>{items.length} 个产品</p><p>最多省：{items[0].planDisplayName} {savingsPercent(items[0].saving)}%</p><span className="gs-home-category-action">查看全部{kind==="ai"?" AI 订阅":"流媒体"}<PublicIcon name="ArrowRight" size={20}/></span></Link>;})}
    </div></section>
  </>;
}
