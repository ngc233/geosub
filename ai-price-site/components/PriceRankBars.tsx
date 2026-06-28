import {
  formatUsd,
  type ProductPlan,
} from '../data/ai-pricing';

type PriceRankBarsProps = {
  plan: ProductPlan;
};

export default function PriceRankBars({ plan }: PriceRankBarsProps) {
  const sortedRegions = [...plan.regions].sort(
    (a, b) => a.priceUsd - b.priceUsd
  );

  const maxPrice = Math.max(...sortedRegions.map((region) => region.priceUsd));

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white">
          地区价格排名
        </h2>

        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          条形越长，表示该地区折算价格越高。绿色代表低价区，红色代表高价区。
        </p>
      </div>

      <div className="space-y-4">
        {sortedRegions.map((region, index) => {
          const width = Math.max((region.priceUsd / maxPrice) * 100, 10);

          const tone = region.isExpensive
            ? 'bg-rose-400'
            : index <= 2
              ? 'bg-lime-400'
              : 'bg-amber-300';

          return (
            <div key={`${plan.slug}-${region.code}`} className="grid grid-cols-12 items-center gap-3">
              <div className="col-span-3 md:col-span-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-zinc-400">
                    {region.code}
                  </span>

                  <span className="truncate text-sm font-bold text-zinc-900 dark:text-white">
                    {region.country}
                  </span>
                </div>
              </div>

              <div className="col-span-6 md:col-span-8">
                <div className="h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={`h-full rounded-full ${tone}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>

              <div className="col-span-3 md:col-span-2 text-right">
                <div
                  className={`text-sm font-black ${
                    region.isExpensive
                      ? 'text-rose-600 dark:text-rose-400'
                      : index <= 2
                        ? 'text-lime-700 dark:text-lime-400'
                        : 'text-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  {formatUsd(region.priceUsd)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}