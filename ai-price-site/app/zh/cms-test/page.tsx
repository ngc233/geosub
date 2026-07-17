import Link from 'next/link';
import {
  getCmsProductPricingPage,
  getCountryCode,
  getCountryName,
} from '../../../lib/directus';
import { guardUnreleasedPublicPage } from '../../../lib/public-page-guard';

export const metadata = {
  title: 'CMS 集成测试',
  robots: {
    index: false,
    follow: false,
  },
};

function formatUsd(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '-';

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return '-';

  return `$${numberValue.toFixed(2)}`;
}

function formatDiff(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '基准未知';

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return '基准未知';

  if (numberValue === 0) return '美国基准';
  if (numberValue > 0) return `比美国贵 ${numberValue.toFixed(1)}%`;

  return `比美国便宜 ${Math.abs(numberValue).toFixed(1)}%`;
}

function qualityLabel(value: string) {
  const map: Record<string, string> = {
    verified: '已验证',
    estimated: '估算',
    stale: '待更新',
    pending_review: '待复核',
  };

  return map[value] ?? value;
}

function statusLabel(value: string) {
  const map: Record<string, string> = {
    draft: '草稿',
    review: '待审核',
    published: '已发布',
    archived: '已归档',
  };

  return map[value] ?? value;
}

export default async function CmsTestPage() {
  guardUnreleasedPublicPage();

  const data = await getCmsProductPricingPage('chatgpt', 'plus', 'zh');

  if (!data) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-3xl font-bold">没有读取到 CMS 数据</h1>
        <p className="mt-4 text-zinc-600">
          请检查 Directus 是否运行、.env.local 是否配置 DIRECTUS_URL 和
          DIRECTUS_TOKEN。
        </p>
      </main>
    );
  }

  const { product, plans, activePlan, prices, seo, faqs, affiliateLinks } = data;

  const usPrice = prices.find((price) => getCountryCode(price) === 'US');
  const cheapestPrice = prices[0];
  const mostExpensivePrice = prices[prices.length - 1];

  return (
    <main className="mx-auto max-w-[1500px] px-6 py-10">
      <div className="mb-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
        <strong>CMS 连接测试成功：</strong>
        当前页面数据来自 Directus，不再来自本地静态文件。
      </div>

      <nav className="mb-6 text-sm text-zinc-500">
        <Link href="/zh/" className="hover:text-zinc-900">
          首页
        </Link>
        <span className="mx-2">/</span>
        <span>CMS 测试</span>
        <span className="mx-2">/</span>
        <span>{product.name}</span>
      </nav>

      <section className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-500 dark:border-zinc-800">
              {product.category} / {product.provider}
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-zinc-950 dark:text-white">
              {seo?.h1 ?? `${product.name} 全球价格对比`}
            </h1>

            <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
              {product.description}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {plans.map((plan) => (
                <span
                  key={plan.id}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    plan.id === activePlan.id
                      ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300'
                  }`}
                >
                  {plan.name}
                </span>
              ))}
            </div>
          </div>

          <a
            href={product.official_url ?? '#'}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
          >
            官方页面
          </a>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500">美国基准价</p>
          <p className="mt-2 text-3xl font-bold">
            {formatUsd(usPrice?.price_usd)}
          </p>
          <p className="mt-2 text-sm text-zinc-500">统一作为 0% 对比基准</p>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            当前最低价
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-900 dark:text-emerald-100">
            {formatUsd(cheapestPrice?.price_usd)}
          </p>
          <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
            {cheapestPrice ? getCountryName(cheapestPrice) : '-'}
          </p>
        </div>

        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-sm dark:border-rose-900 dark:bg-rose-950/30">
          <p className="text-sm text-rose-700 dark:text-rose-300">
            当前最高价
          </p>
          <p className="mt-2 text-3xl font-bold text-rose-900 dark:text-rose-100">
            {formatUsd(mostExpensivePrice?.price_usd)}
          </p>
          <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">
            {mostExpensivePrice ? getCountryName(mostExpensivePrice) : '-'}
          </p>
        </div>
      </section>

      <section className="mt-8 overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-2xl font-bold">地区价格表</h2>
          <p className="mt-2 text-sm text-zinc-500">
            以下数据来自 Directus 的 region_prices 表，只展示 published 状态。
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-5 py-4">国家 / 地区</th>
                <th className="px-5 py-4">本地价格</th>
                <th className="px-5 py-4">折算美元</th>
                <th className="px-5 py-4">相对美国</th>
                <th className="px-5 py-4">置信度</th>
                <th className="px-5 py-4">数据质量</th>
                <th className="px-5 py-4">发布状态</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {prices.map((price) => (
                <tr key={price.id}>
                  <td className="px-5 py-4 font-semibold">
                    {getCountryName(price)}
                  </td>
                  <td className="px-5 py-4">
                    {price.local_price} {price.currency}
                  </td>
                  <td className="px-5 py-4 font-semibold">
                    {formatUsd(price.price_usd)}
                  </td>
                  <td className="px-5 py-4">
                    {formatDiff(price.diff_vs_us_percent)}
                  </td>
                  <td className="px-5 py-4">{price.confidence_score}</td>
                  <td className="px-5 py-4">
                    {qualityLabel(price.data_quality)}
                  </td>
                  <td className="px-5 py-4">{statusLabel(price.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-2xl font-bold">FAQ</h2>

          <div className="mt-5 space-y-4">
            {faqs.map((faq) => (
              <div key={faq.id} className="rounded-2xl bg-zinc-50 p-5 dark:bg-zinc-900">
                <h3 className="font-semibold">{faq.question}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-2xl font-bold">商业推荐位</h2>

          <div className="mt-5 space-y-4">
            {affiliateLinks.map((link) => (
              <div key={link.id} className="rounded-2xl bg-zinc-50 p-5 dark:bg-zinc-900">
                <h3 className="font-semibold">{link.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {link.description}
                </p>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950"
                >
                  {link.button_text ?? '查看'}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-xl font-bold">SEO 数据</h2>
        <div className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            <strong>Title：</strong>
            {seo?.title ?? '-'}
          </p>
          <p>
            <strong>Description：</strong>
            {seo?.description ?? '-'}
          </p>
          <p>
            <strong>Canonical：</strong>
            {seo?.canonical_url ?? '-'}
          </p>
        </div>
      </section>
    </main>
  );
}
