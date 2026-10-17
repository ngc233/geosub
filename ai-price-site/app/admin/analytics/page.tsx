import { requireAdmin } from '../../../lib/admin-auth';
import { readAdminTraffic } from '../../../lib/admin-traffic';
import type { TrafficSnapshot } from '../../../lib/admin-traffic-model';
import TrafficDashboard from './TrafficDashboard';
export const dynamic='force-dynamic';
export default async function AnalyticsPage(){
 await requireAdmin();
 let data:TrafficSnapshot|null=null;
 try {data=await readAdminTraffic();}catch{/* Missing data is displayed explicitly; no synthetic fallback. */}
 return <TrafficDashboard data={data}/>;
}
