import AdminLink from "../../../components/admin/AdminLink";
import { AdminCard } from "../../../components/admin/AdminCard";
import {
  groupSeoSearchPagePriorities,
  type SeoSearchPagePriority,
} from "../../../lib/seo-search-performance-baseline";

function tierClassName(tier: SeoSearchPagePriority["tier"]) {
  if (tier === "优先优化") return "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-800";
  if (tier === "继续放大") return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800";
  return "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
}

export default function SeoSearchPriorityPanel({ priorities }: { priorities: SeoSearchPagePriority[] }) {
  const windows = groupSeoSearchPagePriorities(priorities);
  return (
    <AdminCard className="mb-6">
      <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">按引擎与观察窗口的页面优先级</h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
        Google 与 Bing 分开展示，仅在同一引擎、同一窗口内排序，不合并点击、展示或点击率。来源、导入时间与历史窗口见上方页面级搜索信号。
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
        手工核验快照，非实时 API。分数仅帮助定位待诊断页面，不代表修改标题的依据；实验锁定页仅观察。
      </p>
      {(["google", "bing"] as const).map((engine) => {
        const engineWindows = windows.filter((item) => item.engine === engine);
        const label = engine === "google" ? "Google" : "Bing";
        return (
          <section key={engine} className="mt-6 min-w-0 border-t border-slate-200 pt-5 dark:border-slate-700" aria-label={`${label} 页面优先级`}>
            <h3 className="font-black text-slate-950 dark:text-slate-50">{label}</h3>
            {engineWindows.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">暂无可用页面观测，不能据此判断为零流量。</p>
            ) : engineWindows.map((window) => (
              <div key={`${window.periodStart}/${window.periodEnd}`} className="mt-4 min-w-0">
                <p className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                  观察窗口 {window.periodStart} 至 {window.periodEnd}
                  <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">共 {window.priorities.length} 个页面，展示前 12 项</span>
                </p>
                <div className="overflow-x-auto rounded-lg border border-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-700" tabIndex={0} role="region" aria-label={`${label} ${window.periodStart} 至 ${window.periodEnd} 排序表，可横向滚动`}>
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <caption className="sr-only">{label} {window.periodStart} 至 {window.periodEnd}，仅窗口内排序</caption>
                    <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      <tr>{["分数", "稳定页面", "点击", "展示", "点击率", "旧地址曝光", "诊断与保护状态"].map((heading) => <th key={heading} scope="col" className="px-4 py-3">{heading}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {window.priorities.slice(0, 12).map((item) => (
                        <tr key={item.path}>
                          <td className="px-4 py-4"><span className={`rounded-md px-2 py-1 text-xs font-black ring-1 ${tierClassName(item.tier)}`}>{item.score}</span></td>
                          <th scope="row" className="min-w-64 px-4 py-4 font-normal">
                            <AdminLink href={item.path} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-xs font-bold text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-300">{item.path}</AdminLink>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.tier}</div>
                          </th>
                          <td className="px-4 py-4 font-bold text-slate-950 dark:text-slate-50">{item.clicks.toLocaleString("zh-CN")}</td>
                          <td className="px-4 py-4 font-bold text-slate-950 dark:text-slate-50">{item.impressions.toLocaleString("zh-CN")}</td>
                          <td className="px-4 py-4 font-bold text-slate-700 dark:text-slate-200">{item.ctr}%</td>
                          <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{item.legacyImpressions.toLocaleString("zh-CN")}</td>
                          <td className="min-w-64 px-4 py-4 text-xs leading-5 text-slate-600 dark:text-slate-300">
                            {item.experimentId ? <div className="mb-1 font-bold">实验锁定，仅观察<span className="mt-1 block break-all font-mono font-normal">{item.experimentId}</span></div> : null}
                            {item.reasons.join("；")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </AdminCard>
  );
}
