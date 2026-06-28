import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

type SummaryRow = {
  product_slug: string;
  product_name: string;
  plan_slug: string;
  plan_name: string;
  covered_regions: number | bigint;
  min_income_share_percent: unknown;
  max_income_share_percent: unknown;
  avg_income_share_percent: unknown;
  min_burden_vs_us: unknown;
  max_burden_vs_us: unknown;
  avg_burden_vs_us: unknown;
  lowest_burden_country: string;
  highest_burden_country: string;
  income_data_year: number;
  income_source: string | null;
  income_metric_type: string | null;
  income_indicator_code: string | null;
  income_synced_at: Date | string | null;
  affordability_updated_at: Date | string | null;
};

type DetailRow = {
  product_slug: string;
  product_name: string;
  plan_slug: string;
  plan_name: string;
  country_code: string;
  country_name_zh: string | null;
  country_name_en: string | null;
  price_usd: unknown;
  monthly_income_usd: unknown;
  income_share_percent: unknown;
  burden_vs_us: unknown;
  affordability_level: string;
  income_data_year: number;
  income_source: string | null;
  income_metric_type: string | null;
  income_indicator_code: string | null;
  income_synced_at: Date | string | null;
  price_last_checked_at: Date | string | null;
};

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);

  if (value && typeof value === "object" && "toString" in value) {
    return Number(value.toString());
  }

  return 0;
}

function formatPercent(value: unknown, digits = 2) {
  return `${toNumber(value).toFixed(digits)}%`;
}

function formatUsd(value: unknown, digits = 0) {
  return `$${toNumber(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function formatTimes(value: unknown) {
  const number = toNumber(value);

  if (!Number.isFinite(number) || number <= 0) {
    return "-";
  }

  return `${number.toFixed(2)}x`;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toISOString().slice(0, 10);
}

function metricLabel(metricType?: string | null) {
  const map: Record<string, string> = {
    GNI_PPP: "GNI per capita, PPP",
    GNI_ATLAS: "GNI per capita, Atlas method",
    GDP_NOMINAL: "GDP per capita, current US$",
  };

  return metricType ? map[metricType] || metricType : "-";
}

function levelLabel(level: string) {
  const map: Record<string, string> = {
    LOW: "低负担",
    MODERATE_LOW: "较低负担",
    MODERATE: "中等负担",
    HIGH: "高负担",
    VERY_HIGH: "极高负担",
  };

  return map[level] || level;
}

function levelClassName(level: string) {
  if (level === "VERY_HIGH" || level === "HIGH") {
    return "bg-rose-100 text-rose-700";
  }

  if (level === "MODERATE") {
    return "bg-amber-100 text-amber-700";
  }

  if (level === "MODERATE_LOW") {
    return "bg-lime-100 text-lime-700";
  }

  return "bg-zinc-100 text-zinc-700";
}

export default async function AffordabilityPreviewPage() {
  const summaryRows = await prisma.$queryRaw<SummaryRow[]>`
    SELECT *
    FROM plan_affordability_summary_view
    ORDER BY product_slug, plan_slug
  `;

  const detailRows = await prisma.$queryRaw<DetailRow[]>`
    SELECT
      product_slug,
      product_name,
      plan_slug,
      plan_name,
      country_code,
      country_name_zh,
      country_name_en,
      price_usd,
      monthly_income_usd,
      income_share_percent,
      burden_vs_us,
      affordability_level,
      income_data_year,
      income_source,
      income_metric_type,
      income_indicator_code,
      income_synced_at,
      price_last_checked_at
    FROM plan_affordability_detail_view
    WHERE product_slug = 'chatgpt'
    ORDER BY plan_slug, income_share_percent DESC
  `;

  const latestSummary = summaryRows[0];
  const latestDetail = detailRows[0];

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-8 text-zinc-950">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <p className="text-sm font-black text-lime-700">GeoSub Admin</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            本地订阅负担指数预览
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-500">
            基于 World Bank 当前最新可用收入指标，将订阅月费折算为当地月均收入占比，并计算相对美国的负担倍数。
            收入指标通常会滞后于实时价格数据，因此需要单独标注“收入数据年份”。
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-5">
            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
              <div className="text-xs font-black text-zinc-400">收入指标</div>
              <div className="mt-1 text-sm font-black">
                {metricLabel(latestSummary?.income_metric_type)}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
              <div className="text-xs font-black text-zinc-400">指标代码</div>
              <div className="mt-1 text-sm font-black">
                {latestSummary?.income_indicator_code || "-"}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
              <div className="text-xs font-black text-zinc-400">收入数据年份</div>
              <div className="mt-1 text-sm font-black">
                {latestSummary?.income_data_year || "-"}，最新可用值
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
              <div className="text-xs font-black text-zinc-400">收入同步时间</div>
              <div className="mt-1 text-sm font-black">
                {formatDate(latestSummary?.income_synced_at)}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
              <div className="text-xs font-black text-zinc-400">价格检查时间</div>
              <div className="mt-1 text-sm font-black">
                {formatDate(latestDetail?.price_last_checked_at)}
              </div>
            </div>
          </div>
        </div>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">套餐汇总</h2>
              <p className="mt-1 text-sm text-zinc-500">
                用于判断每个套餐的最低负担、最高负担和平均负担。
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs font-black uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-4 py-3">产品</th>
                  <th className="px-4 py-3">套餐</th>
                  <th className="px-4 py-3">覆盖</th>
                  <th className="px-4 py-3">最低收入占比</th>
                  <th className="px-4 py-3">最高收入占比</th>
                  <th className="px-4 py-3">平均收入占比</th>
                  <th className="px-4 py-3">最低负担国家</th>
                  <th className="px-4 py-3">最高负担国家</th>
                  <th className="px-4 py-3">收入年份</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {summaryRows.map((row) => (
                  <tr key={`${row.product_slug}-${row.plan_slug}`}>
                    <td className="px-4 py-4 font-bold">{row.product_name}</td>
                    <td className="px-4 py-4 font-bold">{row.plan_name}</td>
                    <td className="px-4 py-4">{String(row.covered_regions)} 个地区</td>
                    <td className="px-4 py-4">{formatPercent(row.min_income_share_percent)}</td>
                    <td className="px-4 py-4">{formatPercent(row.max_income_share_percent)}</td>
                    <td className="px-4 py-4">{formatPercent(row.avg_income_share_percent)}</td>
                    <td className="px-4 py-4">{row.lowest_burden_country}</td>
                    <td className="px-4 py-4">{row.highest_burden_country}</td>
                    <td className="px-4 py-4">{row.income_data_year} 最新可用</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-black">ChatGPT 地区负担明细</h2>
            <p className="mt-1 text-sm text-zinc-500">
              收入占比越高，表示该订阅对当地平均收入的负担越高。收入数据年份表示 World Bank 当前最新可用年份，不代表价格数据年份。
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs font-black uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-4 py-3">套餐</th>
                  <th className="px-4 py-3">地区</th>
                  <th className="px-4 py-3">价格</th>
                  <th className="px-4 py-3">月均收入估算</th>
                  <th className="px-4 py-3">收入占比</th>
                  <th className="px-4 py-3">相对美国负担</th>
                  <th className="px-4 py-3">负担判断</th>
                  <th className="px-4 py-3">收入年份</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {detailRows.map((row) => (
                  <tr key={`${row.product_slug}-${row.plan_slug}-${row.country_code}`}>
                    <td className="px-4 py-4 font-bold">{row.plan_name}</td>
                    <td className="px-4 py-4">
                      <div className="font-black">{row.country_name_zh || row.country_name_en}</div>
                      <div className="mt-1 text-xs font-bold text-zinc-400">{row.country_code}</div>
                    </td>
                    <td className="px-4 py-4 font-mono font-bold">
                      {formatUsd(row.price_usd, 2)}/mo
                    </td>
                    <td className="px-4 py-4 font-mono">
                      {formatUsd(row.monthly_income_usd, 0)}/mo
                    </td>
                    <td className="px-4 py-4 font-black">
                      {formatPercent(row.income_share_percent, 2)}
                    </td>
                    <td className="px-4 py-4 font-black">
                      {formatTimes(row.burden_vs_us)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={[
                          "inline-flex rounded-full px-3 py-1 text-xs font-black",
                          levelClassName(row.affordability_level),
                        ].join(" ")}
                      >
                        {levelLabel(row.affordability_level)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs font-bold text-zinc-500">
                      {row.income_data_year} 最新可用
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}