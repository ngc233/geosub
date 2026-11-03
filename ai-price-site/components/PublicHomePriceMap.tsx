"use client";
import Link from "next/link";
import {useRouter} from "next/navigation";
import { ArrowRight } from "lucide-react";
import type { HomeMapRegion } from "./HomeHeroMap";
import PublicPriceMap from "./PublicPriceMap";
import { PublicFxNote, usePublicPricingDisplay } from "./PricingDisplayContext";
import { publicMapDifference } from "../lib/public-price-map";
import {getPlanTabLabel} from "../lib/pricing-labels";

export default function PublicHomePriceMap({regions,productName,planName,href,planHref}:{regions:HomeMapRegion[];productName:string;planName:string;href:string;planHref?:string}) {
  const router=useRouter();
  const display=usePublicPricingDisplay();
  const sorted=regions.filter(r=>Number.isFinite(r.priceUsd)&&r.priceUsd>0).toSorted((a,b)=>a.priceUsd-b.priceUsd);
  const us=sorted.find(r=>r.code.toUpperCase()==="US");
  const spread=sorted.length>1?Math.round((sorted.at(-1)!.priceUsd-sorted[0].priceUsd)/sorted[0].priceUsd*100):0;
  return <div data-home-geo-pricing className="gs-home-price-card">
    <div className="gs-home-price-heading"><h2>{productName} · {getPlanTabLabel(productName,planName)}</h2><span>App Store · {display.currency} 折算 / 月</span><Link href={href}>查看详情<ArrowRight aria-hidden="true" /></Link></div>
    <div className="gs-home-summary" data-home-price-summary>{[
      {key:"lowest",label:"全球最低价",region:sorted[0]}, {key:"reference",label:"美国基准",region:us}, {key:"highest",label:"当前最高价",region:sorted.at(-1)},
    ].map(item=><section key={item.key} className={`gs-home-metric gs-home-metric-${item.key}`}><p>{item.label} · {item.region?.countryName||"暂无数据"}</p><strong>{item.region?display.format(item.region.priceUsd):"—"}</strong><p>{item.region?.localPrice||"—"}</p><p>{item.region?.tax||"暂无数据"}</p>{item.key==="lowest"&&item.region&&<span className="gs-home-saving">{publicMapDifference({...item.region,country:item.region.countryName},us?{...us,country:us.countryName}:undefined)}</span>}</section>)}</div>
    <PublicFxNote />
    <div className="gs-home-map-heading"><h2>全球价格分布</h2><span>已收录 {sorted.length} 个地区 · 最大价差 {spread}%</span></div>
    <PublicPriceMap refined regions={sorted.map(region=>({code:region.code,country:region.countryName,priceUsd:region.priceUsd}))} label={`${productName} ${planName} 全球价格分布`} formatPrice={display.format} onSelectRegion={planHref?region=>router.push(`${planHref.replace(/\/$/,"")}#region-${region.code}`):undefined} />
  </div>;
}
