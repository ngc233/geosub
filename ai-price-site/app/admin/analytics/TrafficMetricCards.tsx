import { Eye, Users, Layers } from 'lucide-react';
import { formatTrafficCount, trafficDelta, trafficPvCoverage, trafficPvExclusions, type TrafficMetric, type TrafficSnapshot } from '../../../lib/admin-traffic-model';
import shared from '../Workspace.module.css';
import styles from './TrafficDashboard.module.css';

export default function TrafficMetricCards({ data, range, metric, onSelect }: {
 data: TrafficSnapshot | null; range: number; metric: TrafficMetric; onSelect: (metric: TrafficMetric) => void;
}) {
 const current = data?.totals.find(t => t.range === range && t.side === 0);
 const previous = data?.totals.find(t => t.range === range && t.side === 1);
 const coverage = trafficPvCoverage(current, data?.days ?? []);
 const previousCoverage = trafficPvCoverage(previous, data?.days ?? []);
 const labels = { pv: '浏览量 PV', uv: '访客 UV · 同意统计的样本', sessions: '会话 Sessions · 同意统计的样本' };
 return <div className={shared.stats}>{(['pv', 'uv', 'sessions'] as const).map(key => {
  const value = current?.[key] ?? null, old = previous?.[key] ?? null;
  const incomplete = key !== 'pv' && Boolean(current?.missing_identity ?? current?.missing_session);
  const previousIncomplete = key !== 'pv' && Boolean(previous?.missing_identity ?? previous?.missing_session);
  const pvPartial = key === 'pv' && (!coverage.complete || !previousCoverage.complete);
  const delta = range === 1 || incomplete || previousIncomplete || pvPartial ? null : trafficDelta(value, old);
  const Icon = key === 'pv' ? Eye : key === 'uv' ? Users : Layers;
  return <button key={key} type="button" data-traffic-metric={key} aria-pressed={metric === key} onClick={() => onSelect(key)}>
   <span className={shared.statIcon}><Icon size={18}/></span>
   <span className={shared.statBody}>
    <span>{labels[key]}</span>
    <strong>{formatTrafficCount(value)}<small>{key === 'uv' ? '位样本访客' : key === 'pv' ? '次浏览' : '次样本会话'}</small></strong>
    <em>{delta !== null ? `较上期 ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%` :
     value === null ? '数据不可用' : range === 1 ? '当日累计，尚未结束' : pvPartial ? '覆盖不完整，不计算环比' : incomplete || previousIncomplete ? '样本标识不完整，不计算环比' : '上期不可比较'}</em>
    {key === 'pv' ? <>
     <span className={styles.metricNote}>{coverage.text}{value !== null && !coverage.complete ? ' · 可用日期合计' : ''}</span>
     {coverage.reason ? <span className={styles.metricNote}>{coverage.reason}</span> : null}
     {trafficPvExclusions(current) ? <span className={styles.metricNote}>{trafficPvExclusions(current)}</span> : null}
    </> : incomplete ? <span className={styles.metricNote}>仅含标识完整的样本；{formatTrafficCount(current?.missing_identity ?? current?.missing_session)} 条浏览缺少访客或会话标识</span> : null}
   </span>
  </button>;
 })}</div>;
}
