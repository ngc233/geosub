import { AdminButton } from "../../../components/admin/AdminButton";
import { AdminCard } from "../../../components/admin/AdminCard";
import { AdminInput } from "../../../components/admin/AdminInput";
import {
  getSeoObservationCtr,
  getSeoObservationDelta,
  getSeoObservationReviewWindow,
  getSeoTrafficObservationDelta,
  type SeoObservationSnapshot,
  type SeoTrafficObservationSnapshot,
} from "../../../lib/seo-observation-snapshots";
import {
  saveBingObservationSnapshotAction,
  saveSeoObservationSnapshotAction,
} from "./actions";

function deltaLabel(value: number, suffix = "") {
  if (value === 0) return "无变化";
  return `${value > 0 ? "+" : ""}${value}${suffix}`;
}

function Metric({
  label,
  value,
  delta,
}: {
  label: string;
  value: string | number;
  delta?: string | null;
}) {
  return (
    <div className="border-t border-slate-200 py-4 first:border-t-0 md:border-l md:border-t-0 md:px-5 md:first:border-l-0 md:first:pl-0">
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-black text-slate-950">{value}</div>
      {delta ? <div className="mt-1 text-xs text-slate-500">较上次 {delta}</div> : null}
    </div>
  );
}

function StatusNotice({
  saved,
  error,
  source,
}: {
  saved: boolean;
  error: boolean;
  source: string;
}) {
  if (saved) {
    return (
      <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
        {source} 快照已保存。后续请使用相同时间范围复查，数字才具有可比性。
      </div>
    );
  }
  if (error) {
    return (
      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
        数据未保存。请检查日期和非负整数，点击数不能大于展示数。
      </div>
    );
  }
  return null;
}

export default function SeoObservationPanel({
  googleSnapshots,
  bingSnapshots,
  productPages,
  planPages,
  indexableLocales,
  googleSaved,
  googleError,
  bingSaved,
  bingError,
}: {
  googleSnapshots: SeoObservationSnapshot[];
  bingSnapshots: SeoTrafficObservationSnapshot[];
  productPages: number;
  planPages: number;
  indexableLocales: number;
  googleSaved: boolean;
  googleError: boolean;
  bingSaved: boolean;
  bingError: boolean;
}) {
  const googleLatest = googleSnapshots[0];
  const googlePrevious = googleSnapshots[1];
  const googleDelta = googleLatest
    ? getSeoObservationDelta(googleLatest, googlePrevious)
    : null;
  const bingLatest = bingSnapshots[0];
  const bingPrevious = bingSnapshots[1];
  const bingDelta = bingLatest
    ? getSeoTrafficObservationDelta(bingLatest, bingPrevious)
    : null;
  const reviewWindow = googleLatest
    ? getSeoObservationReviewWindow(googleLatest.date)
    : null;

  return (
    <AdminCard className="mb-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950">双搜索引擎观察基线</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            分开保存 Google Search Console 与 Bing Webmaster 的只读汇总，用相同口径比较发布前后变化。这里不会连接搜索平台、提交网址或触发验证。
          </p>
        </div>
        <div className="text-sm text-slate-600">
          <span className="font-black text-slate-950">当前发布范围：</span>
          {indexableLocales} 种语言 · {productPages} 个产品总览 · {planPages} 个套餐页
        </div>
      </div>

      <section className="py-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="font-black text-slate-950">Google：流量与收录</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              记录点击、展示以及索引覆盖；建议每次使用同一个报表周期。
            </p>
          </div>
          {googleLatest ? (
            <div className="text-xs text-slate-500">
              最近快照 {googleLatest.date}
              {reviewWindow ? ` · 建议复查 ${reviewWindow.earliest} 至 ${reviewWindow.latest}` : ""}
            </div>
          ) : null}
        </div>

        <StatusNotice saved={googleSaved} error={googleError} source="Google" />

        {googleLatest ? (
          <div className="mt-3 grid md:grid-cols-3 xl:grid-cols-6">
            <Metric label="点击" value={googleLatest.clicks} delta={googleDelta ? deltaLabel(googleDelta.clicks) : null} />
            <Metric label="展示" value={googleLatest.impressions} delta={googleDelta ? deltaLabel(googleDelta.impressions) : null} />
            <Metric label="点击率" value={`${getSeoObservationCtr(googleLatest)}%`} delta={googleDelta ? deltaLabel(googleDelta.ctr, " 个百分点") : null} />
            <Metric label="已收录" value={googleLatest.indexedPages} delta={googleDelta ? deltaLabel(googleDelta.indexedPages) : null} />
            <Metric label="已发现未收录" value={googleLatest.discoveredNotIndexed} delta={googleDelta ? deltaLabel(googleDelta.discoveredNotIndexed) : null} />
            <Metric label="已抓取未收录" value={googleLatest.crawledNotIndexed} delta={googleDelta ? deltaLabel(googleDelta.crawledNotIndexed) : null} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">尚未保存 Google 基线。</p>
        )}

        <form action={saveSeoObservationSnapshotAction} className="mt-4 border-t border-slate-200 pt-5">
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <AdminInput label="数据截止日期" name="date" type="date" required />
            <AdminInput label="点击" name="clicks" type="number" min="0" step="1" required />
            <AdminInput label="展示" name="impressions" type="number" min="0" step="1" required />
            <AdminInput label="已收录" name="indexedPages" type="number" min="0" step="1" required />
            <AdminInput label="已发现未收录" name="discoveredNotIndexed" type="number" min="0" step="1" required />
            <AdminInput label="已抓取未收录" name="crawledNotIndexed" type="number" min="0" step="1" required />
          </div>
          <div className="mt-4 flex justify-end">
            <AdminButton type="submit">保存 Google 快照</AdminButton>
          </div>
        </form>
      </section>

      <section className="border-t border-slate-200 pt-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="font-black text-slate-950">Bing：搜索流量</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Bing 不混入 Google 的索引覆盖数字，只比较点击、展示和点击率。
            </p>
          </div>
          {bingLatest ? (
            <div className="text-xs text-slate-500">最近快照 {bingLatest.date}</div>
          ) : null}
        </div>

        <StatusNotice saved={bingSaved} error={bingError} source="Bing" />

        {bingLatest ? (
          <div className="mt-3 grid md:grid-cols-3">
            <Metric label="点击" value={bingLatest.clicks} delta={bingDelta ? deltaLabel(bingDelta.clicks) : null} />
            <Metric label="展示" value={bingLatest.impressions} delta={bingDelta ? deltaLabel(bingDelta.impressions) : null} />
            <Metric label="点击率" value={`${getSeoObservationCtr(bingLatest)}%`} delta={bingDelta ? deltaLabel(bingDelta.ctr, " 个百分点") : null} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">尚未保存 Bing 基线。</p>
        )}

        <form action={saveBingObservationSnapshotAction} className="mt-4 border-t border-slate-200 pt-5">
          <div className="grid gap-4 md:grid-cols-3">
            <AdminInput label="数据截止日期" name="date" type="date" required />
            <AdminInput label="点击" name="clicks" type="number" min="0" step="1" required />
            <AdminInput label="展示" name="impressions" type="number" min="0" step="1" required />
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">每个来源最多保留最近 24 次，不会自动修改搜索平台。</p>
            <AdminButton type="submit">保存 Bing 快照</AdminButton>
          </div>
        </form>
      </section>
    </AdminCard>
  );
}
