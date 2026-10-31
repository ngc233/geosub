import { requireAdmin } from '../../lib/admin-auth';
import { preproductionRuntime } from '../../lib/first-party-promotion';
import { readWorkspaceProducts } from '../../lib/admin-workspace';
import type { WorkspaceRow } from '../../lib/admin-workspace-model';
import Workspace from './Workspace';
import AdminVersionOverview from '../../components/admin/AdminVersionOverview';
export const dynamic='force-dynamic';
export default async function AdminDashboardPage({searchParams}:{searchParams:Promise<{permission?:string;view?:string;page?:string}>}){
 const admin=await requireAdmin(); const params=await searchParams;
 let rows:WorkspaceRow[]=[];let failed=false;
 try{rows=await readWorkspaceProducts();}catch{failed=true;}
 return <Workspace key={`${params.view}:${params.page}`} initialPage={params.page}
  versionOverview={<AdminVersionOverview compact />}
  initialFilter={params.view==='all'||params.view==='progress'?params.view:'action'} rows={rows}
  partial={preproductionRuntime()} failed={failed} role={admin.role} denied={params.permission==='denied'}
  readAt={new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})+' 北京时间'}/>;
}
