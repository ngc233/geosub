import AdminLink from './AdminLink';
import { AdminCard } from './AdminCard';
export default function AdminProductContext({id,slug,name}:{id:string;slug:string;name:string}){
 const product=encodeURIComponent(slug);
 const links=[['产品资料',`/admin/products/${id}/edit`],['套餐',`/admin/plans?product=${product}`],['价格与质量',`/admin/data-quality/${product}`],['采集与审核',`/admin/review?q=${product}`],['SEO 信息',`/admin/products/${id}/edit#product-seo`],...(slug==='chatgpt'?[['英文内容试点','/admin/content']]:[])];
 return <AdminCard className="mb-6 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"><nav aria-label="当前产品工作区"><p className="mb-3 text-sm font-semibold">当前产品：{name}</p><div className="flex flex-wrap gap-2">{links.map(([label,href])=><AdminLink key={label} href={href} className="rounded-lg border border-slate-200 px-3 py-3 text-sm text-blue-700 dark:border-slate-700 dark:text-blue-300">{label}</AdminLink>)}<AdminLink href="/admin" className="rounded-lg px-3 py-3 text-sm underline">返回工作台</AdminLink></div></nav><p className="mt-3 text-xs text-slate-500 dark:text-slate-400">产品发布、价格质量、采集进度和内容发布分别核对；进入页面不会触发写入。</p></AdminCard>;
}
