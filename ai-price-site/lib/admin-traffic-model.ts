export type TrafficMetric = 'pv' | 'uv' | 'sessions';
export type TrafficPvReason = 'missing_field' | 'missing_raw' | 'missing_classification' | 'classification_mismatch' | 'unavailable';
export type TrafficDay = {
 date: string; pv: number | null; uv: number | null; sessions: number | null;
 consented_views: number; missing_session: number; raw_views: number | null;
 pv_reason?: TrafficPvReason | null;
 automation_views?: number | null; internal_views?: number | null; unclassified_views?: number | null;
 sample_views?: number; missing_identity?: number;
};
export type TrafficTotal = Omit<TrafficDay, 'date' | 'raw_views'> & { range: number; side: number; start: string; end: string };
export type TrafficSnapshot = { version: 2; capturedAt: string; timezone: 'UTC'; source?: string; days: TrafficDay[]; totals: TrafficTotal[] };
const pvReasons: Record<TrafficPvReason, string> = {
 missing_field: '返回数据缺少 PV 字段',
 missing_raw: '缺少原始浏览计数',
 missing_classification: '缺少访问分类计数',
 classification_mismatch: '分类计数与原始计数不一致',
 unavailable: 'PV 数据不可用，未提供具体原因',
};
export function validateTrafficSnapshot(value: unknown): TrafficSnapshot {
 const d = value as TrafficSnapshot;
 if (!d || d.version !== 2 || d.timezone !== 'UTC' || !Number.isFinite(Date.parse(d.capturedAt)) || !Array.isArray(d.days) || !Array.isArray(d.totals)) throw Error('流量快照格式错误：需要含访客会话组合口径的 v2 快照');
 const number = (v: unknown) => v === null || (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0);
 function normalize<T extends TrafficDay | TrafficTotal>(row: T): T {
  if (!row || !['uv', 'sessions', 'consented_views', 'missing_session'].every(k => number(row[k as keyof T]))) throw Error('流量计数无效');
  if (row.pv !== undefined && !number(row.pv)) throw Error('流量计数无效');
  for (const key of ['automation_views', 'internal_views', 'unclassified_views', 'sample_views', 'missing_identity'] as const) {
   if (row[key] !== undefined && !number(row[key])) throw Error('流量计数无效');
  }
  if (row.pv_reason != null && !Object.hasOwn(pvReasons, row.pv_reason)) throw Error('流量缺失原因无效');
  // Missing PV is a metric-level failure, never a reason to discard UV/Sessions.
  return { ...row, pv: row.pv ?? null, pv_reason: row.pv === undefined ? 'missing_field' : row.pv === null ? row.pv_reason ?? 'unavailable' : null };
 }
 const days = d.days.map(normalize), totals = d.totals.map(normalize);
 if (new Set(days.map(r => r.date)).size !== days.length || !days.every(r => /^\d{4}-\d{2}-\d{2}$/.test(r.date))) throw Error('流量日期重复或无效');
 return { ...d, days, totals };
}
export const formatTrafficCount = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString('zh-CN');
export function trafficPvReason(row: Pick<TrafficDay, 'pv' | 'pv_reason'>): string {
 return row.pv == null ? pvReasons[row.pv_reason ?? (row.pv === undefined ? 'missing_field' : 'unavailable')] : '';
}
export function trafficPvCoverage(total: TrafficTotal | undefined, days: TrafficDay[]) {
 const expected = total?.range ?? 0;
 const rows = total ? days.filter(d => d.date >= total.start && d.date <= total.end) : [];
 const covered = rows.filter(d => d.pv != null).length;
 const reasons = new Map<string, number>();
 for (const row of rows.filter(d => d.pv == null)) {
  const reason = trafficPvReason(row);
  reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
 }
 if (rows.length < expected) reasons.set('缺少日期记录', expected - rows.length);
 const reasonText = [...reasons].map(([reason, count]) => `${reason} ${count} 天`).join('；');
 const totalReason = total?.pv == null && (total?.pv_reason === 'missing_field' || !reasonText) ? (total ? trafficPvReason(total) : '流量数据暂时无法读取') : '';
 return {
  covered, expected, complete: expected > 0 && covered === expected && total?.pv != null,
  text: `覆盖 ${covered}/${expected} 天`,
  reason: [totalReason, reasonText].filter(Boolean).join('；'),
 };
}
export function trafficPvExclusions(row: TrafficTotal | undefined): string {
 if (!row || row.pv == null) return '';
 const values = [row.automation_views, row.internal_views, row.unclassified_views];
 if (values.some(v => v == null)) return '排除数量明细不可用';
 return `已覆盖日期排除：自动化 ${formatTrafficCount(values[0])}、内部 ${formatTrafficCount(values[1])}、未分类 ${formatTrafficCount(values[2])}`;
}
export function trafficCsv(rows: TrafficDay[], capturedAt: string, source = '') {
 const cell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
 return ['date_utc,pv_eligible,pv_available,pv_missing_reason,excluded_automation,excluded_internal,excluded_unclassified,visitors_consented_complete_identity,sessions_consented_visitor_scoped,sample_page_views,consented_page_views,missing_identity_events,missing_session_events,partial_day,captured_at,source',
  ...rows.map(r => [r.date, r.pv, r.pv != null ? 'yes' : 'no', trafficPvReason(r), r.automation_views, r.internal_views, r.unclassified_views, r.uv, r.sessions, r.sample_views, r.consented_views, r.missing_identity, r.missing_session, r.date === capturedAt.slice(0, 10) ? 'yes' : 'no', capturedAt, source].map(cell).join(',')),
 ].join('\n');
}
export function trafficDelta(current:number|null,previous:number|null){return current===null||previous===null||previous===0?null:(current-previous)/previous*100;}
/** Shape-preserving cubic interpolation: no overshoot between observed values. Missing days split paths. */
export function trafficPaths(points:Array<{x:number;y:number|null}>):string[]{
 const groups:Array<Array<{x:number;y:number}>>=[];let group:Array<{x:number;y:number}>=[];
 for(const p of points){if(p.y===null){if(group.length)groups.push(group);group=[];}else group.push({x:p.x,y:p.y});}if(group.length)groups.push(group);
 return groups.map(g=>{let path=`M${g[0].x},${g[0].y}`;const slopes=g.slice(1).map((p,i)=>(p.y-g[i].y)/(p.x-g[i].x));const tangent=g.map((_,i)=>i===0?slopes[0]||0:i===g.length-1?slopes[i-1]:slopes[i-1]*slopes[i]<=0?0:2/(1/slopes[i-1]+1/slopes[i]));for(let i=1;i<g.length;i++){const a=g[i-1],b=g[i],h=(b.x-a.x)/3;path+=` C${a.x+h},${a.y+h*tangent[i-1]} ${b.x-h},${b.y-h*tangent[i]} ${b.x},${b.y}`;}return path;});
}
