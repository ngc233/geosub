"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import PublicIcon, { type PublicIconName } from "../../../../components/PublicIcon";
import PublicPriceNumber from "../../../../components/PublicPriceNumber";

const cluster: CSSProperties = { display: "flex", flexWrap: "wrap", gap: "var(--gs-space-12)", alignItems: "center" };
const muted: CSSProperties = { color: "var(--gs-text-secondary)", fontSize: "var(--gs-metadata-size)" };
const iconNames: PublicIconName[] = ["Search", "Globe", "Banknote", "Share2", "ExternalLink", "ChevronDown", "ArrowRight", "ChevronRight", "ArrowUp", "ArrowDown", "TrendingUp", "TrendingDown", "BookOpen", "Check", "Menu", "X"];

export default function FoundationPreview() {
  const [amount, setAmount] = useState(12.34);
  const [change, setChange] = useState(0);
  const [open, setOpen] = useState(false);
  const [replay, setReplay] = useState<"a" | "b">("a");
  const [entered, setEntered] = useState(false);
  const entrance = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setEntered(true); observer.disconnect(); }
    });
    if (entrance.current) observer.observe(entrance.current);
    return () => observer.disconnect();
  }, []);
  return <main style={{ maxWidth: "var(--gs-max-content-width)", margin: "auto", padding: "var(--gs-space-24) var(--gs-mobile-page-padding) var(--gs-space-48)" }}>
    <p style={muted}>GEOSUB · V1 设计底座 · 仅本机查看</p>
    <h1>规范与动效样例</h1>
    <p>数字均为测试输入，不代表产品价格。暗色跟随系统；此样例不接数据库，不进入公开站点。</p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,calc(var(--gs-space-28) * 10)),1fr))", gap: "var(--gs-space-24)", marginBlock: "var(--gs-space-24)" }}>
      <section data-gs-ui="card" aria-label="数字滚动">
        <h2>数字滚动</h2><p style={muted}>480ms · 首帧即为最终值</p>
        <div style={{ color: "var(--gs-low)" }}><PublicPriceNumber value={amount} changeKey={change} prefix="¥ " size="hero" label="样例价格" /></div>
        <p style={muted}>示例百分比 <span data-gs-number style={{ fontWeight: "var(--gs-weight-emphasis)" }}>26.8%</span></p>
        <div style={cluster}>{[12.34, 98.76, 0].map(value => <button key={value} data-gs-ui="button" aria-pressed={amount === value}
          onClick={() => { setAmount(value); setChange(current => current + 1); }}>切换为 {value.toFixed(2)}</button>)}</div>
        <p><button data-gs-ui="button" onClick={() => setAmount(45.67)}>非交互数据刷新示例</button></p>
        <p style={muted}>这项测试仅更新值，不触发滚动。真正换币种的组件留到 V2。</p>
      </section>
      <section data-gs-ui="card" aria-label="操作反馈">
        <h2>悬停与按下</h2><p style={muted}>120ms · 上浮 2px · 按下 98%</p>
        <button data-gs-ui="button" data-gs-motion-card style={{ width: "100%", minHeight: "var(--gs-space-64)" }}><PublicIcon name="BookOpen" />查看反馈样例<PublicIcon name="ArrowRight" /></button>
        <p style={cluster}><button data-gs-ui="button" data-gs-variant="primary">主按钮</button><button data-gs-ui="button" disabled>不可用</button></p>
        <p style={muted}>支持 Tab 聚焦及 Enter / Space。焦点框保持清楚，触控目标至少 44px。</p>
      </section>
      <section data-gs-ui="card" data-gs-disclosure data-open={open} aria-label="高度过渡">
        <h2>展开与收起</h2><p style={muted}>220ms · 容器保持连续</p>
        <button className="gs-disclosure-header" data-gs-ui="button" aria-expanded={open} aria-controls="preview-details" onClick={() => setOpen(value => !value)}>
          查看样例说明<PublicIcon name="ChevronDown" className="gs-disclosure-chevron" />
        </button>
        <div className="gs-disclosure-grid" style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr" }}>
          <div id="preview-details" inert={!open} aria-hidden={!open} style={{ minHeight: 0, overflow: "hidden" }}><p>这段说明演示高度变化。节点保留在原位，反复展开不会删除再重建内容。</p></div>
        </div><p style={muted}>下方内容随容器平滑移动。</p>
      </section>
      <section data-gs-ui="card" aria-label="进场与脉冲">
        <h2>进场与脉冲</h2><p style={muted}>320ms · 间隔 40ms · 脉冲仅两次</p>
        <div ref={entrance} style={cluster}>{[0, 1, 2].map(index => <div key={index} data-gs-enter={entered ? replay : undefined}
          style={{ "--gs-stagger": `calc(var(--gs-motion-stagger) * ${index})`, background: "var(--gs-subtle)", padding: "var(--gs-space-12)", borderRadius: "var(--gs-radius-small)" } as CSSProperties}>内容 {index + 1}</div>)}</div>
        <p><span data-gs-pulse={entered ? replay : undefined} style={{ display: "inline-block", position: "relative", color: "var(--gs-low)", padding: "var(--gs-space-8)", borderRadius: "var(--gs-radius-tag)" }}>最低价位置样例</span></p>
        <button data-gs-ui="button" onClick={() => setReplay(value => value === "a" ? "b" : "a")}>重播进场与脉冲</button>
      </section>
      <section data-gs-ui="card" aria-label="色彩语义">
        <h2>颜色只说明比较结果</h2>
        <p style={{ color: "var(--gs-low)" }}>便宜 · 价格文字</p><p style={{ color: "var(--gs-baseline)" }}>美国 · 中性基准</p><p style={{ color: "var(--gs-high)" }}>更贵 · 价格文字</p>
        <p style={{ background: "var(--gs-accent)", color: "var(--gs-on-accent)", padding: "var(--gs-space-12)", borderRadius: "var(--gs-radius-small)" }}>青柠底始终配深色字</p>
        <p style={{ background: "var(--gs-accent-soft)", color: "var(--gs-low-on-soft)", border: "var(--gs-border-width) solid var(--gs-accent-border)", padding: "var(--gs-space-12)", borderRadius: "var(--gs-radius-small)" }}>强调区块使用浅青柠</p>
      </section>
      <section data-gs-ui="card" aria-label="字体与图标">
        <h2>中文系统字体</h2><p>中文正文与标题不下载字体，数字使用 Inter Tight 拉丁子集。</p>
        <div style={cluster}>{iconNames.map(name => <span key={name} title={name}><PublicIcon name={name} label={name} /></span>)}</div>
        <p style={cluster}>{([16, 20, 24] as const).map(size => <PublicIcon key={size} name="Search" size={size} label={`搜索图标 ${size}`} />)}</p>
        <p style={muted}>统一 Lucide · 线宽 1.75 · 16 / 20 / 24</p>
      </section>
    </div>
  </main>;
}
