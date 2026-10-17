import { BillingCycle, PublishStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { AdminActionForm } from "@/components/admin/AdminPermissions";
import { AdminButton, AdminLinkButton } from "@/components/admin/AdminButton";
import { AdminCard, AdminPageHeader } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import AdminSelect from "@/components/admin/AdminSelect";
import { adminRecordVersion } from "@/lib/admin-save";
import { prisma } from "@/lib/prisma";
import { updatePlanAction } from "../../actions";

const cycleOptions = [
  { value: BillingCycle.MONTHLY, label: "月付" },
  { value: BillingCycle.YEARLY, label: "年付" },
  { value: BillingCycle.WEEKLY, label: "周付" },
  { value: BillingCycle.QUARTERLY, label: "季度" },
  { value: BillingCycle.ONE_TIME, label: "一次性" },
  { value: BillingCycle.LIFETIME, label: "终身" },
  { value: BillingCycle.UNKNOWN, label: "未知" },
];
const statusOptions = [
  { value: PublishStatus.DRAFT, label: "草稿" },
  { value: PublishStatus.REVIEW, label: "审核中" },
  { value: PublishStatus.PUBLISHED, label: "已发布" },
  { value: PublishStatus.ARCHIVED, label: "已归档" },
];

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const plan = await prisma.plan.findUnique({ where: { id }, include: { product: true, _count: { select: { regionPrices: true, priceObservations: true } } } });
  if (!plan) notFound();

  return (
    <div>
      <AdminPageHeader eyebrow="Plans" title={`编辑 ${plan.name}`} description={`${plan.product.name} · ${plan.product.category}。归档只改变状态，保留来源和审核证据。`} action={<AdminLinkButton href={`/admin/plans?product=${encodeURIComponent(plan.product.slug)}`} variant="secondary">返回套餐</AdminLinkButton>} />
      <AdminCard>
        <p className="mb-5 text-sm text-slate-600 dark:text-slate-300">价格 {plan._count.regionPrices} 条，观测 {plan._count.priceObservations} 条。已有记录时套餐 slug 与周期锁定；请归档错误身份后另建草稿。</p>
        <AdminActionForm action={updatePlanAction} className="grid gap-5 md:grid-cols-2">
          <input type="hidden" name="id" value={plan.id} />
          <input type="hidden" name="recordVersion" value={adminRecordVersion(plan)} />
          <AdminInput name="name" label="套餐名称" defaultValue={plan.name} required maxLength={160} />
          <AdminInput name="slug" label="套餐 slug" defaultValue={plan.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={120} readOnly={plan._count.regionPrices + plan._count.priceObservations > 0} />
          <AdminSelect name="billingCycle" label="计费周期" value={plan.billingCycle} options={cycleOptions} />
          <AdminSelect name="status" label="发布状态" value={plan.status} options={statusOptions} />
          <AdminInput name="sortOrder" label="排序" type="number" min={0} max={100000} defaultValue={plan.sortOrder} required />
          <div className="flex items-end"><AdminButton type="submit">保存套餐</AdminButton></div>
        </AdminActionForm>
      </AdminCard>
    </div>
  );
}
