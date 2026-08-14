import { ArrowRight, ExternalLink, Search } from "lucide-react";
import AdminLink from "../../../components/admin/AdminLink";
import { AdminCard } from "../../../components/admin/AdminCard";
import {
  getSeoConversionRate,
  type SeoConversionMetric,
  type SeoSearchEngine,
  type SeoTrafficConversionOverview,
} from "../../../lib/seo-traffic-conversion";

function engineLabel(engine: SeoSearchEngine) {
  return engine === "google" ? "Google" : "Bing";
}

function engineClassName(engine: SeoSearchEngine) {
  return engine === "google"
    ? "bg-blue-50 text-blue-700 ring-blue-200"
    : "bg-cyan-50 text-cyan-700 ring-cyan-200";
}

function rateLabel(value: number, base: number) {
  return `${getSeoConversionRate(value, base)}%`;
}

function Metric({
  label,
  value,
  helper,
  tone = "slate",
}: {
  label: string;
  value: number;
  helper: string;
  tone?: "slate" | "blue" | "emerald";
}) {
  const toneClassName = {
    slate: "text-slate-950",
    blue: "text-blue-700",
    emerald: "text-emerald-700",
  }[tone];

  return (
    <div className="border-t border-slate-200 py-4 first:border-t-0 md:border-l md:border-t-0 md:px-5 md:first:border-l-0 md:first:pl-0">
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-black ${toneClassName}`}>
        {value.toLocaleString("zh-CN")}
      </div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{helper}</div>
    </div>
  );
}

function EngineRow({
  engine,
  metric,
}: {
  engine: SeoSearchEngine;
  metric: SeoConversionMetric;
}) {
  return (
    <div className="grid grid-cols-[100px_repeat(6,minmax(120px,1fr))] items-center border-t border-slate-100 px-4 py-3 text-sm first:border-t-0">
      <div>
        <span className={`rounded-md px-2 py-1 text-xs font-black ring-1 ${engineClassName(engine)}`}>
          {engineLabel(engine)}
        </span>
      </div>
      <div className="font-black text-slate-950">{metric.landingSessions}</div>
      <div>
        <span className="font-black text-slate-950">{metric.pricingSessions}</span>
        <span className="ml-1 text-xs text-slate-400">
          {rateLabel(metric.pricingSessions, metric.landingSessions)}
        </span>
      </div>
      <div>
        <span className="font-black text-slate-950">{metric.planSessions}</span>
        <span className="ml-1 text-xs text-slate-400">
          {rateLabel(metric.planSessions, metric.landingSessions)}
        </span>
      </div>
      <div>
        <span className="font-black text-slate-950">{metric.officialSessions}</span>
        <span className="ml-1 text-xs text-slate-400">
          {rateLabel(metric.officialSessions, metric.landingSessions)}
        </span>
      </div>
      <div>
        <span className="font-black text-slate-950">{metric.commercialSessions}</span>
        <span className="ml-1 text-xs text-slate-400">
          {rateLabel(metric.commercialSessions, metric.landingSessions)}
        </span>
      </div>
      <div>
        <span className="font-black text-emerald-700">{metric.completedSessions}</span>
        <span className="ml-1 text-xs text-slate-400">
          {rateLabel(metric.completedSessions, metric.landingSessions)}
        </span>
      </div>
    </div>
  );
}

export default function SeoTrafficConversionPanel({
  overview,
}: {
  overview: SeoTrafficConversionOverview;
}) {
  const { total } = overview;

  return (
    <AdminCard className="mb-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Search aria-hidden="true" className="size-5 text-blue-700" />
            <h2 className="text-lg font-black text-slate-950">搜索落地后的用户动作</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            统计由 Google 或 Bing 进入 GeoSub 公开页面的会话，观察用户是否继续进入价格内容、查看套餐并访问官网。它用于判断搜索流量有没有产生真实兴趣，不与站内搜索漏斗混算。
          </p>
        </div>
        <div className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
          滚动 {overview.windowDays} 天<br />同一访问最多观察 {overview.sessionMinutes} 分钟
        </div>
      </div>

      <div className="grid py-2 md:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="搜索落地会话"
          value={total.landingSessions}
          helper="带 Google/Bing 来源的公开页面访问"
        />
        <Metric
          label="进入价格内容"
          value={total.pricingSessions}
          helper={`${rateLabel(total.pricingSessions, total.landingSessions)} 的搜索会话进入产品或套餐价格页`}
          tone="blue"
        />
        <Metric
          label="已查看套餐"
          value={total.planSessions}
          helper={`${rateLabel(total.planSessions, total.landingSessions)} 的搜索会话进入套餐比较`}
          tone="blue"
        />
        <Metric
          label="访问官网"
          value={total.officialSessions}
          helper={`${rateLabel(total.officialSessions, total.landingSessions)} 的搜索会话点击官方入口`}
        />
        <Metric
          label="完成关键路径"
          value={total.completedSessions}
          helper="先查看套餐，再点击官网、合作入口或广告"
          tone="emerald"
        />
      </div>

      <section className="border-t border-slate-200 py-5">
        <h3 className="text-sm font-black text-slate-950">按搜索引擎比较</h3>
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
          <div className="min-w-[960px]">
            <div className="grid grid-cols-[100px_repeat(6,minmax(120px,1fr))] bg-slate-50 px-4 py-3 text-xs font-black text-slate-400">
              <div>来源</div>
              <div>落地会话</div>
              <div>价格内容</div>
              <div>查看套餐</div>
              <div>访问官网</div>
              <div>商业动作</div>
              <div>完成路径</div>
            </div>
            {overview.engines.length > 0 ? (
              overview.engines.map((item) => (
                <EngineRow key={item.engine} engine={item.engine} metric={item} />
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                当前观察窗内还没有可归因的 Google/Bing 搜索落地会话。
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 py-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-950">主要搜索落地页</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              先看哪些页面获得搜索访问，再判断它们有没有把用户带到套餐和官网。
            </p>
          </div>
          <AdminLink
            href="/admin/events?eventKey=click_official"
            className="inline-flex items-center gap-1.5 text-xs font-black text-blue-700 hover:text-blue-900"
          >
            查看官网点击明细
            <ArrowRight aria-hidden="true" className="size-4" />
          </AdminLink>
        </div>

        {overview.topPages.length > 0 ? (
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
            <div className="min-w-[940px] divide-y divide-slate-100">
              {overview.topPages.map((item) => (
                <div
                  key={`${item.engine}:${item.path}`}
                  className="grid grid-cols-[90px_minmax(320px,1fr)_110px_120px_120px_120px] items-center px-4 py-3 text-sm"
                >
                  <div>
                    <span className={`rounded-md px-2 py-1 text-xs font-black ring-1 ${engineClassName(item.engine)}`}>
                      {engineLabel(item.engine)}
                    </span>
                  </div>
                  <AdminLink
                    href={item.path}
                    target="_blank"
                    className="inline-flex min-w-0 items-center gap-1.5 font-mono text-xs font-bold text-blue-700 hover:text-blue-900"
                  >
                    <span className="truncate">{item.path}</span>
                    <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
                  </AdminLink>
                  <div>
                    <span className="font-black text-slate-950">{item.landingSessions}</span>
                    <span className="ml-1 text-xs text-slate-400">次落地</span>
                  </div>
                  <div>
                    <span className="font-black text-slate-950">{item.pricingSessions}</span>
                    <span className="ml-1 text-xs text-slate-400">进价格页</span>
                  </div>
                  <div>
                    <span className="font-black text-slate-950">{item.planSessions}</span>
                    <span className="ml-1 text-xs text-slate-400">看套餐</span>
                  </div>
                  <div>
                    <span className="font-black text-emerald-700">{item.officialSessions}</span>
                    <span className="ml-1 text-xs text-slate-400">进官网</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500 md:grid-cols-3">
        <div>
          <div className="font-black text-slate-700">站长平台口径</div>
          Google/Bing 快照看展示、点击和收录，用固定报表周期比较前后变化。
        </div>
        <div>
          <div className="font-black text-slate-700">站内转化口径</div>
          本面板从带搜索来源的公开页面会话起算；直接访问、站内搜索和无法识别来源的访问不计入。
        </div>
        <div>
          <div className="font-black text-slate-700">判断方式</div>
          站长平台点击和本站会话受同意状态、隐私设置及时区影响，判断趋势，不要求数字完全相等。
        </div>
      </div>
    </AdminCard>
  );
}
