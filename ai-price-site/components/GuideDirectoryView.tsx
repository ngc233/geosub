"use client";

import Link from "next/link";
import {useState} from "react";
import {ArrowRight, BookOpen, CreditCard, FileText, Search, X} from "lucide-react";
import {filterGuideEntries, type GuideDirectoryEntry} from "../lib/guide-display";
import {PublicCard, PublicFilters, PublicIconButton, PublicInput, PublicTag} from "./ui/PublicControls";

export default function GuideDirectoryView({entries,emptyText}:{entries:GuideDirectoryEntry[];emptyText:string}) {
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState("all");
  const visible=filterGuideEntries(entries,query,filter);
  const groups=[{key:"reading",title:"指南与方法",rows:visible.filter(row=>row.articleType!=="NEWS")},{key:"news",title:"资讯",rows:visible.filter(row=>row.articleType==="NEWS")}];
  const filters=[{value:"all",label:"全部"},
    ...(entries.some(row=>row.core) ? [{value:"core",label:"核心指南"}] : []),
    ...(entries.some(row=>row.articleType==="METHODOLOGY") ? [{value:"METHODOLOGY",label:"方法"}] : []),
    ...(entries.some(row=>row.articleType==="NEWS") ? [{value:"NEWS",label:"资讯"}] : [])];
  return <section className="gs-guide-directory">
    <div className="gs-guide-directory-tools"><PublicFilters animated items={filters} value={filter} onChange={setFilter} /><div className="gs-guide-search"><PublicInput label="搜索指南" type="search" hideLabel startIcon={<Search aria-hidden="true" />} value={query} onChange={event=>setQuery(event.target.value)} placeholder="搜索指南" /><PublicIconButton aria-label="清空指南搜索" disabled={!query} onClick={()=>setQuery("")}><X aria-hidden="true" /></PublicIconButton></div></div>
    <p className="gs-guide-directory-status" role="status">当前收录 {entries.length} 篇 · 显示 {visible.length} 篇</p>
    <div className="gs-guide-directory-layout"><div className="gs-motion-list" key={`${query}-${filter}`}>
      {groups.filter(group=>group.rows.length>0).map(group=><PublicCard className="gs-guide-directory-list" key={group.key}><h2>{group.title} <span>{group.rows.length}</span></h2>{group.rows.map(entry=>{
        const Icon=entry.href.endsWith("payment-account")||entry.href.endsWith("gift-card-guide") ? CreditCard : entry.articleType==="METHODOLOGY" ? BookOpen : FileText;
        return <article className="gs-guide-directory-row" data-gs-motion-card="guide" key={entry.id} data-guide-entry={entry.id}><span className="gs-guide-row-icon"><Icon aria-hidden="true" /></span><div><h3><Link href={entry.href}>{entry.title}</Link></h3><p>{entry.description}</p><div className="gs-guide-row-meta"><PublicTag>{entry.label}</PublicTag>{entry.updated&&<small>记录更新 {entry.updated}</small>}</div></div><Link className="gs-guide-row-entry" href={entry.href} aria-label={`阅读${entry.title}`}><span>阅读{entry.articleType==="NEWS" ? "资讯" : "指南"}</span><ArrowRight aria-hidden="true" /></Link></article>;
      })}</PublicCard>)}
      {!visible.length && <PublicCard className="gs-guide-empty" role="status"><h2>{entries.length ? "没有找到匹配的指南" : emptyText}</h2><p>{entries.length ? "调整搜索文字或选择其他分类。" : "这里只展示现有公开内容。"}</p></PublicCard>}
    </div><PublicCard className="gs-guide-start"><h2>第一次使用 GeoSub</h2><p>先读懂价格、付款条件与数据方法，再进入具体产品比较。</p><ol>{[
      ["选择产品与套餐","先确认需要比较的产品和套餐档位。"],
      ["确认平台与周期","使用相同平台和计费周期的价格。"],
      ["比较价格与税费","同时查看本地标价、折算日期和税费说明。"],
      ["展开来源证据","查看价格采集、汇率日期及原始来源。"],
    ].map(([title,body],index)=><li key={title}><span>{index+1}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol><Link className="gs-guide-primary-link" href="/zh/ai-pricing">查看产品价格<ArrowRight aria-hidden="true" /></Link><Link href="/zh/data-sources">数据与方法<ArrowRight aria-hidden="true" /></Link></PublicCard></div>
  </section>;
}
