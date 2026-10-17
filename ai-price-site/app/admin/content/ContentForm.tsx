"use client";
import { AdminActionForm, useAdminActionState } from "@/components/admin/AdminPermissions";
import styles from "../../../components/ManagedContent.module.css";

import { AdminButton } from "../../../components/admin/AdminButton";
import { contentAction } from "./actions";
import type { OverviewContent } from "../../../lib/managed-content";
const input = "mt-1 block w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-3 text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]";
export default function ContentForm({ generation, draft, versions, mode }: { generation: number; draft: OverviewContent; versions: number[]; mode: "draft" | "publish" | "rollback" | "retry" }) {
  const [, action, pending] = useAdminActionState(contentAction, { message: "", ok: false });
  return <AdminActionForm capability={mode === "draft" ? "draft" : "manage"} action={action} className={`${styles.scope} space-y-4`}>
    <input type="hidden" name="generation" value={generation} />
    <input type="hidden" name="operation" value={mode} />
    {mode === "draft" ? <>
      {([['title', '搜索标题', 80], ['heading', '页面标题 H1', 100], ['description', '搜索摘要与首屏说明', 240]] as const).map(([name, label, max]) => <label key={name} className="block text-sm font-medium">{label}<textarea className={input} name={name} required maxLength={max} defaultValue={draft[name]} rows={2} /></label>)}
      <fieldset className="space-y-3"><legend className="font-semibold">说明段落（最多 4 段）</legend>{Array.from({ length: 4 }, (_, i) => <div key={i} className="grid gap-2"><label>段落 {i + 1} 标题<input className={input} name={`section${i}heading`} maxLength={100} defaultValue={draft.sections[i]?.heading} /></label><label>正文<textarea className={input} rows={3} name={`section${i}body`} maxLength={2000} defaultValue={draft.sections[i]?.body} /></label></div>)}</fieldset>
      <details><summary className="cursor-pointer rounded p-2 font-semibold focus-visible:outline-2">FAQ（最多 6 组）</summary><div className="space-y-4">{Array.from({ length: 6 }, (_, i) => <div key={i}><label>问题 {i + 1}<input className={input} name={`faq${i}q`} maxLength={180} defaultValue={draft.faqs[i]?.q} /></label><label>回答<textarea className={input} rows={3} name={`faq${i}a`} maxLength={1200} defaultValue={draft.faqs[i]?.a} /></label></div>)}</div></details>
      <label className="block">官方来源（每行一个 HTTPS 地址）<textarea className={input} required name="sources" rows={3} defaultValue={draft.sources.join('\n')} /></label>
      <p className="text-sm">价格、覆盖数由现有价格表提供。此处只编辑说明，不录入动态数值。</p>
    </> : mode !== "retry" ? <>
      {mode === "rollback" ? <label className="block">回退内容<select className={input} name="version"><option value="0">代码默认内容</option>{versions.map((v) => <option key={v} value={v}>C{String(v).padStart(4, '0')}</option>)}</select></label> : null}
      <label className="block">复核 / 回退理由<textarea className={input} required name="reason" maxLength={500} rows={2} /></label>
      <label className="flex items-start gap-3 text-sm"><input className="mt-1 size-5 shrink-0" type="checkbox" name="reviewed" required />已预览此版本，核对来源、套餐事实和计费平台口径</label>
    </> : null}
    <AdminButton type="submit" disabled={pending}>{pending ? "正在处理…" : { draft: "保存草稿", publish: "发布已审核内容", rollback: "创建回退版本", retry: "重试分发" }[mode]}</AdminButton>
  </AdminActionForm>;
}
