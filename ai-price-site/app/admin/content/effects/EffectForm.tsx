"use client";

import { AdminActionForm, useAdminActionState } from '../../../../components/admin/AdminPermissions';
import { AdminButton } from '../../../../components/admin/AdminButton';
import { effectAction } from './actions';
const input='block w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-3 text-[var(--color-text-primary)]';
export default function EffectForm({id,version,opportunities=[]}:{id?:string;version?:number;opportunities?:{id:string;query:string}[]}){
 const [,action,pending]=useAdminActionState(effectAction,{message:''});
 return <AdminActionForm action={action} className="space-y-4">
  <input type="hidden" name="operation" value={id?'capture':'link'}/>
  {id?<input type="hidden" name="id" value={id}/>:<>
   <input type="hidden" name="version" value={version}/>
   <label className="block">已登记的内容搜索机会<select name="opportunityId" required className={input}>{opportunities.map(o=><option key={o.id} value={o.id}>{o.query}</option>)}</select></label>
   <label className="block">要解决的问题与预期改善<textarea name="hypothesis" required maxLength={500} className={input}/></label>
   <label className="block">搜索引擎<select name="engine" className={input}><option value="google">Google</option><option value="bing">Bing</option></select></label>
   <label className="block">证据报表时区<select name="timezone" className={input}><option value="America/Los_Angeles">美国太平洋时间（Google 报表）</option><option value="UTC">世界协调时间 UTC</option></select></label>
  </>}
  <AdminButton type="submit" disabled={pending}>{pending?'正在保存…':id?'保存本次证据观察':'关联当前版本'}</AdminButton>
 </AdminActionForm>;
}
