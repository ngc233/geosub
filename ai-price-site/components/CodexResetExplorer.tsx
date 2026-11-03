"use client";

import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, X } from "lucide-react";
import styles from "./CodexResetTracker.module.css";

type Entry = { id: string; date: string; type: string };
export default function CodexResetExplorer({ entries, children, locale, initialMonth }: {
  entries: Entry[]; children: ReactNode[]; locale: "zh" | "en"; initialMonth: string;
}) {
  const zh = locale === "zh";
  const [month, setMonth] = useState(initialMonth), [day, setDay] = useState<string | null>(null);
  const [type, setType] = useState("all"), [showCalendar, setShowCalendar] = useState(false);
  const [year, monthNumber] = month.split("-").map(Number);
  const offset = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const types = [["all", zh ? "全部动态" : "All updates"], ["automatic_reset", zh ? "额外重置" : "Extra resets"],
    ["banked_reset_grant", zh ? "重置权益" : "Reset grants"], ["rule_change", zh ? "规则调整" : "Rule changes"]];
  const visible = entries.map((entry, index) => ({ entry, index })).filter(({ entry }) =>
    (type === "all" || entry.type === type) && (!day || entry.date.slice(0, 10) === day));
  function moveMonth(amount: number) {
    const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
    setMonth(date.toISOString().slice(0, 7)); setDay(null);
  }
  const monthLabel = new Intl.DateTimeFormat(zh ? "zh-CN" : "en", { year: "numeric", month: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, monthNumber - 1, 1)));
  return <section aria-label={zh ? "公告与更新" : "Announcements and updates"}>
    <div className={styles.toolbar}>
      <div className={styles.filters} aria-label={zh ? "按事件类型筛选" : "Filter by event type"}>
        {types.map(([value, label]) => <button key={value} type="button" aria-pressed={type === value}
          onClick={() => setType(value)}>{label}<span>{value === "all" ? entries.length : entries.filter(entry => entry.type === value).length}</span></button>)}
      </div>
      <button type="button" className={styles.calendarToggle} aria-expanded={showCalendar} aria-controls="reset-calendar"
        onClick={() => setShowCalendar(!showCalendar)}><CalendarDays size={16}/>{zh ? "收录日历" : "Calendar"}</button>
    </div>
    <div className={styles.explorer}>
      <aside id="reset-calendar" className={`${styles.calendarAside} ${showCalendar ? styles.calendarShown : ""}`}>
        <div className={styles.calendar}>
          <div className={styles.calendarHeading}><h2>{zh ? "收录日历" : "Record calendar"}</h2><CalendarDays size={17}/></div>
          <div className={styles.monthControl}>
            <button type="button" onClick={() => moveMonth(-1)} aria-label={zh ? "上个月" : "Previous month"}><ChevronLeft size={17}/></button>
            <strong aria-live="polite">{monthLabel}</strong>
            <button type="button" onClick={() => moveMonth(1)} aria-label={zh ? "下个月" : "Next month"}><ChevronRight size={17}/></button>
          </div>
          <div className={styles.week} aria-hidden="true">{(zh ? ["一", "二", "三", "四", "五", "六", "日"] : ["M", "T", "W", "T", "F", "S", "S"]).map((name, i) => <span key={i}>{name}</span>)}</div>
          <div className={styles.days}>
            {Array.from({ length: offset }, (_, i) => <span key={`blank-${i}`}/>)}
            {Array.from({ length: days }, (_, i) => {
              const date = `${month}-${String(i + 1).padStart(2, "0")}`;
              const count = entries.filter(entry => entry.date.slice(0, 10) === date && (type === "all" || entry.type === type)).length;
              return <button type="button" key={date} disabled={!count} aria-pressed={day === date}
                aria-label={`${date} · ${count} ${zh ? "条收录" : "records"}`} onClick={() => setDay(day === date ? null : date)}>
                {i + 1}{count > 0 && <span className={styles.dayDot}/>}</button>;
            })}
          </div>
          <p className={styles.calendarNote}><span className={styles.dayDot}/>{zh ? "有已复核的公告收录" : "Reviewed announcements recorded"}</p>
          <p className={styles.small}>{zh ? "按本页记录的首次收录日期（UTC）展示，不代表个人重置时间。" : "First-recorded dates on this page (UTC), not personal reset times."}</p>
          {day && <button type="button" className={styles.clearDay} onClick={() => setDay(null)}><X size={14}/>{day} · {zh ? "清除" : "Clear"}</button>}
        </div>
      </aside>
      <div className={styles.timeline}>
        <div className={styles.listHeading}><h2>{zh ? "最新动态" : "Latest updates"}</h2><span aria-live="polite">{visible.length} {zh ? "条记录" : "records"}{day ? ` · ${day}` : ""}</span></div>
        {visible.length ? visible.map(({ entry, index }) => <div className={styles.timelineItem} key={entry.id}>{children[index]}</div>)
          : <div className={styles.noMatch}><h3>{zh ? "没有匹配的收录记录" : "No matching records"}</h3><p>{zh ? "试试其他类型或清除日期筛选。这不表示没有发生重置。" : "Try another type or clear the date filter. This does not mean no reset occurred."}</p>
            <button type="button" onClick={() => { setType("all"); setDay(null); }}>{zh ? "查看全部动态" : "Show all updates"}</button></div>}
      </div>
    </div>
  </section>;
}
