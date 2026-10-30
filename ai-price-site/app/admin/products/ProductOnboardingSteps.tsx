import AdminLink from "@/components/admin/AdminLink";
import { productWorkflowHref } from "@/lib/admin-product-next-action";
type Props={currentStep?:"product"|"plans"|"prices"|"review";productId?:string;productSlug?:string};
export default function ProductOnboardingSteps({productSlug}:Props){
 return <aside className="mb-6 rounded-admin-card border border-admin-border bg-admin-surface p-4 text-sm text-admin-text-muted">
  <p>先保存产品资料，再配置价格来源。价格采集后由现有规则验证，符合条件的记录自动入库；产品和内容的发布状态单独管理。</p>
  {productSlug ? <AdminLink href={productWorkflowHref("/admin/pipeline",productSlug)}
   className="mt-2 inline-flex min-h-11 items-center text-admin-accent">继续到产品队列</AdminLink> : null}
 </aside>;
}
