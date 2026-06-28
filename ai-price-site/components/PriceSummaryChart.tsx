import {
  formatUsd,
  type PlanStats,
  type ProductPlan,
} from '../data/ai-pricing';

type PriceSummaryChartProps = {
  plan: ProductPlan;
  stats: PlanStats;
};

export default function PriceSummaryChart({
  plan,
  stats,
}: PriceSummaryChartProps) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white">
            {plan.name} 价格差距总览
          </h2>

          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            这个图只看最低价和最高价，帮助你快速判断地区价格差距。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            ↑ {stats.spreadPercent}% 价差
          </span>

          <span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-black text-lime-700 dark:bg-lime-500/10 dark:text-lime-400">
            最高可省 {stats.savingPercent}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-lime-50 p-5 dark:bg-lime-500/10">
          <div className="text-xs font-black text-lime-700 dark:text-lime-400">
            最低价地区
          </div>

          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <div className="text-3xl font-extrabold text-zinc-900 dark:text-white">
                {stats.minRegion.country}
              </div>

              <div className="mt-1 text-sm font-mono text-zinc-500 dark:text-zinc-400">
                {stats.minRegion.code}
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-black text-lime-700 dark:text-lime-400">
                {formatUsd(stats.minRegion.priceUsd)}
              </div>

              <div className="text-xs text-zinc-400">/mo</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-rose-50 p-5 dark:bg-rose-500/10">
          <div className="text-xs font-black text-rose-600 dark:text-rose-400">
            最高价地区
          </div>

          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <div className="text-3xl font-extrabold text-zinc-900 dark:text-white">
                {stats.maxRegion.country}
              </div>

              <div className="mt-1 text-sm font-mono text-zinc-500 dark:text-zinc-400">
                {stats.maxRegion.code}
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {formatUsd(stats.maxRegion.priceUsd)}
              </div>

              <div className="text-xs text-zinc-400">/mo</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-7">
        <div className="mb-3 flex items-center justify-between text-xs font-bold text-zinc-400">
          <span>{stats.minRegion.country}</span>
          <span>{stats.maxRegion.country}</span>
        </div>

        <div className="relative h-4 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-lime-400 via-amber-300 to-rose-400" />
        </div>

        <div className="mt-4 rounded-2xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-600 dark:bg-zinc-950/50 dark:text-zinc-300">
          {stats.maxRegion.country} 的价格比 {stats.minRegion.country} 贵约{' '}
          <strong className="text-rose-600 dark:text-rose-400">
            {stats.spreadPercent}%
          </strong>
          。如果从最高价地区切换到最低价地区，理论上可以节省约{' '}
          <strong className="text-lime-700 dark:text-lime-400">
            {stats.savingPercent}%
          </strong>
          。
        </div>
      </div>
    </section>
  );
}