'use client';
import AdminLink from '../../components/admin/AdminLink';
import { AdminButton } from '../../components/admin/AdminButton';
export default function AdminError({error,retry}:{error:Error & {digest?:string};retry:()=>void}){
 const stale=error.name==='UnrecognizedActionError'||/Server Action .* was not found on the server/.test(error.message);
 return <section role="alert" className="rounded-admin-card border border-admin-border bg-admin-surface
  p-6 dark:border-admin-border dark:bg-admin-surface">
  <h1 className="font-semibold text-xl sm:text-2xl">{stale?'后台版本已更新，请刷新页面':'这部分后台数据暂时无法读取'}</h1>
  <p className="my-4 text-sm text-admin-text-muted dark:text-admin-text-muted">{stale?
   '当前页面的操作已过期。刷新会加载新版本，不会自动重新提交；请先核对记录，再决定是否重新操作。未保存的输入需要重新填写。':
   '请重试或返回工作台。此提示不表示数据为零，也不代表刚才的写入一定失败；提交操作后遇到此提示，请先核对记录再重试写入。'}</p>
  <div className="flex flex-wrap gap-4">
   <AdminButton onClick={stale?()=>window.location.reload():retry}>{stale?'刷新到最新版本':'重新读取页面'}</AdminButton>
   <AdminLink href="/admin" className="px-3 py-3 text-sm underline">返回工作台</AdminLink>
  </div>
 </section>;
}
