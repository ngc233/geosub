'use client';
import { adminButtonClassName } from "@/components/admin/AdminButton";
import { useEffect, useRef, useState, useTransition } from 'react';
import { ArrowUpRight, Download, Eye, Users, Layers, RefreshCw, Bot } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AdminSegmentedControl from '../../../components/admin/AdminSegmentedControl';
import AdminLink from '../../../components/admin/AdminLink';
import { trafficDelta, trafficPaths, trafficScreeningComplete, trafficCsv, type TrafficMetric, type TrafficSnapshot } from '../../../lib/admin-traffic-model';
import { getNiceAxisScale } from '../dashboard-trend';
import shared from '../Workspace.module.css';
import styles from './TrafficDashboard.module.css';
const labels={pv:'正常浏览量',uv:'访客人数',sessions:'会话数',suspected:'疑似爬虫'};
const definitions={pv:'服务端筛选后的浏览量 · 排除疑似爬虫、内部、已标记自动化及未知访问',uv:'已同意统计的访客样本 · 所选周期内按匿名标识去重',sessions:'已同意统计的会话样本 · 所选周期内按会话标识去重',suspected:'服务端识别的疑似自动化访问 · 已从正常浏览量排除，不等于恶意攻击'};
const fmt=(v:number|null|undefined)=>v==null?'—':v.toLocaleString('zh-CN');
export default function TrafficDashboard({data}:{data:TrafficSnapshot|null}){
 const [range,setRange]=useState(7),[metric,setMetric]=useState<TrafficMetric>('pv'),[compare,setCompare]=useState(true),[selected,setSelected]=useState(0);
 const router=useRouter();
 const [refreshing,startRefresh]=useTransition();
 const chartContainer=useRef<HTMLElement>(null);
 const [chartWidth,setChartWidth]=useState(880);
 useEffect(()=>{const element=chartContainer.current;if(!element)return;const observer=new ResizeObserver(([entry])=>setChartWidth(Math.max(280,entry.contentRect.width)));observer.observe(element);return()=>observer.disconnect();},[]);
 const current=data?.totals.find(t=>t.range===range&&t.side===0),previous=data?.totals.find(t=>t.range===range&&t.side===1);
 const rows=data?.days.filter(d=>current&&d.date>=current.start&&d.date<=current.end)||[];
 const before=data?.days.filter(d=>previous&&d.date>=previous.start&&d.date<=previous.end)||[];
 const screenedMetric=metric==='pv'||metric==='suspected';
 const canCompare=range!==1&&(!screenedMetric||(trafficScreeningComplete(current)&&trafficScreeningComplete(previous)));
 const showComparison=compare&&canCompare;
 const screenedRows=rows.filter(r=>r.screened_views!==null);
 const partialNormal=screenedRows.length?screenedRows.reduce((n,r)=>n+(r.pv??0),0):null;
 const partialSuspected=screenedRows.length?screenedRows.reduce((n,r)=>n+(r.suspected??0),0):null;
 const index=Math.min(selected,Math.max(0,rows.length-1)),point=rows[index];
 const max=Math.max(1,...rows.map(d=>d[metric]||0),...(showComparison?before.map(d=>d[metric]||0):[]));
 const top=getNiceAxisScale(max).axisMax;const plotWidth=chartWidth-88;const x=(i:number)=>54+(rows.length<2?plotWidth/2:i*plotWidth/(rows.length-1));const y=(v:number)=>220-v/top*180;
 const paths=(values:typeof rows)=>trafficPaths(values.map((d,i)=>({x:x(i),y:d[metric]===null?null:y(d[metric]!)})));
 function changeRange(n:number){setRange(n);setSelected(0);}
 function download(){const csv=trafficCsv(rows,data?.capturedAt||'',data?.source);const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`geosub-traffic-${current?.start}-${current?.end}.csv`;a.click();URL.revokeObjectURL(url);}
 return <div className={shared.workspace}>
  <div className={styles.heading}>
   <div><h1>流量看板</h1><p>看清访问规模、访客与会话的变化。</p></div>
   <div className="flex flex-wrap items-center gap-3">
    <AdminLink className={adminButtonClassName({variant:"secondary"})} href="/admin">返回工作台</AdminLink>
    <button className={adminButtonClassName({variant:"secondary"})} disabled={refreshing} aria-busy={refreshing}
     onClick={()=>startRefresh(()=>router.refresh())}><RefreshCw size={15}/>{refreshing?"正在读取…":"重新读取"}</button>
   </div>
  </div>
  <div className={styles.toolbar}>
   <AdminSegmentedControl ariaLabel="流量日期范围" size="sm" value={String(range)} onChange={value=>changeRange(Number(value))}
    items={[{value:"1",label:"今天"},{value:"7",label:"近 7 天"},{value:"30",label:"近 30 天"},{value:"90",label:"近 90 天"}]} />
   <span>{current?`${current.start} — ${current.end} · UTC`:'日期不可用'}</span>
  </div>
  {!data?<div role="alert" className={shared.notice}>流量数据暂时无法读取。请重试；当前未显示零值或演示数据。</div>:<p className={styles.source}>{data.source} · 截至 {new Date(data.capturedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})} 北京时间。{range===1?'今天尚未结束，不与完整昨日比较。':'不含今天，比较前一个等长完整周期。'} {data.source?.includes('快照')?'重新读取只刷新本地文件，不会自动重新采集生产数据。':''}</p>}
  {data&&!trafficScreeningComplete(current)?<div role="status" className={shared.notice}>所选周期未全部经过服务端筛选。正常浏览量和疑似爬虫只显示启用后的已筛选记录；未筛选历史不记为正常，也不补零。跨缺失日期的周期总计显示“—”。</div>:null}
  <div className={`${shared.stats} ${styles.stats}`}>{(['pv','suspected','uv','sessions'] as const).map(key=>{
   const value=current?.[key]??null,old=previous?.[key]??null;
   const incomplete=key==='sessions'&&Boolean(current?.missing_session);
   const screening=key==='pv'||key==='suspected';
   const partial=screening&&!trafficScreeningComplete(current);
   const delta=range===1||incomplete||key==='sessions'&&Boolean(previous?.missing_session)||screening&&(!trafficScreeningComplete(current)||!trafficScreeningComplete(previous))?null:trafficDelta(value,old);
   const Icon=key==='pv'?Eye:key==='suspected'?Bot:key==='uv'?Users:Layers;
   return <button key={key} aria-pressed={metric===key} onClick={()=>{setMetric(key);setSelected(0);}}>
    <span className={shared.statIcon}><Icon size={18}/></span>
    <span className={shared.statBody}>
     <span>{labels[key]} {key==='pv'?'PV':key==='uv'?'UV':key==='sessions'?'Sessions':''}</span>
     <strong>{incomplete&&value!==null?'≥ ':''}{fmt(value)}<small>{key==='uv'?'位样本访客':screening?'次浏览':'次会话'}</small></strong>
     <em>{partial?(value===null?'筛选记录不足，见下方已筛选部分':'仅已筛选部分，不代表完整当日'):delta===null?(range===1?'当日累计，尚未结束':value===null?'所选周期数据不足':'上期不可比较'):
      `较上期 ${delta>=0?'+':''}${delta.toFixed(1)}%`}</em>
    </span>
   </button>;
  })}</div>
  <section ref={chartContainer} className={shared.panel}>
   <div className={shared.panelHead}>
    <div><h2 className="text-base font-semibold text-admin-text">{labels[metric]}趋势</h2><p>{definitions[metric]}</p></div>
    <button className={adminButtonClassName({variant:"secondary"})} disabled={!rows.length} onClick={download}>
     <Download size={14}/>导出明细
    </button>
   </div>
   <div className={styles.chartControls}><span><i/>本期</span>{range!==1?<label><input type="checkbox" disabled={!canCompare} checked={showComparison} onChange={e=>setCompare(e.target.checked)}/>显示上期对比（虚线）</label>:<span>当日未结束</span>}{screenedMetric&&range!==1&&!canCompare?<span>筛选覆盖不完整，暂不比较</span>:null}<span>缺失日期断开，不补零</span></div>
   {!data?<div className={shared.empty}>数据不可用</div>:rows.every(r=>r[metric]===null)?<div className={shared.empty}>这个周期尚无可用的{labels[metric]}数据。</div>:<>
   <svg className={styles.chart} viewBox={`0 0 ${chartWidth} 265`} role="img" aria-label={`${labels[metric]}按日趋势，精确值见下方日期控件和明细表`}>
    {[0,1,2,3,4].map(i=><g key={i}><line x1="54" x2={chartWidth-34} y1={40+i*45} y2={40+i*45}/><text x="43" y={44+i*45} textAnchor="end">{fmt(top*(4-i)/4)}</text></g>)}
    {showComparison?paths(before).map((d,i)=><path className={styles.previous} d={d} key={`p${i}`}/>):null}
    {paths(rows).map((d,i)=><path className={styles.current} d={d} key={i}/>)}
    {rows.map((r,i)=>r[metric]!==null && (i===0||rows[i-1][metric]===null) && (i===rows.length-1||rows[i+1][metric]===null)?<circle key={r.date} cx={x(i)} cy={y(r[metric]!)} r="4"/>:null)}
    {[...new Set([0,Math.floor((rows.length-1)/2),rows.length-1])].filter(i=>rows[i]).map(i=><text x={x(i)} y="250" textAnchor="middle" key={i}>{rows[i].date.slice(5)}</text>)}
    {point?.[metric]!=null?<><line className={styles.cursor} x1={x(index)} x2={x(index)} y1="35" y2="225"/><circle cx={x(index)} cy={y(point[metric]!)} r="5"/></>:null}
    {rows.map((r,i)=><rect className={styles.hit} x={x(i)-Math.max(4,plotWidth/2/Math.max(1,rows.length-1))} width={Math.max(8,plotWidth/Math.max(1,rows.length-1))} y="30" height="200" key={r.date} onPointerMove={()=>setSelected(i)} onClick={()=>setSelected(i)}/>)}</svg>
   <div className={styles.readout} aria-live="polite"><b>{point?.date} · UTC</b><span>{labels[metric]}：{metric==='sessions'&&point?.missing_session&&point.sessions!==null?'≥ ':''}{fmt(point?.[metric])}</span>{screenedMetric&&point?.screened_views!=null&&!trafficScreeningComplete(point)?<span>仅已筛选部分</span>:null}{showComparison?<span>上期对应日 {before[index]?.date}：{fmt(before[index]?.[metric])}</span>:null}</div>
   <label className={styles.slider}>选择日期（支持触摸及方向键）<input aria-label="选择趋势日期" type="range" min="0" max={Math.max(0,rows.length-1)} value={index} onChange={e=>setSelected(Number(e.target.value))}/></label></>}
   <div className={shared.foot}>每日访客与会话可能跨日重复；上方周期人数和会话数直接按整个周期去重，不能用每日数相加。{current?.missing_session?` 本期 ${current.missing_session} 条样本浏览缺少会话标识，会话数仅为已记录下限。`:''}</div>
  </section>
  <div className={styles.bottom}>
   <section className={shared.panel}>
    <div className={shared.panelHead}><h2 className="text-base font-semibold text-admin-text">统计口径</h2><ArrowUpRight size={17}/></div>
    <dl className={styles.methods}>
     <dt>正常浏览量</dt>
     <dd>第一方无 Cookie 计数，经过服务端筛选并排除疑似爬虫、内部、已标记自动化及未知访问。仍可能漏过模拟真人的抓取，不等于已验证真人。未启用筛选的历史不混入。</dd>
     <dt>疑似爬虫</dt>
     <dd>明确的自动化标识、矛盾请求头，或同一来源与浏览器在60秒内超过120次且覆盖至少30条路径。只分流统计，不拦截浏览；分布式或低频抓取可能漏过。</dd>
     <dt>访客人数</dt>
     <dd>只统计已同意分析的公开页面访问，按匿名浏览器标识去重。不是全站人数，也不能识别同一人的不同设备。</dd>
     <dt>会话数</dt>
     <dd>按已记录的会话标识去重，统计在所选周期内发生页面浏览的会话。历史缺少标识的事件不推算成新会话。</dd>
     <dt>数据边界</dt>
     <dd>UTC 日界线；排除测试页面及已标记测试事件。记录数量不能证明采集全程正常，数据中断与真实无人访问仍需结合监控判断。</dd>
    </dl>
   </section>
  <section className={shared.panel}>
   <div className={shared.panelHead}><h2 className="text-base font-semibold text-admin-text">筛选覆盖与核对</h2></div>
   <dl className={shared.details}>
    <div><dt>原始浏览总量</dt><dd>{fmt(current?.raw_views)}</dd></div>
    <div><dt>已有筛选记录的日期</dt><dd>{screenedRows.length} / {rows.length}</dd></div>
    <div><dt>已筛选部分 · 正常</dt><dd>{fmt(partialNormal)}</dd></div>
    <div><dt>已筛选部分 · 疑似爬虫</dt><dd>{fmt(partialSuspected)}</dd></div>
    <div><dt>已筛选部分 · 其他排除</dt><dd>{fmt(screenedRows.length?screenedRows.reduce((n,r)=>n+(r.excluded_views??0),0):null)}</dd></div>
    <div><dt>尚未筛选的原始记录</dt><dd>{fmt(current?.raw_views!=null?current.raw_views-screenedRows.reduce((n,r)=>n+(r.screened_views??0),0):null)}</dd></div>
    <div><dt>浏览量有效日期</dt><dd>{rows.filter(r=>r.pv!==null).length} / {rows.length}</dd></div>
    <div><dt>已同意样本浏览</dt><dd>{fmt(current?.consented_views)}</dd></div>
    <div><dt>缺少会话标识</dt><dd>{fmt(current?.missing_session)}</dd></div>
    <div><dt>本期性质</dt><dd>{range===1?'进行中':'完整自然日区间'}</dd></div>
   </dl>
   <div className={shared.foot}>原始总量保留所有已接受的计数请求。其他排除包括内部、已标记自动化和未知访问。“—”表示不可用，0 表示已筛选记录中的零计数。访客和会话仍是同意统计的样本。</div>
  </section></div>
  <p className={styles.source}><AdminLink href="/admin/analytics/details">更多明细：查看原看板的来源、漏斗及事件入口</AdminLink></p>
  <details className={styles.detail}><summary>查看每日精确值与缺失记录</summary><div className={styles.table}><table><thead><tr><th>日期 UTC</th><th>正常浏览量</th><th>疑似爬虫</th><th>其他排除</th><th>原始总量</th><th>筛选覆盖</th><th>访客样本</th><th>会话样本</th><th>缺少会话标识</th></tr></thead><tbody>{rows.map(r=><tr key={r.date}><td>{r.date}</td><td>{fmt(r.pv)}</td><td>{fmt(r.suspected)}</td><td>{fmt(r.excluded_views)}</td><td>{fmt(r.raw_views)}</td><td>{r.screened_views===null?'未筛选 / 不可用':trafficScreeningComplete(r)?'完整':'部分'}</td><td>{fmt(r.uv)}</td><td>{r.missing_session&&r.sessions!==null?'≥ ':''}{fmt(r.sessions)}</td><td>{r.missing_session}</td></tr>)}</tbody></table></div></details>
 </div>;
}
