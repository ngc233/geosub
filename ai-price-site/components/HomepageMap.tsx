"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import HomepageCountryFlag from "./HomepageCountryFlag";
import HomepageProductMark from "./HomepageProductMark";
import PublicIcon from "./PublicIcon";
import PublicPriceNumber from "./PublicPriceNumber";
import type { HomepageRepresentative } from "../lib/homepage-summary";
import { savingsLabel } from "../lib/homepage-display";
import { parseCarouselDuration } from "../lib/carousel-duration";
const names = new Intl.DisplayNames(["zh-CN"],{type:"region"});
export default function HomepageMap({ products, map, currency, rate, controls }: {
  products:HomepageRepresentative[]; map:{land:string;points:Record<string,number[]>}; currency:string; rate:number; controls?:ReactNode;
}) {
  const [index,setIndex]=useState(0), [paused,setPaused]=useState(false), [reduced,setReduced]=useState(true);
  const [selected,setSelected]=useState<string|null>(null); const root=useRef<HTMLDivElement>(null), bubble=useRef<HTMLDivElement>(null), stage=useRef<HTMLDivElement>(null), landDot=useRef<SVGCircleElement>(null); const id=useId();
  const active=products[index%products.length];
  const pills=useRef<HTMLElement>(null);
  const [jelly,setJelly]=useState<{x:number;y:number;width:number;height:number;product:string;cycle:number;changed:boolean;origin:string}|null>(null);
  useLayoutEffect(()=>{
    const container=pills.current;if(!container)return;
    const measure=()=>{
      const target=container.querySelector<HTMLElement>('.gs-home-product-pill[data-active="true"]');if(!target)return;
      const outer=container.getBoundingClientRect(),rect=target.getBoundingClientRect();
      // Content coordinates keep the absolute base aligned during native horizontal scrolling.
      const box={x:rect.left-outer.left+container.scrollLeft-container.clientLeft,y:rect.top-outer.top+container.scrollTop-container.clientTop,width:rect.width,height:rect.height};
      setJelly(previous=>{
        const changed=!!previous&&previous.product!==active.slug;
        if(previous&&!changed&&previous.x===box.x&&previous.y===box.y&&previous.width===box.width&&previous.height===box.height)return previous;
        return {...box,origin:changed?(box.x>=previous!.x?"100%":"0%"):previous?.origin??"50%",product:active.slug,cycle:changed?1-previous!.cycle:previous?.cycle??0,changed:changed||previous?.changed||false};
      });
    };
    measure();const observer=new ResizeObserver(measure);observer.observe(container);
    container.querySelectorAll('.gs-home-product-pill').forEach(element=>observer.observe(element));
    return()=>observer.disconnect();
  },[active.slug,products.length]);
  useEffect(()=>{const media=matchMedia("(prefers-reduced-motion: reduce)");const sync=()=>setReduced(media.matches);sync();media.addEventListener("change",sync);return()=>media.removeEventListener("change",sync);},[]);
  useEffect(()=>{
    if(paused||reduced||products.length<2)return;
    const duration=parseCarouselDuration(getComputedStyle(root.current!).getPropertyValue("--gs-motion-carousel"));
    if(duration===null)return;
    const timer=setInterval(()=>{if(!document.hidden){setIndex(old=>(old+1)%products.length);setSelected(null);}},duration);
    return()=>clearInterval(timer);
  },[paused,reduced,products.length]);
  // Measure the real translated price, including long currencies. CSS clamps the
  // bubble inside the visual panel; no guessed country-specific pixel offsets.
  useEffect(()=>{const element=bubble.current;if(!element)return;const observer=new ResizeObserver(()=>{
    element.style.setProperty("--gs-bubble-half-width",`${element.offsetWidth/2}px`);
    element.style.setProperty("--gs-bubble-height",`${element.offsetHeight}px`);
  });observer.observe(element);return()=>observer.disconnect();},[]);
  // Keep the canvas dot diameter in CSS pixels as the SVG scales (5px desktop,
  // 3px mobile), rather than shrinking desktop dots with the whole viewBox.
  useEffect(()=>{const element=stage.current,dot=landDot.current;if(!element||!dot)return;
    const observer=new ResizeObserver(()=>{const width=element.getBoundingClientRect().width;
      const diameter=parseFloat(getComputedStyle(element).getPropertyValue("--gs-map-land-dot"));
      if(width>0)dot.setAttribute("r",String(diameter*600/width/2));
    });observer.observe(element);return()=>observer.disconnect();},[]);
  const choose=(next:number)=>{setPaused(true);setIndex(next);setSelected(null);};
  const selectRegion=(code:string)=>{setPaused(true);setSelected(code);};
  const shown=active.prices.find(row=>row.code===selected) ?? active.lowest;
  const point=map.points[shown.code], us=map.points.US, low=map.points[active.lowest.code];
  const tone=shown.code==="US"?"baseline":shown.usd>active.usPrice?"high":shown.usd<active.usPrice?"low":"baseline";
  const label=`${shown.code===active.lowest.code?"全球最低":"地区价格"} ·`;
  return <div ref={root} className="gs-home-map" onMouseEnter={()=>setPaused(true)} onFocusCapture={()=>setPaused(true)}>
    <div className="gs-home-map-heading"><div><strong>各地区价格 · App Store · 每月</strong><div className="gs-home-map-caption"><Link href={active.productHref}>{active.planDisplayName}</Link><Link href={active.href}>查看全部地区 <PublicIcon name="ArrowRight" size={16}/></Link></div></div>{controls}</div>
    <div className="gs-home-map-visual">
      <div ref={stage} className="gs-home-map-stage">
        <svg viewBox="0 0 600 220" role="img" aria-label={`${active.name} ${active.plan} 各地区价格地图`}>
          <defs><pattern id={`${id}-dots`} width="10" height="10" patternUnits="userSpaceOnUse"><circle ref={landDot} cx="5" cy="5" r="1.3" fill="currentColor" className="gs-home-land"/></pattern><clipPath id={`${id}-land`}><path d={map.land}/></clipPath></defs>
          <rect width="600" height="220" fill={`url(#${id}-dots)`} clipPath={`url(#${id}-land)`} className="gs-home-land"/>
          {us&&low&&<path key={active.slug} className="gs-home-arc" pathLength={600} d={`M${us[0]},${us[1]} Q${(us[0]+low[0])/2},${Math.min(us[1],low[1])-70} ${low[0]},${low[1]}`}/>}
        </svg>
        {active.prices.map(row=>{const xy=map.points[row.code];if(!xy)return null;return <button key={row.code} type="button" className="gs-home-point" style={{left:`${xy[0]/6}%`,top:`${xy[1]/2.2}%`}} aria-label={`${names.of(row.code)} ${savingsLabel(1-row.usd/active.usPrice)}`} aria-pressed={shown.code===row.code} onClick={()=>selectRegion(row.code)}>{row.code!==active.lowest.code&&<span data-tone={row.code==="US"?"baseline":row.usd>=active.usPrice?"high":row.usd<=active.usPrice/2?"deep-low":"low"}/>}</button>;})}
        {low&&<span className="gs-home-low-marker" aria-hidden="true" style={{left:`${low[0]/6}%`,top:`${low[1]/2.2}%`}}><span className="gs-home-low-ring" data-gs-pulse={index%2?"b":"a"}/><span data-lowest="true"/></span>}
        {us&&<span className="gs-home-us" style={{left:`${us[0]/6}%`,top:`${us[1]/2.2}%`}}><HomepageCountryFlag code="US"/>美国 <PublicPriceNumber value={active.usPrice*rate} currency={currency} cycle="monthly" changeKey={`${index}-${currency}`}/></span>}
      </div>
      <div ref={bubble} className="gs-home-bubble" data-unmapped={!point} data-tone={tone} style={{"--gs-bubble-x":(point?.[0]??300)/6,"--gs-bubble-y":(point?.[1]??110)/2.2} as CSSProperties}>
        <small>{label} <HomepageCountryFlag code={shown.code}/>{names.of(shown.code)}</small><div className="gs-home-bubble-values"><strong><PublicPriceNumber value={shown.usd*rate} currency={currency} cycle="monthly" changeKey={`${index}-${currency}-${shown.code}`}/></strong><span>{shown.usd<active.usPrice?"−":shown.usd>active.usPrice?"+":""}{Math.round(Math.abs(1-shown.usd/active.usPrice)*100)}%</span></div>
      </div>
    </div>
    <label className="gs-home-region-picker">查看地区<select aria-label="地图查看地区" value={shown.code} onChange={event=>selectRegion(event.target.value)}>{active.prices.map(row=><option key={row.code} value={row.code}>{names.of(row.code)}</option>)}</select></label>
    <nav ref={pills} className="gs-home-products" aria-label="地图产品" data-jelly-ready={Boolean(jelly)} data-jelly-cycle={jelly?.changed?jelly.cycle:undefined}>
      <span className="gs-home-product-jelly" aria-hidden="true" style={jelly?{"--gs-jelly-origin":jelly.origin,"--gs-jelly-x":`${jelly.x}px`,"--gs-jelly-y":`${jelly.y}px`,"--gs-jelly-width":`${jelly.width}px`,"--gs-jelly-height":`${jelly.height}px`} as CSSProperties:undefined}/>
      {products.map((product,i)=><Link key={product.slug} className="gs-home-product-pill" href={product.href} prefetch={false} data-active={i===index} onMouseEnter={()=>choose(i)} onFocus={()=>choose(i)}><HomepageProductMark product={product} className="gs-home-product-pill-mark"/>{product.name}<span className="gs-home-carousel-progress" data-running={!paused&&!reduced&&i===index} data-cycle={index%2}/></Link>)}
    </nav>
    <p className="gs-home-carousel-note">{reduced?"已按系统设置关闭自动轮换":paused?"自动轮换已暂停":"每 4.5 秒轮换一个产品；悬停或聚焦预览，点击查看详情"}</p>
  </div>;
}
