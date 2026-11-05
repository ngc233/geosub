'use client';
import { adminButtonClassName } from "@/components/admin/AdminButton";
import { useEffect, useRef, useState, useTransition } from 'react';
import { ArrowUpRight, Download, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AdminSegmentedControl from '../../../components/admin/AdminSegmentedControl';
import AdminLink from '../../../components/admin/AdminLink';
import { formatTrafficCount, trafficCsv, trafficPvCoverage, trafficPvReason, trafficPaths, type TrafficMetric, type TrafficSnapshot } from '../../../lib/admin-traffic-model';
import { getNiceAxisScale } from '../dashboard-trend';
import shared from '../Workspace.module.css';
import styles from './TrafficDashboard.module.css';
import TrafficMetricCards from './TrafficMetricCards';
const labels={pv:'浏览量',uv:'访客样本',sessions:'会话样本'};
const definitions={pv:'已分类浏览量 · 排除已标记的内部、自动化和未知访问',uv:'已同意统计的访客样本 · 所选周期内按匿名标识去重，仅含访客和会话标识完整的事件',sessions:'已同意统计的会话样本 · 所选周期内按访客与会话标识组合去重'};
const fmt=formatTrafficCount;
export default function TrafficDashboard({data}:{data:TrafficSnapshot|null}){
 const [range,setRange]=useState(7),[metric,setMetric]=useState<TrafficMetric>('pv'),[compare,setCompare]=useState(true),[selected,setSelected]=useState(0);
 const router=useRouter();
 const [refreshing,startRefresh]=useTransition();
 const chartContainer=useRef<HTMLElement>(null);
 const [chartWidth,setChartWidth]=useState(880);
 useEffect(()=>{const element=chartContainer.current;if(!element)return;const observer=new ResizeObserver(([entry])=>setChartWidth(Math.max(280,entry.contentRect.width)));observer.observe(element);return()=>observer.disconnect();},[]);
 const current=data?.totals.find(t=>t.range===range&&t.side===0),previous=data?.totals.find(t=>t.range===range&&t.side===1);
 const pvCoverage=trafficPvCoverage(current,data?.days??[]);
 const rows=data?.days.filter(d=>current&&d.date>=current.start&&d.date<=current.end)||[];
 const before=data?.days.filter(d=>previous&&d.date>=previous.start&&d.date<=previous.end)||[];
 const index=Math.min(selected,Math.max(0,rows.length-1)),point=rows[index];
 const max=Math.max(1,...rows.map(d=>d[metric]||0),...(compare&&range!==1?before.map(d=>d[metric]||0):[]));
 const top=getNiceAxisScale(max).axisMax;const plotWidth=chartWidth-88;const x=(i:number)=>54+(rows.length<2?plotWidth/2:i*plotWidth/(rows.length-1));const y=(v:number)=>220-v/top*180;
 const paths=(values:typeof rows)=>trafficPaths(values.map((d,i)=>({x:x(i),y:d[metric]===null?null:y(d[metric]!)})));
 function changeRange(n:number){setRange(n);setSelected(0);}
 function download(){const csv=trafficCsv(rows,data?.capturedAt??'',data?.source);const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`geosub-traffic-${current?.start}-${current?.end}.csv`;a.click();URL.revokeObjectURL(url);}
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
  <TrafficMetricCards data={data} range={range} metric={metric} onSelect={key=>{setMetric(key);setSelected(0);}}/>
  <section ref={chartContainer} className={shared.panel}>
   <div className={shared.panelHead}>
    <div><h2 className="text-base font-semibold text-admin-text">{labels[metric]}趋势</h2><p>{definitions[metric]}</p></div>
    <button className={adminButtonClassName({variant:"secondary"})} disabled={!rows.length} onClick={download}>
     <Download size={14}/>导出明细
    </button>
   </div>
   <div className={styles.chartControls}><span><i/>本期</span>{range!==1?<label><input type="checkbox" checked={compare} onChange={e=>setCompare(e.target.checked)}/>显示上期对比（虚线）</label>:<span>当日未结束</span>}<span>缺失日期断开，不补零</span></div>
   {!data?<div className={shared.empty}>数据不可用</div>:rows.every(r=>r[metric]===null)?<div className={shared.empty}>这个周期尚无可用的{labels[metric]}数据。</div>:<>
   <svg className={styles.chart} viewBox={`0 0 ${chartWidth} 265`} role="img" aria-label={`${labels[metric]}按日趋势，精确值见下方日期控件和明细表`}>
    {[0,1,2,3,4].map(i=><g key={i}><line x1="54" x2={chartWidth-34} y1={40+i*45} y2={40+i*45}/><text x="43" y={44+i*45} textAnchor="end">{fmt(top*(4-i)/4)}</text></g>)}
    {range!==1&&compare?paths(before).map((d,i)=><path className={styles.previous} d={d} key={`p${i}`}/>):null}
    {paths(rows).map((d,i)=><path className={styles.current} d={d} key={i}/>)}
    {rows.map((r,i)=>r[metric]!==null && (i===0||rows[i-1][metric]===null) && (i===rows.length-1||rows[i+1][metric]===null)?<circle key={r.date} cx={x(i)} cy={y(r[metric]!)} r="4"/>:null)}
    {[...new Set([0,Math.floor((rows.length-1)/2),rows.length-1])].filter(i=>rows[i]).map(i=><text x={x(i)} y="250" textAnchor="middle" key={i}>{rows[i].date.slice(5)}</text>)}
    {point?.[metric]!=null?<><line className={styles.cursor} x1={x(index)} x2={x(index)} y1="35" y2="225"/><circle cx={x(index)} cy={y(point[metric]!)} r="5"/></>:null}
    {rows.map((r,i)=><rect className={styles.hit} x={x(i)-Math.max(4,plotWidth/2/Math.max(1,rows.length-1))} width={Math.max(8,plotWidth/Math.max(1,rows.length-1))} y="30" height="200" key={r.date} onPointerMove={()=>setSelected(i)} onClick={()=>setSelected(i)}/>)}</svg>
   <div className={styles.readout} aria-live="polite"><b>{point?.date} · UTC</b><span>{labels[metric]}：{fmt(point?.[metric])}</span>{compare&&range!==1?<span>上期对应日 {before[index]?.date}：{fmt(before[index]?.[metric])}</span>:null}</div>
   <label className={styles.slider}>选择日期（支持触摸及方向键）<input aria-label="选择趋势日期" type="range" min="0" max={Math.max(0,rows.length-1)} value={index} onChange={e=>setSelected(Number(e.target.value))}/></label></>}
   <div className={shared.foot}>每日访客与会话可能跨日重复；上方周期人数和会话数直接按整个周期去重，不能用每日数相加。{current?.missing_identity?` 本期 ${current.missing_identity} 条样本浏览缺少访客或会话标识，不参与样本 PV、访客和会话的可比统计。`:''}</div>
  </section>
  <div className={styles.bottom}>
   <section className={shared.panel}>
    <div className={shared.panelHead}><h2 className="text-base font-semibold text-admin-text">统计口径</h2><ArrowUpRight size={17}/></div>
    <dl className={styles.methods}>
     <dt>浏览量</dt>
     <dd>第一方无 Cookie 日计数的已分类访问。已标记的内部、自动化、未知访问被排除；不能保证每次访问都来自真人。分类之和与原始计数一致时显示合格浏览量；未分类访问只排除自身。周期只合计可用日期并注明覆盖率，不补零。</dd>
     <dt>访客人数</dt>
     <dd>只统计已同意分析、访客和会话标识完整的公开页面访问，按匿名浏览器标识去重。不是全站人数，也不能识别同一人的不同设备。</dd>
     <dt>会话数</dt>
     <dd>同意统计的样本按（匿名访客标识、会话标识）组合去重。同一会话标识对应不同访客时分别计数；缺少标识的事件不推算成新会话。</dd>
     <dt>数据边界</dt>
     <dd>UTC 日界线；样本排除测试页面及已标记测试事件。历史事件缺少内部访问分类，不能保证完全排除内部及自动化访问。记录数量不能证明采集全程正常，数据中断与真实无人访问仍需结合监控判断。</dd>
    </dl>
   </section>
  <section className={shared.panel}>
   <div className={shared.panelHead}><h2 className="text-base font-semibold text-admin-text">数据完整性</h2></div>
   <dl className={shared.details}>
    <div><dt>浏览量有效日期</dt><dd>{pvCoverage.covered} / {pvCoverage.expected}</dd></div>
    <div><dt>标识完整的样本 PV</dt><dd>{fmt(current?.sample_views)}</dd></div>
    <div><dt>已同意样本浏览（含缺标识）</dt><dd>{fmt(current?.consented_views)}</dd></div>
    <div><dt>缺少访客或会话标识</dt><dd>{fmt(current?.missing_identity)}</dd></div>
    <div><dt>本期性质</dt><dd>{range===1?'进行中':'完整自然日区间'}</dd></div>
   </dl>
   <div className={shared.foot}>“—”表示不可用；0 只表示所查记录中的零计数。样本 PV ≥ 样本会话 ≥ 样本访客只适用于同一批标识完整的事件。无 Cookie PV 与样本覆盖范围不同，不比较大小。</div>
  </section></div>
  <p className={styles.source}><AdminLink href="/admin/analytics/details">更多明细：查看原看板的来源、漏斗及事件入口</AdminLink></p>
  <details className={styles.detail}><summary>查看每日精确值与缺失记录</summary><div className={styles.table}><table><thead><tr><th>日期 UTC</th><th>浏览量</th><th>访客样本</th><th>会话样本</th><th>样本 PV</th><th>缺少访客或会话标识</th><th>PV 缺失原因</th></tr></thead><tbody>{rows.map(r=><tr key={r.date}><td>{r.date}</td><td>{fmt(r.pv)}</td><td>{fmt(r.uv)}</td><td>{fmt(r.sessions)}</td><td>{fmt(r.sample_views)}</td><td>{fmt(r.missing_identity)}</td><td>{trafficPvReason(r)}</td></tr>)}</tbody></table></div></details>
 </div>;
}
