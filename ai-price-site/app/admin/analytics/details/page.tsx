import AdminLink from '../../../../components/admin/AdminLink';
import LegacyDashboard from '../../LegacyDashboard';
export default async function DetailedAnalytics(props:Parameters<typeof LegacyDashboard>[0]){
 return <><p className="mb-5 rounded-lg border border-admin-border p-4 text-sm">
  原看板明细使用当前连接数据库；本地数据库不含完整生产流量及运营记录。其全部浏览量口径与新版已分类浏览量不同。
  <AdminLink href="/admin/analytics" className="ml-3 underline">返回新版流量看板</AdminLink>
 </p>
 <LegacyDashboard {...props}/>
 </>;
}
