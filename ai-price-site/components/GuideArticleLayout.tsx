import type {ReactNode} from "react";
import Link from "next/link";
import {ArrowRight} from "lucide-react";
import {PublicEvidence, PublicTag} from "./ui/PublicControls";
import GuidePriceBlock from "./GuidePriceBlock";
import {guidePriceContextFromLinks,type GuidePriceContext} from "../lib/guide-price-block";
import GuideContents from "./GuideContents";

export type GuideRelatedLink={href:string;title:string;description?:string|null};

export default function GuideArticleLayout({title,label,contextLabel,summary,updated,readingTime,contents,children,note,relatedLinks=[],priceContext}:{
  title:string;label:string;contextLabel:string;summary?:string|null;updated?:string|null;readingTime:number;
  contents:Array<{id:string;title:string}>;children:ReactNode;note?:string;relatedLinks?:GuideRelatedLink[];priceContext?:GuidePriceContext;
}) {
  const products=relatedLinks.filter(link=>/\/(ai-pricing|streaming-pricing)(\/|$)/.test(link.href));
  const quoteContext=priceContext||guidePriceContextFromLinks(relatedLinks);
  const reading=relatedLinks.filter(link=>!products.includes(link));
  const overflow=[...products.slice(3),...reading.slice(3)];
  const next=products.length ? products.slice(0,3) : [{href:"/zh/ai-pricing",title:"查看产品价格"},{href:"/zh/streaming-pricing",title:"查看流媒体订阅"}];
  const toc=[...contents,{id:"guide-next",title:"下一步"},{id:"guide-sources",title:"来源和更新记录"}];
  return <main data-gs-guides="article" className="gs-guide-page">
    <nav className="gs-guide-breadcrumb" aria-label="面包屑"><Link href="/zh/guides">指南</Link><span>/</span><span>{contextLabel==="Guides" ? "指南" : contextLabel}</span></nav>
    <div className="gs-guide-article-layout"><article>
      <header><PublicTag>{label}</PublicTag><h1>{title}</h1><p className="gs-guide-article-meta">{updated&&<>内容记录更新 {updated} · </>}{readingTime<=1 ? "短篇阅读" : `约 ${readingTime} 分钟阅读`}</p></header>
      {summary && <section className="gs-guide-answer"><h2>30 秒答案</h2><p>{summary}</p></section>}
      <GuideContents items={toc} mobile />
      <div className="gs-guide-prose">{children}</div>
      {quoteContext&&<GuidePriceBlock context={quoteContext}/>}
      {note && <aside className="gs-guide-note"><strong>注意：</strong><p>{note}</p></aside>}
      <section id="guide-next" className="gs-guide-next"><h2>下一步</h2><div>{next.map(link=><Link key={link.href} href={link.href}>{link.title}<ArrowRight aria-hidden="true" /></Link>)}</div></section>
      <section id="guide-sources" className="gs-guide-sources"><h2>来源和更新记录</h2><Link href="/zh/data-sources">GeoSub 数据来源与口径<ArrowRight aria-hidden="true" /></Link><p>{updated ? `内容记录更新 ${updated}；价格采集与汇率日期请以价格页为准。` : "价格采集与汇率日期请以数据块及价格页为准。"}</p><Link href="/zh/contact#contact-form">发现内容或数据有误？提交纠错<ArrowRight aria-hidden="true" /></Link></section>
      {reading.length>0 && <section className="gs-guide-related"><h2>相关阅读</h2><div>{reading.slice(0,3).map(link=><Link key={link.href} href={link.href}><span>{link.title}{link.description&&<small>{link.description}</small>}</span><ArrowRight aria-hidden="true" /></Link>)}</div></section>}
      {overflow.length>0 && <PublicEvidence animated title="更多相关链接">{overflow.map(link=><Link key={link.href} href={link.href}>{link.title}<ArrowRight aria-hidden="true" /></Link>)}</PublicEvidence>}
    </article><GuideContents items={toc} /></div>
  </main>;
}
