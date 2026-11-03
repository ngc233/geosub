"use client";

import { Search } from "lucide-react";
import { useState, type ReactNode } from "react";
import SegmentedControl from "./SegmentedControl";
import { PublicButton, PublicCard, PublicCheckbox, PublicConsentNotice, PublicEvidence, PublicEvidencePanel, PublicFilters, PublicIconButton, PublicInput, PublicLink, PublicSelect, PublicTag, type PreviewState } from "./PublicControls";
import styles from "./PublicStyleReview.module.css";

const states = [
  { key: "default", label: "默认" }, { key: "hover", label: "悬停" },
  { key: "focus", label: "聚焦" }, { key: "disabled", label: "禁用" },
] as const;
const plans = ["Go", "Plus", "Pro"].map(value => ({ value, label: value }));
const filters = [{ value: "all", label: "全部" }, { value: "low", label: "低于美国" }];
const sortOptions = [
  { value: "low", label: "价格从低到高" }, { value: "high", label: "价格从高到低" },
  { value: "disabled", label: "不可用选项", disabled: true }, { value: "name", label: "地区名称" },
];

function StateMatrix({ title, children }: { title: string; children: (state: { disabled: boolean; previewState?: PreviewState; label: string }) => ReactNode }) {
  return <div className={styles.matrixRow}>
    <h3>{title}</h3><div className={styles.stateGrid}>{states.map(state => <div key={state.key} className={styles.stateCell} data-review-state={state.key}>
      <p className={styles.stateLabel}>{state.label}</p>
      {children({ disabled: state.key === "disabled", previewState: state.key === "hover" || state.key === "focus" ? state.key : undefined, label: state.label })}
    </div>)}</div>
  </div>;
}

function CheckboxExample({ disabled, previewState, label }: { disabled: boolean; previewState?: PreviewState; label: string }) {
  const [checked, setChecked] = useState(false);
  return <div className={styles.checkboxExamples}>
    <PublicCheckbox label={`${label}未选`} checked={checked} onChange={setChecked} disabled={disabled} previewState={previewState} />
    <PublicCheckbox label={`${label}已选`} checked={!checked} onChange={value => setChecked(!value)} disabled={disabled} />
  </div>;
}

export default function PublicStyleReview() {
  const [theme, setTheme] = useState("system");
  const [plan, setPlan] = useState("Plus");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("low");
  const [region, setRegion] = useState("a");
  const [consentResult, setConsentResult] = useState("尚未选择");
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState("a");

  return <main className={`gs-public-shell gs-style-review ${styles.root}`} data-preview-theme={theme}>
    <div className={styles.content}>
      <header className={styles.header}>
        <div><PublicTag>仅本地 · 第 2 步</PublicTag><h1>组件样式审阅</h1>
          <p>先确认组件，再替换套餐页。所有数字均为排版样例，不连接业务数据。</p></div>
        <div className={styles.themeSelect}><PublicSelect label="预览主题" value={theme} onChange={setTheme} options={[
          { value: "system", label: "跟随系统" }, { value: "light", label: "亮色" }, { value: "dark", label: "暗色" },
        ]} /></div>
      </header>

      <section aria-labelledby="price-font-title" id="price-fonts" className={styles.section}>
        <div className={styles.sectionHeading}><h2 id="price-font-title">主价格字体</h2><p>相同样例金额；桌面 44px，手机 36px。表格价格继续使用 IBM Plex Mono 600。</p></div>
        <div className={styles.fontGrid}>
          <PublicCard className={styles.fontCard}><h3>方案 A</h3><p>IBM Plex Mono · 600</p><strong className={styles.monoHero}>¥99.99</strong></PublicCard>
          <PublicCard className={styles.fontCard}><h3>方案 B · 已选定</h3><p>Noto Sans SC · 700</p><strong className={styles.notoHero}>¥99.99</strong></PublicCard>
        </div>
      </section>

      <PublicCard className={styles.section}>
        <div className={styles.sectionHeading}><h2>按钮与链接</h2><p>四种状态并列展示；所有控件也可以实际操作。</p></div>
        <StateMatrix title="主按钮">{({ disabled, previewState }) => <PublicButton disabled={disabled} data-preview-state={previewState}>查看价格</PublicButton>}</StateMatrix>
        <StateMatrix title="次按钮">{({ disabled, previewState }) => <PublicButton variant="secondary" disabled={disabled} data-preview-state={previewState}>比较地区</PublicButton>}</StateMatrix>
        <StateMatrix title="文字链接">{({ disabled, previewState }) => <PublicLink href="#evidence-review" disabled={disabled} data-preview-state={previewState}>查看来源</PublicLink>}</StateMatrix>
        <StateMatrix title="图标按钮">{({ disabled, previewState, label }) => <PublicIconButton aria-label={`${label}搜索`} disabled={disabled} data-preview-state={previewState}><Search aria-hidden="true" /></PublicIconButton>}</StateMatrix>
      </PublicCard>

      <PublicCard className={styles.section}>
        <div className={styles.sectionHeading}><h2>切换与筛选</h2><p>分段切换复用现有 SegmentedControl；新增 public 外观，真实页面仍使用原外观。</p></div>
        <StateMatrix title="套餐切换">{({ disabled, previewState, label }) => <SegmentedControl variant="public" ariaLabel={`${label}套餐切换`} items={plans} value={plan} onChange={setPlan} disabled={disabled} previewState={previewState} />}</StateMatrix>
        <StateMatrix title="价格筛选">{({ disabled, previewState }) => <PublicFilters items={filters} value={filter} onChange={setFilter} disabled={disabled} previewState={previewState} />}</StateMatrix>
      </PublicCard>

      <PublicCard className={styles.section}>
        <div className={styles.sectionHeading}><h2>表单与下拉</h2><p>下拉支持方向键、Home / End、文字查找、Enter、Escape 和 Tab；不可用选项会跳过。</p></div>
        <StateMatrix title="输入框">{({ disabled, previewState, label }) => <PublicInput label={`${label}地区搜索`} placeholder="搜索地区" disabled={disabled} data-preview-state={previewState} />}</StateMatrix>
        <StateMatrix title="排序下拉">{({ disabled, previewState, label }) => <PublicSelect label={`${label}价格排序`} value={sort} onChange={setSort} options={sortOptions} disabled={disabled} previewState={previewState} />}</StateMatrix>
        <StateMatrix title="选择地区">{({ disabled, previewState, label }) => <PublicSelect label={`${label}选择地区`} value={region} onChange={setRegion} options={[
          { value: "a", label: "样例地区 A" }, { value: "b", label: "样例地区 B" }, { value: "c", label: "样例地区 C" },
        ]} disabled={disabled} previewState={previewState} />}</StateMatrix>
        <StateMatrix title="复选框">{state => <CheckboxExample {...state} />}</StateMatrix>
      </PublicCard>

      <PublicCard className={styles.section} id="evidence-review">
        <div className={styles.sectionHeading}><h2>卡片、表格与证据</h2><p>卡片无阴影；价格右对齐。表格中的操作保留 44px 点击区。</p></div>
        <div className={styles.tags}><PublicTag>待确认</PublicTag><PublicTag>税费另计</PublicTag><PublicTag>中性标签</PublicTag></div>
        <div className={styles.tableWrap}><table className={styles.table} aria-label="价格表样式样例">
          <thead><tr><th aria-label="选择" /><th>地区</th><th className={styles.numeric}>折算价 / 月</th><th className={styles.taxColumn}>税费</th><th>证据</th></tr></thead>
          <tbody>{[{ code: "a", name: "样例地区 A", price: "¥99.99" }, { code: "b", name: "样例地区 B", price: "¥129.99" }].map(row => <FragmentRow key={row.code}
            row={row} checked={selected.includes(row.code)} onChecked={checked => setSelected(checked ? [...selected, row.code] : selected.filter(code => code !== row.code))}
            open={expanded === row.code} onToggle={() => setExpanded(expanded === row.code ? "" : row.code)} />)}</tbody>
        </table></div>
        <StateMatrix title="证据展开">{({ disabled, previewState, label }) => <PublicEvidence title={`${label}证据`} disabled={disabled} previewState={previewState}>
          <p>本区只展示证据排版，不代表实际税费结论。</p><PublicLink href="#price-fonts">返回字体比较</PublicLink>
        </PublicEvidence>}</StateMatrix>
      </PublicCard>

      <PublicCard className={styles.section}>
        <div className={styles.sectionHeading}><h2>统计同意条</h2><p>复用上方主按钮和次按钮；手机端保持紧凑。</p></div>
        <PublicConsentNotice title="帮助改进 GeoSub" description="是否允许匿名使用统计？这是组件样式预览，不会保存同意记录。" acceptLabel="允许统计" rejectLabel="拒绝统计" onAccept={() => setConsentResult("已演示允许，不保存记录")} onReject={() => setConsentResult("已演示拒绝，不保存记录")} />
        <p className={styles.status} role="status">{consentResult}</p>
      </PublicCard>

      <footer className={styles.footer}>
        <p>亮色按批准 tokens；暗色沿用第 1 步的兼容映射，等待本页确认。</p>
        <p>本页不进入站内导航或 sitemap；确认后才执行第 3 步套餐页替换。</p>
      </footer>
    </div>
  </main>;
}

function FragmentRow({ row, checked, onChecked, open, onToggle }: {
  row: { code: string; name: string; price: string }; checked: boolean; onChecked: (checked: boolean) => void;
  open: boolean; onToggle: () => void;
}) {
  return <>
    <tr data-gs-ui="table-row">
      <td><PublicCheckbox label={row.name} checked={checked} onChange={onChecked} /></td>
      <td className={styles.regionName}>{row.name}</td><td className={styles.price}>{row.price}</td>
      <td className={styles.taxColumn}><PublicTag>排版样例</PublicTag></td>
      <td><PublicButton variant="secondary" aria-expanded={open} aria-controls={`sample-${row.code}`} onClick={onToggle}>{open ? "收起" : "展开"}</PublicButton></td>
    </tr>
    {open && <tr><td colSpan={5} className={styles.evidenceCell}><PublicEvidencePanel id={`sample-${row.code}`}>
      <p>税费说明、来源、采集日期和复核状态在此展开。</p>
      <p>这是本地排版样例，不提供实际地区价格或税费结论。</p>
      <PublicLink href="#price-fonts">查看来源样式</PublicLink>
    </PublicEvidencePanel></td></tr>}
  </>;
}
