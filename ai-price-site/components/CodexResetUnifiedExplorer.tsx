"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import AnimatedDisclosure from "./ui/AnimatedDisclosure";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { PublicCard, PublicFilters, PublicIconButton, PublicTextButton } from "./ui/PublicControls";
import { resetDayTone, resetMonthCounts, type ResetCalendarEntry } from "../lib/codex-reset-display";
import styles from "./CodexResetUnified.module.css";

function subscribeMobile(change:()=>void){const media=matchMedia("(max-width:767px)");media.addEventListener("change",change);return()=>media.removeEventListener("change",change);}
const mobileSnapshot=()=>matchMedia("(max-width:767px)").matches;
const serverMobile=()=>false;

export default function CodexResetUnifiedExplorer({entries,children,initialMonth,today}:{entries:ResetCalendarEntry[];children:ReactNode[];initialMonth:string;today:string}) {
  const [month,setMonth]=useState(initialMonth),[day,setDay]=useState<string|null>(null),[type,setType]=useState("all"),[showCalendar,setShowCalendar]=useState(true);
  const mobile=useSyncExternalStore(subscribeMobile,mobileSnapshot,serverMobile);
  const [showStatistics,setShowStatistics]=useState<boolean|undefined>();
  const [year,number]=month.split("-").map(Number),offset=(new Date(Date.UTC(year,number-1,1)).getUTCDay()+6)%7,days=new Date(Date.UTC(year,number,0)).getUTCDate();
  const counts=resetMonthCounts(entries,month),filtered=entries.map((entry,index)=>({entry,index})).filter(({entry})=>(type==="all"||entry.type===type)&&(!day||entry.date.slice(0,10)===day));
  const types=[["all","全部"],["automatic_reset","额外重置"],["banked_reset_grant","重置权益"],["rule_change","规则调整"]];
  const selected=entries.filter(e=>(type==="all"||e.type===type)&&(day?e.date.slice(0,10)===day:e.date.slice(0,7)===month));
  function moveMonth(amount:number){setMonth(new Date(Date.UTC(year,number-1+amount,1)).toISOString().slice(0,7));setDay(null);}
  return <section className={styles.explorer} aria-label="公告与更新">
    <PublicCard className={styles.timeline}>
      <div className={styles.listHeading}><h2>最近动态</h2><span aria-live="polite">{filtered.length} 条本页记录{day?` · ${day}`:""}</span></div>
      <PublicFilters label="按事件类型筛选" items={types.map(([value,label])=>({value,label:`${label} ${value==="all"?entries.length:entries.filter(e=>e.type===value).length}`}))} value={type} onChange={setType} className={styles.filters}/>
      <div className="gs-motion-list" key={`${type}-${day}`} >{filtered.length?filtered.map(({entry,index})=><div className={styles.timelineItem} data-codex-tone={entry.tone} key={entry.id}>{children[index]}</div>):<div className={styles.noMatch} role="status"><h3>没有匹配的收录记录</h3><p>试试其他类型或清除日期筛选。这不表示没有发生重置。</p><PublicTextButton onClick={()=>{setType("all");setDay(null);}}>查看全部动态</PublicTextButton></div>}</div>
    </PublicCard>
    <aside className={styles.calendarAside}>
      <PublicCard className={styles.calendar}>
        <AnimatedDisclosure className="gs-codex-calendar" title={<>收录日历<CalendarDays aria-hidden="true"/></>} open={showCalendar} onOpenChange={setShowCalendar}>
        <div id="codex-calendar-body">
          <div className={styles.monthControl}><PublicIconButton onClick={()=>moveMonth(-1)} aria-label="上个月"><ChevronLeft aria-hidden="true"/></PublicIconButton><strong aria-live="polite">{year} 年 {number} 月</strong><PublicIconButton onClick={()=>moveMonth(1)} aria-label="下个月"><ChevronRight aria-hidden="true"/></PublicIconButton></div>
          <div className={styles.week} aria-hidden="true">{["一","二","三","四","五","六","日"].map(n=><span key={n}>{n}</span>)}</div>
          <div className={styles.days}>{Array.from({length:offset},(_,i)=><span key={`blank-${i}`}/>)}{Array.from({length:days},(_,i)=>{
            const date=`${month}-${String(i+1).padStart(2,"0")}`,onDate=entries.filter(e=>e.date.slice(0,10)===date&&(type==="all"||e.type===type)),tone=resetDayTone(onDate),grant=onDate.some(e=>e.tone==="grant");
            return <button key={date} type="button" data-codex-date={date} data-codex-tone={onDate.length?tone:"none"} data-codex-today={date===today} aria-current={date===today?"date":undefined} disabled={!onDate.length} aria-pressed={day===date} aria-label={`${date} · ${onDate.length} 条收录${date===today?" · 今天（UTC）":""}${onDate.length?" · "+[...new Set(onDate.map(e=>e.status))].join(" / "):""}${grant?" · 含重置权益":""}`} onClick={()=>setDay(day===date?null:date)}><span>{i+1}{grant&&tone==="confirmed"&&<i className={styles.mixedGrant} aria-hidden="true"/>}</span></button>;
          })}</div>
          <div className={styles.legend}><span><i data-tone="confirmed"/>来源确认重置</span><span><i data-tone="grant"/>重置权益</span><span><i data-tone="today"/>今天（UTC）</span><span><i data-tone="pending"/>预告 / 进行中</span></div>
          <p className={styles.small}>按本页记录的首次收录日期（UTC）展示，不代表权益生效时间或个人重置时间。</p>
          {selected.length>0&&<div className={styles.selected} data-codex-tone={resetDayTone(day?selected:selected.slice(0,1))}>{selected.slice(0,day?selected.length:1).map(e=><a key={e.id} href={`#event-${e.id}`}>{e.date.slice(5,10)} · {e.status} · {e.title}</a>)}</div>}
          {day&&<PublicTextButton className={styles.clearDay} onClick={()=>setDay(null)}><X aria-hidden="true"/>{day} · 清除日期筛选</PublicTextButton>}
        </div></AnimatedDisclosure>
      </PublicCard>
    </aside>
    <PublicCard className={styles.statistics}><AnimatedDisclosure title="记录统计" open={showStatistics??!mobile} onOpenChange={setShowStatistics}><p className={styles.small}>{year} 年 {number} 月 · 本页</p><dl><div><dt>来源确认的额外重置</dt><dd data-codex-count="confirmed">{counts.confirmed}<span> 条</span></dd></div><div><dt>重置权益记录</dt><dd data-codex-count="grants">{counts.grants}<span> 条</span></dd></div></dl><p className={styles.small}>分别计数，不合并为重置次数。仅计本页所载记录，不是全历史统计或个人到账次数。</p></AnimatedDisclosure></PublicCard>
  </section>;
}
