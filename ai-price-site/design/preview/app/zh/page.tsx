"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import PublicIcon, { type PublicIconName } from "../../../../components/PublicIcon";
import PublicPriceNumber from "../../../../components/PublicPriceNumber";

import PublicCurrencySelect, { usePublicCurrency } from "../../../../components/PublicCurrencySelect";
import { PublicSegments, PublicDisclosure, PublicComparisonBar, PublicTutorialCard, PublicPromotionPlaceholder, PublicEmphasis } from "../../../../components/PublicControls";
import SharePriceModal from "../../../../components/SharePriceModal";
import { getPlanStats, type ProductPlan } from "../../../../lib/public-pricing-model";

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
  <ControlsPreview /></main>;
}

const plan:ProductPlan={slug:"fixture",name:"测试套餐",billing:"monthly",regions:[{rank:1,country:"测试地区",code:"TR",priceUsd:5,localPrice:"5 USD",tax:"测试"},{rank:2,country:"美国",code:"US",priceUsd:10,localPrice:"10 USD",tax:"测试",isReference:true}]};
function ControlsPreview(){
  const [selected,setSelected]=useState("all"); const [currency]=usePublicCurrency();
  return <section aria-label="V2 共用控件" style={{display:"grid",gap:"var(--gs-space-24)",marginTop:"var(--gs-space-48)"}}>
    <h2>V2 共用控件 · 纯测试输入</h2><p>只在本地样例演示，不是公开产品价格或汇率。</p>
    <div style={{display:"flex",flexWrap:"wrap",gap:"var(--gs-space-12)"}}><PublicCurrencySelect/><PublicCurrencySelect/><SharePriceModal product={{slug:"fixture",name:"测试产品",brand:"测试",updatedAt:"2026-11-05"}} plan={plan} stats={getPlanStats(plan)} unifiedTrigger/></div>
    <PublicPriceNumber value={currency==="CNY"?12.34:56.78} changeKey={currency} suffix={` ${currency}（测试数字）`}/>
    <PublicSegments label="价格筛选样例" options={[{value:"all",label:"全部"},{value:"low",label:"比美国便宜"},{value:"high",label:"比美国贵"}]} value={selected} onChange={setSelected}/>
    <p role="status">当前筛选：{selected}</p>
    <PublicDisclosure title="查看测试证据"><p>展开的测试内容。正式页面将传入已有证据。</p><button data-gs-ui="button">证据中的可聚焦按钮</button></PublicDisclosure>
    <div data-gs-ui="card"><PublicComparisonBar label="最低（测试）" value={5} maximum={20} tone="low" marker={10}/><PublicComparisonBar label="美国（测试）" value={10} maximum={20} tone="baseline"/><PublicComparisonBar label="最高（测试）" value={20} maximum={20} tone="high"/></div>
    <PublicTutorialCard article={{href:"#controls",title:"教程卡片（测试）",summary:"测试摘要，不代表真实文章入口"}}/>
    <PublicTutorialCard/><PublicPromotionPlaceholder/><PublicEmphasis>强调区块：测试文字</PublicEmphasis>
  </section>;
}
