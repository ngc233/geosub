import { requireAdmin } from "../../../lib/admin-auth";
import { readAdminTraffic } from "../../../lib/admin-traffic";
import type { TrafficSnapshot } from "../../../lib/admin-traffic-model";
import AdminAlert from "@/components/admin/AdminAlert";
import AdminTabs from "@/components/admin/AdminTabs";
import LegacyDashboard from "../LegacyDashboard";
import TrafficDashboard from "./TrafficDashboard";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    tab?: string;
    range?: string;
    from?: string;
    to?: string;
  }>;
}) {
  await requireAdmin();
  const params = searchParams ? await searchParams : {};
  const tab = params.tab === "details" ? "details" : "overview";

  let data: TrafficSnapshot | null = null;
  if (tab === "overview") {
    try {
      data = await readAdminTraffic();
    } catch {
      /* Missing data is displayed explicitly; no synthetic fallback. */
    }
  }

  return (
    <div className="-mx-4 -my-5 sm:-mx-6 lg:-mx-8 lg:-my-6">
      <AdminTabs
        flush
        ariaLabel="流量分析视图"
        activeId={tab}
        items={[
          { id: "overview", label: "流量概览", href: "/admin/analytics" },
          { id: "details", label: "深度归因与漏斗", href: "/admin/analytics?tab=details" },
        ]}
      />

      <div className="px-4 py-5 sm:px-6">
        {tab === "overview" ? (
          <TrafficDashboard data={data} />
        ) : (
          <div className="space-y-5">
            <AdminAlert variant="info" title="当前数据库归因口径说明">
              深度归因、转化漏斗与服务热度直接查询当前连接数据库；本地环境不含完整生产流量，其全部浏览量口径与“流量概览”页签的已分类浏览量不同。
            </AdminAlert>
            <LegacyDashboard
              searchParams={Promise.resolve({
                range: params.range,
                from: params.from,
                to: params.to,
              })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
