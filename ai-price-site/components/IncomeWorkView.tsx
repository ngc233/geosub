"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { ChevronDown, Info } from "lucide-react";
import CountryFlag from "./CountryFlag";
import AnimatedDisclosure from "./ui/AnimatedDisclosure";
import { getIncomeWorkRows, workHourSquares, WORK_HOURS_PER_MONTH, type WorkIncome } from "../lib/income-work-time";
import { incomeWorkSource, workDurationParts, workSquareColumns } from "../lib/income-work-display";
import type { ProductPlan } from "../lib/public-pricing-model";

function subscribe(change: () => void) { const media = matchMedia("(min-width:768px)"); media.addEventListener("change",change); return () => media.removeEventListener("change",change); }
function desktop() { return matchMedia("(min-width:768px)").matches; }
function serverClosed() { return false; }

function Duration({ hours }: { hours: number }) {
  const parts = workDurationParts(hours);
  if (!parts) return <>—</>;
  if (parts.underMinute) return <>不足 <span className="gs-work-number">1</span> 分钟</>;
  return <>{parts.hours > 0 && <><span className="gs-work-number">{parts.hours}</span> 小时</>}{parts.minutes > 0 && <> <span className="gs-work-number">{parts.minutes}</span> 分钟</>}</>;
}

function WorkSquares({ hours, code, revealed, onReveal }: { hours: number; code: string; revealed: boolean; onReveal: (code: string) => void }) {
  const root = useRef<HTMLDivElement>(null);
  // Rows restored by "show all" keep their earlier reveal instead of replaying on remount.
  const [animateReveal] = useState(() => !revealed);
  const squares = workHourSquares(hours), count = squares.full + (squares.partial > 0 ? 1 : 0);
  useEffect(() => {
    if (revealed || !root.current) return;
    if (!("IntersectionObserver" in window)) { onReveal(code); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting && entry.intersectionRect.height > 0 && entry.intersectionRect.width > 0)) { observer.disconnect(); onReveal(code); }
    }, { threshold: .1 });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [code, revealed, onReveal]);
  return <div ref={root} className="gs-r2-squares" data-work-revealed={revealed} data-work-animate={animateReveal || undefined} data-work-hours={hours} aria-label={`${hours.toFixed(2)} 小时`}>
    {Array.from({length:count},(_,index) => <span key={index} aria-hidden="true" data-work-partial={index === squares.full && squares.partial > 0 ? "" : undefined} style={{"--gs-work-progress":index / Math.max(1,count - 1)} as CSSProperties} />)}
  </div>;
}

export default function IncomeWorkView({ plan, name, incomes }: { plan: ProductPlan; name: string; incomes: WorkIncome[] }) {
  const isDesktop = useSyncExternalStore(subscribe,desktop,serverClosed);
  const [preference,setPreference] = useState<boolean | null>(null), [all,setAll] = useState(false);
  const [revealed,setRevealed] = useState<string[]>([]);
  const reveal = useCallback((code: string) => setRevealed(previous => previous.includes(code) ? previous : [...previous,code]),[]);
  const chart = useRef<HTMLDivElement>(null);
  const rows = getIncomeWorkRows(plan,incomes);
  const preview = [...rows.slice(0,5),...rows.slice(-3),...rows.filter(row=>row.code === "US")].filter((row,index,items)=>items.findIndex(item=>item.code === row.code) === index).sort((a,b)=>b.hours-a.hours);
  const shown = all ? rows : preview;
  const lowest = [...plan.regions].sort((a,b)=>a.priceUsd-b.priceUsd)[0];
  const lowestWork = rows.find(row=>row.code === lowest?.code);
  const maximum = Math.max(1,...shown.map(row=>Math.min(100,Math.ceil(row.hours))));
  useLayoutEffect(() => {
    const root = chart.current, bar = root?.querySelector<HTMLElement>(".gs-r2-squares");
    if (!root || !bar) return;
    const update = () => {
      const css = getComputedStyle(bar);
      const columns = workSquareColumns(bar.getBoundingClientRect().width,Number.parseFloat(css.getPropertyValue("--gs-work-square-size")),Number.parseFloat(css.getPropertyValue("--gs-work-square-gap")),maximum);
      root.style.setProperty("--gs-work-columns",String(columns));
    };
    update();
    const observer = new ResizeObserver(update); observer.observe(bar);
    return () => observer.disconnect();
  }, [maximum,shown.length,plan.slug]);
  return <AnimatedDisclosure className="gs-r2-work" open={preference ?? isDesktop} onOpenChange={setPreference}
    title={<><span>一个月 {name}，相当于工作多久？</span><span className="gs-r2-work-note"><Info size={16} aria-hidden="true" />按收入估算</span></>}>
    <div className="gs-r2-work-content">{rows.length ? <>
      <p>{lowestWork ? <>{lowestWork.country}标价最低，按人均收入粗略估算，约需工作 <Duration hours={lowestWork.hours} />。</> : "地区标价和收入负担是两个维度，以下按人均收入粗略估算。"}</p>
      <div className="gs-r2-square-legend"><span />1 个方块 = 1 小时平均收入<span className="gs-work-fraction-note">半透明方块表示不足 1 小时的部分</span></div>
      <div ref={chart} className="gs-r2-work-rows" style={{"--gs-work-data-columns":maximum} as CSSProperties}>{shown.map(row=>{
        const squares=workHourSquares(row.hours);
        return <div className="gs-r2-work-row" key={row.code} data-income-country={row.code}>
          <span className="gs-r2-work-country"><CountryFlag code={row.code} />{row.country}</span>
          <span className="gs-r2-work-duration">约 <Duration hours={row.hours} />{row.code === "US" && <span>（基准）</span>}</span>
          <div className="gs-work-bar"><WorkSquares hours={row.hours} code={row.code} revealed={revealed.includes(row.code)} onReveal={reveal} />{squares.truncated && <small>仅展示前 100 小时</small>}</div>
        </div>;
      })}</div>
      {rows.length > preview.length && <button type="button" className="gs-r2-secondary" aria-expanded={all} onClick={()=>setAll(value=>!value)}>{all ? "收起" : "展开全部"}<ChevronDown className="gs-work-more-chevron" data-open={all} size={16} aria-hidden="true" /></button>}
      <p className="gs-r2-income-source">{rows.length}/{plan.regions.length} 个地区有有效收入数据 · {incomeWorkSource(rows)} · 假设每月工作 {WORK_HOURS_PER_MONTH} 小时；不代表个人工资或购买资格。 <a href="https://data.worldbank.org/indicator/NY.GNP.PCAP.CD" target="_blank" rel="noreferrer">指标来源</a></p>
    </> : <p className="gs-r2-work-empty"><Info size={18} aria-hidden="true" />当前收入证据缺失或已过期，暂不显示工时估算。</p>}</div>
  </AnimatedDisclosure>;
}
