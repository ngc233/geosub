import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../lib/admin-auth";
import { canPromote, promotionRuntime, PLACEMENTS } from "../../../../lib/first-party-promotion";
import { readPromotionRevision } from "../../../../lib/first-party-promotion-store";
import PromotionCard from "../../../../components/PromotionCard";
import { AdminLinkButton } from "../../../../components/admin/AdminButton";
export const metadata: Metadata = { title: "自营推广预览", robots: { index: false, follow: false } };
export default async function Preview({ searchParams }: { searchParams: Promise<{ revision?: string }> }) {
  const actor = await requireAdmin();
  if (!canPromote(actor.role,'read')) notFound();
  const { revision: id } = await searchParams;
  if (id && (!promotionRuntime() || !/^[0-9a-f-]{36}$/.test(id))) notFound();
  const revision = id ? await readPromotionRevision(id) : null;
  if (id && !revision) notFound();
  const content = revision?.content || { merchant: '轨道商店（主体待确认）', title: '了解轨道商店', description: '这里用于查看自营推广卡片的版式。实际商品、介绍和落地页将在核验后填写；此占位内容不会对访客投放。', cta: '了解详情' };
  return <div className="space-y-6"><h1 className="text-2xl font-semibold">自营推广预览</h1><p>仅管理员可见，不计入统计。此处所有按钮均不可跳转，不代表商品审核通过。</p><AdminLinkButton href="/admin/promotions" variant="secondary">返回推广管理</AdminLinkButton>{(revision ? PLACEMENTS.filter((p) => p.id === revision.content.placement) : PLACEMENTS).map((p) => <section key={p.id} className="space-y-3"><h2 className="text-lg font-semibold">{p.label}</h2><p>{p.path ? '计划位于首页主要分类入口之后。' : '位置保留：尚无产品页面，不会在公开站展示。'}</p><PromotionCard content={content} /></section>)}</div>;
}
