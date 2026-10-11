import AdminLink from "../../../components/admin/AdminLink";
import type { Metadata } from "next";
import { requireAdmin } from "../../../lib/admin-auth";
import { pilotDraft, assertContentRuntime } from "../../../lib/managed-content";
import { readContentHistory, readContentState, readRevision } from "../../../lib/managed-content-store";
import { AdminCard, AdminPageHeader } from "../../../components/admin/AdminCard";
import { AdminLinkButton } from "../../../components/admin/AdminButton";
import ContentForm from "./ContentForm";
export const metadata: Metadata = { title: "内容发布试点", robots: { index: false, follow: false } };
export default async function ContentPage() {
  await requireAdmin();
  const [state, history] = await Promise.all([readContentState(), readContentHistory()]);
  let runtime = "未启用";
  try { runtime = assertContentRuntime() === "production" ? "生产通道" : "本地演练"; } catch { /* No runtime activation. */ }
  const current = await readRevision(state.version);
  const props = { generation: state.generation, draft: state.draft || pilotDraft, versions: history.map((r) => r.version) };
  return <>
    <AdminPageHeader title="内容发布试点" description={`英文 ChatGPT 总览 · 内容版本与系统版本独立 · ${runtime}。以分发回执判断是否完成公网发布。`} action={<AdminLinkButton href="/admin/content/preview" variant="secondary">预览已保存草稿</AdminLinkButton>} />
    <div className="space-y-6">
      <AdminCard className="dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"><p>当前内容：{state.version ? `C${String(state.version).padStart(4, '0')}` : '代码默认'} · 草稿代次：{state.generation}</p><p className="mt-2 text-sm">分发回执：{state.receipt === 'verified' ? '源站与公网核对通过，回执已保存' : state.receipt === 'pending' ? '分发未完成，请检查后重试' : state.receipt === 'origin_invalidated' ? '本地应用缓存已失效；公网未验收' : '尚未发布'}</p>{state.receipt === 'pending' ? <ContentForm {...props} mode="retry" /> : null}</AdminCard>
      <AdminCard className="dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"><h2 className="mb-4 text-xl font-semibold">编辑草稿</h2><ContentForm key={`draft-${state.generation}`} {...props} mode="draft" /></AdminCard>
      {state.draft ? <AdminCard className="dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"><h2 className="mb-4 text-xl font-semibold">审核发布</h2><p className="mb-4 text-sm">先预览已保存草稿；未保存的输入不会发布。</p><details className="mb-4"><summary className="cursor-pointer font-semibold">比较当前内容与草稿</summary><dl className="mt-3 space-y-4 break-words">{(["title", "heading", "description", "sections", "faqs", "sources"] as const).map((key) => <div key={key}><dt className="font-semibold">{{title:"搜索标题",heading:"H1",description:"摘要",sections:"说明段落",faqs:"FAQ",sources:"来源"}[key]}</dt><dd className="mt-1 whitespace-pre-wrap text-sm">当前：{current?.content ? JSON.stringify(current.content[key], null, 2) : "代码默认内容（随价格数据生成）"}</dd><dd className="mt-1 whitespace-pre-wrap text-sm">草稿：{JSON.stringify(state.draft?.[key], null, 2)}</dd></div>)}</dl></details><ContentForm {...props} mode="publish" /></AdminCard> : null}
      {state.version > 0 ? <AdminCard className="dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"><h2 className="mb-4 text-xl font-semibold">回退</h2><ContentForm {...props} mode="rollback" /></AdminCard> : null}
      <AdminCard className="dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"><h2 className="mb-4 text-xl font-semibold">历史版本（最近 30 次）</h2>{history.length ? <ul className="space-y-3">{history.map((r) => <li className="break-words" key={r.version}>C{String(r.version).padStart(4, '0')} · {r.createdAt} · {r.reason} <AdminLink className="underline" href={`/admin/content/preview?version=${r.version}`}>查看此版本</AdminLink>{r.rollbackOf !== null ? `（回退自 ${r.rollbackOf}）` : ''}</li>)}</ul> : <p>还没有发布记录。草稿不会生成公开版本。</p>}</AdminCard>
    </div>
  </>;
}
