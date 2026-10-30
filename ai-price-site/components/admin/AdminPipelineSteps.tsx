import AdminLink from "@/components/admin/AdminLink";
import { Database, ShieldCheck, Workflow } from "lucide-react";
import { productWorkflowHref } from "@/lib/admin-product-next-action";
import { withAdminReturnTo } from "@/lib/admin-workflow-context";
type PipelineStep = "pipeline" | "discovery" | "collector" | "review" | "published";
const steps = [
  {id:"pipeline",label:"产品队列",path:"/admin/pipeline",icon:Workflow},
  {id:"review",label:"异常审核",path:"/admin/review",icon:ShieldCheck},
  {id:"published",label:"正式价格",path:"/admin/prices",icon:Database},
] as const;
export default function AdminPipelineSteps({currentStep,productSlug,returnTo}:{
  currentStep:PipelineStep;productSlug?:string;returnTo?:string;
}) {
  const contextHref = (href:string) => returnTo ? withAdminReturnTo(href,returnTo) : href;
  const active=currentStep;
  return <div className="mb-6 space-y-2">
    <nav aria-label="价格工作流" className="grid grid-cols-3 gap-2">
      {steps.map(({id,label,path,icon:Icon})=><AdminLink key={id}
        href={contextHref(productWorkflowHref(path,productSlug||""))} aria-current={active===id ? "step" : undefined}
        prefetch="auto" showPending
        className={`flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg border px-2 py-2
          text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent ${
            active===id ? "border-admin-accent bg-admin-accent-soft text-admin-accent"
              : "border-admin-border bg-admin-surface text-admin-text-secondary hover:bg-admin-surface-subtle"}`}>
        <Icon aria-hidden="true" size={16} className="hidden shrink-0 sm:block"/>{label}
      </AdminLink>)}
    </nav>
    <details className="text-xs text-admin-text-muted">
      <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-lg px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent">来源与线索工具</summary>
      <div className="flex flex-wrap gap-2 pb-2">
        <AdminLink href={contextHref("/admin/discovery")}
          className="inline-flex min-h-11 items-center rounded-lg border border-admin-border px-3 text-admin-accent">
          线索录入</AdminLink>
        <AdminLink href={contextHref(productWorkflowHref("/admin/collector-jobs",productSlug||""))}
          className="inline-flex min-h-11 items-center rounded-lg border border-admin-border px-3 text-admin-accent">
          来源与运行记录</AdminLink>
      </div>
    </details>
  </div>;
}
