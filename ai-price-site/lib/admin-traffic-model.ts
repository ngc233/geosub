export type TrafficMetric='pv'|'uv'|'sessions'|'suspected';
export type TrafficDay={date:string;pv:number|null;suspected:number|null;screened_views:number|null;excluded_views:number|null;uv:number|null;sessions:number|null;consented_views:number;missing_session:number;raw_views:number|null};
export type TrafficTotal=Omit<TrafficDay,'date'>&{range:number;side:number;start:string;end:string};
export type TrafficSnapshot={version:2;capturedAt:string;timezone:'UTC';source?:string;days:TrafficDay[];totals:TrafficTotal[]};
export function validateTrafficSnapshot(value:unknown):TrafficSnapshot {
 const d=value as TrafficSnapshot;
 if(!d||d.version!==2||d.timezone!=='UTC'||!Number.isFinite(Date.parse(d.capturedAt))||!Array.isArray(d.days)||!Array.isArray(d.totals))throw Error('流量快照格式错误：需要服务端筛选口径');
 const number=(v:unknown)=>v===null||(typeof v==='number'&&Number.isSafeInteger(v)&&v>=0);
 for(const r of [...d.days,...d.totals]){
  if(!r||!['pv','suspected','screened_views','excluded_views','raw_views','uv','sessions','consented_views','missing_session'].every(k=>number(r[k as keyof typeof r])))throw Error('流量计数无效');
  if(r.screened_views!==null&&(r.raw_views===null||r.screened_views>r.raw_views||r.pv===null||r.suspected===null||r.excluded_views===null||r.pv+r.suspected+r.excluded_views!==r.screened_views))throw Error('流量筛选计数不一致');
  if(r.screened_views===null&&(r.pv!==null||r.suspected!==null||r.excluded_views!==null))throw Error('流量筛选覆盖缺失');
 }
 if(new Set(d.days.map(r=>r.date)).size!==d.days.length||!d.days.every(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.date)))throw Error('流量日期重复或无效');
 return d;
}
export function trafficScreeningComplete(row: Pick<TrafficDay,'raw_views'|'screened_views'>|undefined){return Boolean(row&&row.screened_views!==null&&row.raw_views!==null&&row.screened_views===row.raw_views);}
export function trafficCsv(rows:TrafficDay[],capturedAt:string,source=''){
 const cell=(v:unknown)=>`"${String(v??'').replaceAll('"','""')}"`;
 return ['date_utc,pv_screened,suspected_automation,other_excluded,screened_views,raw_views,screening_complete,visitors_consented,sessions_recorded,missing_session_events,partial_day,captured_at,source',...rows.map(r=>[r.date,r.pv,r.suspected,r.excluded_views,r.screened_views,r.raw_views,trafficScreeningComplete(r)?'yes':'no',r.uv,r.sessions,r.missing_session,r.date===capturedAt.slice(0,10)?'yes':'no',capturedAt,source].map(cell).join(','))].join('\n');
}
export function trafficDelta(current:number|null,previous:number|null){return current===null||previous===null||previous===0?null:(current-previous)/previous*100;}
/** Shape-preserving cubic interpolation: no overshoot between observed values. Missing days split paths. */
export function trafficPaths(points:Array<{x:number;y:number|null}>):string[]{
 const groups:Array<Array<{x:number;y:number}>>=[];let group:Array<{x:number;y:number}>=[];
 for(const p of points){if(p.y===null){if(group.length)groups.push(group);group=[];}else group.push({x:p.x,y:p.y});}if(group.length)groups.push(group);
 return groups.map(g=>{let path=`M${g[0].x},${g[0].y}`;const slopes=g.slice(1).map((p,i)=>(p.y-g[i].y)/(p.x-g[i].x));const tangent=g.map((_,i)=>i===0?slopes[0]||0:i===g.length-1?slopes[i-1]:slopes[i-1]*slopes[i]<=0?0:2/(1/slopes[i-1]+1/slopes[i]));for(let i=1;i<g.length;i++){const a=g[i-1],b=g[i],h=(b.x-a.x)/3;path+=` C${a.x+h},${a.y+h*tangent[i-1]} ${b.x-h},${b.y-h*tangent[i]} ${b.x},${b.y}`;}return path;});
}
