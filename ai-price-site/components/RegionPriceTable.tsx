import {
  formatUsd,
  type ProductPlan,
  type RegionPrice,
} from '../lib/public-pricing-model';

type RegionPriceTableProps = {
  plan: ProductPlan;
};

function getDiffPercent(region: RegionPrice, minPrice: number) {
  if (region.priceUsd === minPrice) {
    return 0;
  }

  return Math.round(((region.priceUsd - minPrice) / minPrice) * 100);
}

function getFriendliness(diffPercent: number) {
  if (diffPercent <= 5) {
    return {
      label: '高',
      className:
        'bg-lime-100 text-lime-700 dark:bg-lime-500/10 dark:text-lime-400',
    };
  }

  if (diffPercent <= 20) {
    return {
      label: '中',
      className:
        'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    };
  }

  return {
    label: '低',
    className:
      'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
  };
}

function getDiffBadge(diffPercent: number) {
  if (diffPercent === 0) {
    return {
      text: '最低价',
      className:
        'bg-lime-100 text-lime-700 dark:bg-lime-500/10 dark:text-lime-400',
    };
  }

  if (diffPercent <= 10) {
    return {
      text: `+${diffPercent}%`,
      className:
        'bg-lime-100 text-lime-700 dark:bg-lime-500/10 dark:text-lime-400',
    };
  }

  if (diffPercent <= 25) {
    return {
      text: `+${diffPercent}%`,
      className:
        'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    };
  }

  return {
    text: `+${diffPercent}%`,
    className:
      'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
  };
}

export default function RegionPriceTable({ plan }: RegionPriceTableProps) {
  const sortedRegions = [...plan.regions].sort(
    (a, b) => a.priceUsd - b.priceUsd
  );

  const minPrice = sortedRegions[0]?.priceUsd || 0;

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="border-b border-zinc-100 p-6 dark:border-zinc-800">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white">
              {plan.name} 完整地区价格表
            </h2>

            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              按折算美元价格从低到高展示，并加入相对最低价、税费和订阅友好度判断。
            </p>
          </div>

          <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            共 {sortedRegions.length} 个地区
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/70 text-xs font-black uppercase tracking-wide text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/40">
              <th className="w-16 px-6 py-4">#</th>
              <th className="min-w-[160px] px-4 py-4">地区</th>
              <th className="min-w-[150px] px-4 py-4">订阅价格</th>
              <th className="min-w-[120px] px-4 py-4">价差</th>
              <th className="min-w-[220px] px-4 py-4">税费说明</th>
              <th className="min-w-[120px] px-4 py-4">友好度</th>
              <th className="min-w-[140px] px-6 py-4 text-right">
                建议
              </th>
            </tr>
          </thead>

          <tbody>
            {sortedRegions.map((region, index) => {
              const diffPercent = getDiffPercent(region, minPrice);
              const diffBadge = getDiffBadge(diffPercent);
              const friendliness = getFriendliness(diffPercent);

              return (
                <tr
                  key={`${plan.slug}-${region.code}`}
                  className={`border-b border-zinc-100 transition-colors hover:bg-lime-50/40 dark:border-zinc-800/60 dark:hover:bg-lime-500/5 ${
                    region.isExpensive
                      ? 'bg-rose-50/30 dark:bg-rose-500/5'
                      : ''
                  }`}
                >
                  <td className="px-6 py-5 font-mono text-xs text-zinc-400">
                    {index + 1}
                  </td>

                  <td className="px-4 py-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-10 items-center justify-center rounded-xl bg-zinc-100 font-mono text-xs font-black text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {region.code}
                      </span>

                      <div>
                        <div className="font-extrabold text-zinc-900 dark:text-white">
                          {region.country}
                        </div>

                        <div className="mt-1 text-xs text-zinc-400">
                          Rank #{region.rank}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-5">
                    <div
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ${
                        region.isExpensive
                          ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                          : index <= 2
                            ? 'bg-lime-100 text-lime-700 dark:bg-lime-500/10 dark:text-lime-400'
                            : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}
                    >
                      {formatUsd(region.priceUsd)}/mo
                    </div>

                    <div className="mt-1.5 font-mono text-[11px] text-zinc-400">
                      ≈ {region.localPrice}
                    </div>
                  </td>

                  <td className="px-4 py-5">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${diffBadge.className}`}
                    >
                      {diffBadge.text}
                    </span>
                  </td>

                  <td className="px-4 py-5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                    {region.tax}
                  </td>

                  <td className="px-4 py-5">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${friendliness.className}`}
                    >
                      {friendliness.label}
                    </span>
                  </td>

                  <td className="px-6 py-5 text-right">
                    <span
                      className={`inline-flex rounded-xl px-3 py-2 text-xs font-bold ${
                        diffPercent <= 5
                          ? 'bg-lime-600 text-white'
                          : diffPercent <= 20
                            ? 'bg-amber-500 text-white'
                            : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {diffPercent <= 5
                        ? '优先考虑'
                        : diffPercent <= 20
                          ? '可备选'
                          : '不推荐'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
