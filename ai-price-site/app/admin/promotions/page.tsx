import type { Metadata } from "next";
import { requireAdmin } from "../../../lib/admin-auth";
import { readPromotionAdmin, readPromotionReview } from "../../../lib/first-party-promotion-store";
import { canPromote, PLACEMENTS, preproductionRuntime } from "../../../lib/first-party-promotion";
import { AdminCard, AdminPageHeader } from "../../../components/admin/AdminCard";
import { AdminLinkButton } from "../../../components/admin/AdminButton";
import PromotionForm from "./PromotionForm";
export const metadata: Metadata = { title: "自营推广", robots: { index: false, follow: false } };
export default async function PromotionsPage() {
  const actor = await requireAdmin();
  let data: Awaited<ReturnType<typeof readPromotionAdmin>>;
  try { data = await readPromotionAdmin(); } catch { return <AdminCard><h1 className="text-xl font-semibold">自营推广暂不可用</h1><p>请确认推广数据库迁移和运行配置已完成。公开首页保持无推广。</p></AdminCard>; }
  const { state, revisions, available } = data;
  const reviews = await Promise.all(revisions.map((r) => readPromotionReview(r.id)));
  return <>
    <AdminPageHeader title="自营推广" description="首期：简体中文首页。两个产品位置保留；真实推广和新增分析尚未开放。" action={<AdminLinkButton href="/admin/promotions/preview" variant="secondary">查看卡片预览</AdminLinkButton>} />
    <div className="space-y-6">
      <AdminCard><h2 className="text-lg font-semibold">运行状态</h2><p className="mt-3">{available ? (preproductionRuntime() ? '本机预生产验收环境（仅测试活动）' : '推广基础环境（真实推广强制关闭）') : '未配置推广基础环境，写入与投放关闭'} · 配置版本 {state.generation}</p><p>总开关：{state.enabled ? '开启' : '关闭'} · 首页位置：{state.placementEnabled ? '开启' : '关闭'} · 分析：关闭</p><p className="mt-2">订单、收入、退款：不可用（尚无可信数据来源）。{preproductionRuntime() ? '仅允许保留测试域名；审核记录不代表真实商品批准。' : '落地页白名单为空，不能启用真实活动。'}</p></AdminCard>
      <AdminCard><h2 className="text-lg font-semibold">固定位置</h2><ul className="mt-3 space-y-2">{PLACEMENTS.map((p) => <li key={p.id}>{p.label}：{p.path || '未绑定，不可启用；不会新建公开页面'}</li>)}</ul></AdminCard>
      {available && canPromote(actor.role, 'draft') ? <AdminCard><h2 className="mb-4 text-lg font-semibold">新建活动草稿</h2><PromotionForm generation={state.generation} operation="draft" /></AdminCard> : null}
      {available && canPromote(actor.role, 'off') ? <AdminCard><h2 className="mb-4 text-lg font-semibold">紧急控制</h2><PromotionForm generation={state.generation} operation="off" /><details className="mt-4"><summary className="min-h-11 cursor-pointer py-3">仅暂停首页位置</summary><PromotionForm generation={state.generation} operation="pause" /></details></AdminCard> : null}
      <AdminCard><h2 className="mb-4 text-lg font-semibold">版本与审核（最近 30 个版本）</h2>{!revisions.length ? <p>尚无草稿。预览占位不是商品审核记录。</p> : revisions.map((r,i) => <section key={r.id} className="mb-6 break-words border-t py-4"><h3 className="font-semibold">{r.content.title}</h3><p className="text-sm">{r.id} · 审核：{reviews[i] ? ({ approved: '已批准', rejected: '已拒绝', revoked: '已撤销' }[reviews[i]!.status]) : '待审核'}{reviews[i] && Date.parse(reviews[i]!.expiresAt) <= data.readAt ? '（已过期）' : ''}</p><p className="text-sm">开始：{new Date(r.content.startsAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})} · 结束：{new Date(r.content.endsAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}（北京时间）</p><AdminLinkButton href={`/admin/promotions/preview?revision=${r.id}`} variant="secondary">预览此版本</AdminLinkButton>{canPromote(actor.role,'draft') ? <details className="mt-3"><summary className="min-h-11 cursor-pointer py-3">修改为新版本</summary><PromotionForm generation={state.generation} operation="draft" draft={r.content} campaign={r.campaign} /></details> : null}{canPromote(actor.role,'review') ? <details className="mt-3"><summary className="min-h-11 cursor-pointer py-3">审核与启用（服务端门禁）</summary><PromotionForm generation={state.generation} operation="review" revision={r.id} />{preproductionRuntime() ? <PromotionForm generation={state.generation} operation="enable" revision={r.id} /> : <p>本版本真实推广强制关闭，不提供启用操作。</p>}</details> : null}</section>)}</AdminCard>
    </div>
  </>;
}
