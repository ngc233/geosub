import AdminLink from "../../../components/admin/AdminLink";
import { AdminCard } from "../../../components/admin/AdminCard";
import type { SeoSearchPagePriority } from "../../../lib/seo-search-performance-baseline";

function tierClassName(tier: SeoSearchPagePriority["tier"]) {
  if (tier === "优先优化") {
    return "bg-red-50 text-red-700 ring-red-200";
  }
  if (tier === "继续放大") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

export default function SeoSearchPriorityPanel({
  priorities,
  observedAt,
}: {
  priorities: SeoSearchPagePriority[];
  observedAt: string;
}) {
  return (
    <AdminCard className="mb-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950">双引擎页面优先级</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            把 Google 与 Bing 已核验的页面数据归并到稳定地址。优先处理已有曝光但点击率低、或旧查询地址仍在获得曝光的页面。
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
          观察截止 {observedAt}<br />手工核验快照，非实时 API
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[100px_minmax(280px,1fr)_100px_110px_110px_140px_220px] bg-slate-50 px-4 py-3 text-xs font-black text-slate-400">
            <div>优先级</div>
            <div>稳定页面</div>
            <div>来源</div>
            <div>展示</div>
            <div>点击率</div>
            <div>旧地址曝光</div>
            <div>处理原因</div>
          </div>
          <div className="divide-y divide-slate-100">
            {priorities.slice(0, 12).map((item) => (
              <div
                key={item.path}
                className="grid grid-cols-[100px_minmax(280px,1fr)_100px_110px_110px_140px_220px] items-center px-4 py-4 text-sm"
              >
                <div>
                  <span className={`rounded-md px-2 py-1 text-xs font-black ring-1 ${tierClassName(item.tier)}`}>
                    {item.score}
                  </span>
                </div>
                <div>
                  <AdminLink
                    href={item.path}
                    target="_blank"
                    className="font-mono text-xs font-bold text-blue-700 hover:text-blue-900"
                  >
                    {item.path}
                  </AdminLink>
                  <div className="mt-1 text-xs text-slate-400">{item.tier}</div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {item.engines.map((engine) => (
                    <span key={engine} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                      {engine === "google" ? "Google" : "Bing"}
                    </span>
                  ))}
                </div>
                <div className="font-black text-slate-950">{item.impressions.toLocaleString()}</div>
                <div className={item.impressions >= 100 && item.ctr < 2 ? "font-black text-red-700" : "font-bold text-slate-700"}>
                  {item.ctr}%
                </div>
                <div className={item.legacyImpressions > 0 ? "font-black text-amber-700" : "text-slate-400"}>
                  {item.legacyImpressions.toLocaleString()}
                </div>
                <div className="text-xs leading-5 text-slate-600">{item.reasons.join("；")}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminCard>
  );
}
