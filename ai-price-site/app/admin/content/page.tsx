import ContentComparison from "../../../components/admin/ContentComparison";
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
  const admin = await requireAdmin();
  const [state, history] = await Promise.all([readContentState(), readContentHistory()]);
  let runtime = "未启用";
  try { runtime = assertContentRuntime() === "production" ? "生产通道" : "本地演练"; } catch { /* No runtime activation. */ }
  let current: Awaited<ReturnType<typeof readRevision>> = null;
  let revisionIssue = false;
  try { current = await readRevision(state.version); }
  catch (error) {
    if (!(error instanceof Error) || !["内容修订不存在。", "内容修订校验失败，请检查历史记录。"].includes(error.message)) throw error;
    revisionIssue = true;
  }
  const writable = runtime !== "未启用" && !revisionIssue;
  const props = { generation: state.generation, draft: state.draft || pilotDraft, versions: history.map((r) => r.version) };
  return <>
    <AdminPageHeader title="内容发布试点" description={`英文 ChatGPT 总览 · 内容版本与系统版本独立 · ${runtime}。以分发回执判断是否完成公网发布。`} action={<AdminLinkButton href="/admin/content/preview" variant="secondary">预览已保存草稿</AdminLinkButton>} />
    <div className="space-y-6">
      {revisionIssue ? <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">当前内容版本 C{String(state.version).padStart(4, '0')} 缺失或校验失败。本页保存、发布、重试和回退已暂停；请先核对内容修订记录。已有草稿与历史仍可查看，不会自动替换为代码默认内容。</p> : null}
      {runtime === "未启用" ? <p role="status" className="rounded-xl border border-amber-300 p-4 text-sm">当前环境的内容写入通道未启用，可查看预览与历史；保存、发布和回退暂不可用。</p> : null}
      <p className="text-sm">完成分发回执后，进入 <AdminLink href="/admin/content/effects" className="underline">内容效果观察</AdminLink> 核对发布前后表现。浏览和点击变化不直接等同于内容改进效果。</p>
      <AdminCard className="dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"><p>当前内容：{state.version ? `C${String(state.version).padStart(4, '0')}` : '代码默认'} · 草稿代次：{state.generation}</p><p className="mt-2 text-sm">分发回执：{state.receipt === 'verified' ? '源站与公网核对通过，回执已保存' : state.receipt === 'pending' ? '分发未完成，请检查后重试' : state.receipt === 'origin_invalidated' ? '本地应用缓存已失效；公网未验收' : '尚未发布'}</p>{writable && state.receipt === 'pending' && admin.role === 'OWNER' ? <ContentForm {...props} mode="retry" /> : null}</AdminCard>
      <AdminCard className="dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"><h2 className="mb-4 text-xl font-semibold">编辑草稿</h2>{writable && admin.role !== "VIEWER" ? <ContentForm key={`draft-${state.generation}`} {...props} mode="draft" /> : <p>当前仅可查看草稿预览和历史版本。</p>}</AdminCard>
      {state.draft && !revisionIssue ? <AdminCard className="dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"><h2 className="mb-4 text-xl font-semibold">审核发布</h2><p className="mb-4 text-sm">先预览已保存草稿；未保存的输入不会发布。</p><ContentComparison current={current?.content || null} draft={state.draft} />{writable && admin.role === "OWNER" ? <ContentForm {...props} mode="publish" /> : <p>发布需由管理员审核执行。</p>}</AdminCard> : null}
      {state.version > 0 && writable && admin.role === "OWNER" ? <AdminCard className="dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"><h2 className="mb-4 text-xl font-semibold">回退</h2><ContentForm {...props} mode="rollback" /></AdminCard> : null}
      <AdminCard className="dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"><h2 className="mb-4 text-xl font-semibold">历史版本（最近 30 次）</h2>{history.length ? <ul className="space-y-3">{history.map((r) => <li className="break-words" key={r.version}>C{String(r.version).padStart(4, '0')} · {r.createdAt} · {r.reason} <AdminLink className="underline" href={`/admin/content/preview?version=${r.version}`}>查看此版本</AdminLink>{r.rollbackOf !== null ? `（回退自 ${r.rollbackOf}）` : ''}</li>)}</ul> : <p>还没有发布记录。草稿不会生成公开版本。</p>}</AdminCard>
    </div>
  </>;
}
