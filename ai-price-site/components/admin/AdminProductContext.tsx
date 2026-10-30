import AdminProductLogo from "@/components/admin/AdminProductLogo";
import AdminLink from "./AdminLink";
import { AdminCard } from "./AdminCard";
import { safeAdminReturnTo, withAdminReturnTo } from "@/lib/admin-workflow-context";
import { productWorkflowHref } from "@/lib/admin-product-next-action";
export default function AdminProductContext({id,slug,name,returnTo}:{id:string;slug:string;name:string;returnTo?:string}){
 const product=encodeURIComponent(slug);
 const links=[['产品资料',`/admin/products/${id}/edit`],['套餐',`/admin/plans?product=${product}`],
  ['正式价格',`/admin/prices?product=${product}`],['数据诊断',`/admin/data-quality/${product}`],
  ['来源与采集',`/admin/collector-jobs?product=${product}`],['SEO 信息',`/admin/seo?product=${product}`],
  ...(slug==='chatgpt'?[['英文内容试点','/admin/content']]:[])];
 return <AdminCard className="mb-6">
  <div className="flex flex-wrap items-center justify-between gap-2">
   <div className="flex min-w-0 items-center gap-3">
    <AdminProductLogo slug={slug} name={name} size="md"/>
    <p className="min-w-0 break-words text-sm font-semibold">当前产品：{name}</p>
   </div>
   <AdminLink href={returnTo ? safeAdminReturnTo(returnTo) : productWorkflowHref("/admin/pipeline",slug)}
    className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-admin-accent underline">
    {returnTo ? "返回来源列表" : "进入产品队列"}
   </AdminLink>
  </div>
 <details className="mt-2">
  <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-lg px-2 text-sm text-admin-text-muted
   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent">产品资料与诊断</summary>
  <nav aria-label="当前产品资料与诊断" className="mt-2 flex flex-wrap gap-2">{links.map(([label,href])=>
   <AdminLink key={label} href={returnTo ? withAdminReturnTo(href,returnTo) : href}
    className="inline-flex min-h-11 items-center rounded-lg border border-admin-border px-3 text-sm text-admin-accent">
    {label}</AdminLink>)}
  </nav>
  <p className="mt-3 text-xs text-admin-text-muted">产品资料发布、价格验证与内容发布分别核对。</p>
 </details></AdminCard>;
}
