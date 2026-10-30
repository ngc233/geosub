import { safeAdminReturnTo } from "@/lib/admin-workflow-context";
import { BillingCycle } from "@prisma/client";
import { AdminActionForm } from "@/components/admin/AdminPermissions";
import { AdminButton, AdminLinkButton } from "@/components/admin/AdminButton";
import { AdminCard, AdminPageHeader } from "@/components/admin/AdminCard";
import { AdminInput } from "@/components/admin/AdminInput";
import AdminSelect from "@/components/admin/AdminSelect";
import { prisma } from "@/lib/prisma";
import { createPlanAction } from "../actions";

const cycleOptions = [
  { value: BillingCycle.MONTHLY, label: "月付" },
  { value: BillingCycle.YEARLY, label: "年付" },
  { value: BillingCycle.WEEKLY, label: "周付" },
  { value: BillingCycle.QUARTERLY, label: "季度" },
  { value: BillingCycle.ONE_TIME, label: "一次性" },
  { value: BillingCycle.LIFETIME, label: "终身" },
  { value: BillingCycle.UNKNOWN, label: "未知" },
];

export default async function NewPlanPage({ searchParams }: { searchParams: Promise<{ product?: string;returnTo?:string }> }) {
  const { product: selectedSlug,returnTo:source } = await searchParams;
  const returnTo=safeAdminReturnTo(source,"/admin/plans");
  const products = await prisma.product.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true },
  });
  const selected = products.find((product) => product.slug === selectedSlug);

  return (
    <div>
      <AdminPageHeader eyebrow="Plans" title="新增套餐" description="先录入稳定的套餐身份与计费周期。新套餐始终从草稿开始，价格需要独立采集和审核。" action={<AdminLinkButton href={returnTo} variant="secondary">返回套餐库</AdminLinkButton>} />
      <AdminCard>
        {products.length === 0 ? <p className="text-sm text-admin-text-secondary dark:text-admin-text-secondary">请先在产品库建立产品。</p> : (
          <AdminActionForm action={createPlanAction} className="grid gap-5 md:grid-cols-2">
            <input type="hidden" name="returnTo" value={returnTo} />
            <AdminSelect name="productId" label="所属产品" value={selected?.id || products[0].id} options={products.map((product) => ({ value: product.id, label: product.name, description: product.slug }))} />
            <AdminInput name="name" label="套餐名称" required maxLength={160} placeholder="例如 Canva Pro" />
            <AdminInput name="slug" label="套餐 slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={120} helperText="稳定身份，例如 pro；有观测记录后不能修改。" />
            <AdminSelect name="billingCycle" label="计费周期" value={BillingCycle.MONTHLY} options={cycleOptions} />
            <AdminInput name="sortOrder" label="排序" type="number" min={0} max={100000} defaultValue={10} required />
            <div className="flex flex-wrap items-end gap-2">
              <AdminButton type="submit">保存草稿套餐</AdminButton>
              <AdminButton type="submit" variant="secondary" name="saveIntent" value="return">保存并返回</AdminButton>
            </div>
          </AdminActionForm>
        )}
      </AdminCard>
    </div>
  );
}
