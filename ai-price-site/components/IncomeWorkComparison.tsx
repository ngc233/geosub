"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import IncomeWorkView from "./IncomeWorkView";
import { ChevronDown, Clock3, Info } from "lucide-react";
import { getIncomeWorkRows, WORK_HOURS_PER_MONTH, workHourSquares, type WorkIncome } from "../lib/income-work-time";
import type { ProductPlan } from "../lib/public-pricing-model";

function subscribe(callback: () => void) {
  const media = window.matchMedia("(min-width: 768px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function desktop() { return window.matchMedia("(min-width: 768px)").matches; }
function serverClosed() { return false; }

function LegacyIncomeWorkComparison({ plan, name, incomes, english }: { plan: ProductPlan; name: string; incomes: WorkIncome[]; english: boolean }) {
  const isDesktop = useSyncExternalStore(subscribe, desktop, serverClosed);
  const [preference, setPreference] = useState<boolean | null>(null);
  const [all, setAll] = useState(false);
  const rows = getIncomeWorkRows(plan, incomes);
  const preview = [...rows.slice(0, 5), ...rows.slice(-3), ...rows.filter(row => row.code === "US")]
    .filter((row, index, items) => items.findIndex(item => item.code === row.code) === index).sort((a, b) => b.hours - a.hours);
  const shown = all ? rows : preview;
  const lowestPriceRegion = [...plan.regions].sort((a, b) => a.priceUsd - b.priceUsd)[0];
  const lowestPriceWork = rows.find(row => row.code === lowestPriceRegion?.code);
  const metadata = [...new Set(rows.map(row => `${row.source} · ${english ? "GNI per capita (Atlas, current US$)" : "人均国民总收入（Atlas，现价美元）"} · ${row.year}`))].join(" / ");
  function duration(hours: number) {
    const minutes = Math.round(hours * 60);
    const whole = Math.floor(minutes / 60), remainder = minutes % 60;
    return english ? `${whole ? `${whole}h ` : ""}${remainder ? `${remainder}m` : ""}`.trim() || "< 1m" : `${whole ? `${whole} 小时` : ""}${remainder ? ` ${remainder} 分钟` : ""}`.trim() || "不足 1 分钟";
  }
  return <details className="gs-r2-work" open={preference ?? isDesktop} onToggle={e => setPreference(e.currentTarget.open)}>
    <summary><Clock3 size={24} aria-hidden="true" /><h2>{english ? `How much work pays for a month of ${name}?` : `一个月 ${name}，相当于工作多久？`}</h2><span className="gs-r2-work-note"><Info size={16} aria-hidden="true" />{english ? "Income estimate" : "按收入估算"}</span><ChevronDown size={18} className="gs-r2-disclosure-chevron" aria-hidden="true" /></summary>
    <div className="gs-r2-work-content">
      {rows.length ? <>
        <p>{lowestPriceWork ? (english ? `${lowestPriceWork.country} has the lowest listed price, equivalent to about ${duration(lowestPriceWork.hours)} of work at the per-capita income estimate.` : `${lowestPriceWork.country}标价最低，按人均收入粗略估算，约需工作 ${duration(lowestPriceWork.hours)}。`) : (english ? "Listed price and the income burden measure different things." : "地区标价和收入负担是两个维度，以下按人均收入粗略估算。")}</p>
        <div className="gs-r2-square-legend"><span />{english ? "One square = one hour of average income" : "1 个方块 = 1 小时平均收入"}</div>
        <div className="gs-r2-work-rows">{shown.map(row => {
          const squares = workHourSquares(row.hours);
          return <div className="gs-r2-work-row" key={row.code} data-income-country={row.code}>
            <span className="gs-r2-work-country"><Image src={`/flags/${row.code.toLowerCase()}.svg`} width={28} height={20} alt="" unoptimized />{row.country}</span>
            <span className="gs-r2-work-duration">{english ? "About " : "约 "}{duration(row.hours)}{row.code === "US" ? (english ? " (baseline)" : "（基准）") : ""}</span>
            <div className="gs-r2-squares" aria-label={`${row.hours.toFixed(2)} ${english ? "hours" : "小时"}`}>{Array.from({ length: squares.full }, (_, i) => <span key={i} />)}{squares.partial > 0 && <span className="gs-r2-partial-square" style={{ background: `linear-gradient(to right, var(--color-text-primary) ${squares.partial * 100}%, transparent ${squares.partial * 100}%)` }} />}{squares.truncated && <small>{english ? "First 100h shown" : "仅展示前 100 小时"}</small>}</div>
          </div>;
        })}</div>
        {rows.length > preview.length && <button type="button" className="gs-r2-secondary" onClick={() => setAll(value => !value)}>{all ? (english ? "Show less" : "收起") : (english ? "Show all" : "展开全部")}<ChevronDown size={16} /></button>}
        <p className="gs-r2-income-source">{rows.length}/{plan.regions.length} {english ? "regions with valid income data" : "个地区有有效收入数据"} · {metadata} · {english ? `Assumed ${WORK_HOURS_PER_MONTH} work hours per month. Not personal wages or purchase eligibility.` : `假设每月工作 ${WORK_HOURS_PER_MONTH} 小时；不代表个人工资或购买资格。`} <a href="https://data.worldbank.org/indicator/NY.GNP.PCAP.CD" target="_blank" rel="noreferrer">{english ? "Indicator source" : "指标来源"}</a></p>
      </> : <p className="gs-r2-work-empty"><Info size={18} aria-hidden="true" />{english ? "Current income evidence is incomplete or out of date. Work-time estimates are unavailable." : "当前收入证据缺失或已过期，暂不显示工时估算。"}</p>}
    </div>
  </details>;
}

export default function IncomeWorkComparison(props: { plan: ProductPlan; name: string; incomes: WorkIncome[]; english: boolean; enhanced?: boolean }) {
  return props.enhanced && !props.english ? <IncomeWorkView {...props} /> : <LegacyIncomeWorkComparison {...props} />;
}
