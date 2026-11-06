"use client";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import BrandIcon from "./BrandIcon";
import PublicIcon from "./PublicIcon";
import PublicPriceNumber from "./PublicPriceNumber";
import type { HomepageRepresentative } from "../lib/homepage-summary";
import { savingsLabel } from "../lib/homepage-display";
const names = new Intl.DisplayNames(["zh-CN"],{type:"region"});
export default function HomepageMap({ products, map, currency, rate }: {
  products:HomepageRepresentative[]; map:{land:string;points:Record<string,number[]>}; currency:string; rate:number;
}) {
  const [index,setIndex]=useState(0), [paused,setPaused]=useState(false), [reduced,setReduced]=useState(true);
  const [selected,setSelected]=useState<string|null>(null); const root=useRef<HTMLDivElement>(null); const id=useId();
  const active=products[index%products.length];
  useEffect(()=>{const media=matchMedia("(prefers-reduced-motion: reduce)");const sync=()=>setReduced(media.matches);sync();media.addEventListener("change",sync);return()=>media.removeEventListener("change",sync);},[]);
  useEffect(()=>{
    if(paused||reduced||products.length<2)return;
    const duration=parseFloat(getComputedStyle(root.current!).getPropertyValue("--gs-motion-carousel"));
    const timer=setInterval(()=>{if(!document.hidden){setIndex(old=>(old+1)%products.length);setSelected(null);}},duration);
    return()=>clearInterval(timer);
  },[paused,reduced,products.length]);
  const choose=(next:number)=>{setPaused(true);setIndex(next);setSelected(null);};
  const shown=active.prices.find(row=>row.code===selected) ?? active.lowest;
  const point=map.points[shown.code], us=map.points.US, low=map.points[active.lowest.code];
  const label=`${names.of(shown.code)} · ${shown.code===active.lowest.code?"最低价":"地区价格"}`;
  return <div ref={root} className="gs-home-map" onMouseEnter={()=>setPaused(true)} onFocusCapture={()=>setPaused(true)}>
    <div className="gs-home-map-stage">
      <svg viewBox="0 0 1000 420" role="img" aria-label={`${active.name} ${active.plan} 各地区价格地图`}>
        <defs><pattern id={`${id}-dots`} width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.8" fill="currentColor" className="gs-home-land"/></pattern><clipPath id={`${id}-land`}><path d={map.land}/></clipPath></defs>
        <rect width="1000" height="420" fill={`url(#${id}-dots)`} clipPath={`url(#${id}-land)`} className="gs-home-land"/>
        {us&&low&&<path className="gs-home-arc" d={`M${us[0]},${us[1]} Q${(us[0]+low[0])/2},${Math.max(12,Math.min(us[1],low[1])-100)} ${low[0]},${low[1]}`}/>}
      </svg>
      {active.prices.map(row=>{const xy=map.points[row.code];if(!xy)return null;return <button key={row.code} type="button" className="gs-home-point" style={{left:`${xy[0]/10}%`,top:`${xy[1]/4.2}%`}} aria-label={`${names.of(row.code)} ${savingsLabel(1-row.usd/active.usPrice)}`} aria-pressed={shown.code===row.code} onClick={()=>{setPaused(true);setSelected(row.code);}}><span data-tone={row.code==="US"?"baseline":row.usd>active.usPrice?"high":"low"} data-gs-pulse={row.code===active.lowest.code?(index%2?"b":"a"):undefined}/></button>;})}
      {us&&<span className="gs-home-us" style={{left:`${us[0]/10}%`,top:`${us[1]/4.2}%`}}>美国基准 <PublicPriceNumber value={active.usPrice*rate} currency={currency} cycle="monthly" changeKey={`${index}-${currency}`}/></span>}
      <div className="gs-home-bubble" data-unmapped={!point} data-tone={shown.code==="US"?"baseline":shown.usd>active.usPrice?"high":"low"} style={{"--gs-bubble-x":Math.max(3,Math.min(70,(point?.[0]??500)/10)),"--gs-bubble-y":Math.max(3,Math.min(29,(point?.[1]??200)/10))} as CSSProperties}>
        <small>{label}</small><strong><PublicPriceNumber value={shown.usd*rate} currency={currency} cycle="monthly" changeKey={`${index}-${currency}-${shown.code}`}/></strong><span>{savingsLabel(1-shown.usd/active.usPrice)}</span>
      </div>
    </div>
    <div className="gs-home-map-caption"><Link href={active.productHref}><strong>{active.planDisplayName}</strong></Link><Link href={active.href}>查看全部地区 <PublicIcon name="ArrowRight" size={16}/></Link></div>
    <div className="gs-home-products" role="tablist" aria-label="地图产品">
      {products.map((product,i)=><button type="button" key={product.slug} role="tab" aria-selected={i===index} tabIndex={i===index?0:-1} onClick={()=>choose(i)} onKeyDown={e=>{const next=e.key==="ArrowRight"?(i+1)%products.length:e.key==="ArrowLeft"?(i-1+products.length)%products.length:e.key==="Home"?0:e.key==="End"?products.length-1:null;if(next===null)return;e.preventDefault();choose(next);(e.currentTarget.parentElement?.querySelectorAll("button")[next] as HTMLButtonElement)?.focus();}}><BrandIcon product={product} size="xs" appearance="public"/>{product.name}<span className="gs-home-carousel-progress" data-running={!paused&&!reduced&&i===index} data-cycle={index%2}/></button>)}
    </div>
    <p className="gs-home-carousel-note">{reduced?"已按系统设置关闭自动轮换":paused?"自动轮换已暂停":"每 4.5 秒轮换一个产品；移入、聚焦或点击后暂停"}</p>
  </div>;
}
