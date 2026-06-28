export const metadata = {
  title: '数据说明 - GeoSub',
  description:
    '了解 GeoSub 的价格来源、汇率折算方式、税费说明、价差计算方式和数据更新时间。',
};

export default function MethodologyPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
          数据说明
        </h1>

        <p className="mt-5 text-zinc-500 dark:text-zinc-400 leading-7">
          本页面说明 GeoSub 如何整理订阅价格、如何折算美元价格、如何计算价格差距，以及用户应该如何理解本站数据。
        </p>
      </div>

      <div className="space-y-6">
        <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white">
            价格来源
          </h2>

          <p className="mt-4 text-zinc-500 dark:text-zinc-400 leading-7">
            订阅价格通常来自 App Store、Google Play、官方网站、公开价格页、礼品卡平台和其他可公开访问的信息。
            不同产品的数据来源可能不同，我们会在具体产品详情页中逐步补充来源说明。
          </p>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white">
            汇率折算
          </h2>

          <p className="mt-4 text-zinc-500 dark:text-zinc-400 leading-7">
            本站会将不同地区的本地货币价格折算为美元价格，方便横向比较。由于汇率会波动，折算价格可能和用户实际付款时的银行汇率、平台汇率或支付渠道汇率存在差异。
          </p>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white">
            税费说明
          </h2>

          <p className="mt-4 text-zinc-500 dark:text-zinc-400 leading-7">
            不同国家和地区可能存在 VAT、GST、销售税、数字服务税或其他地方税。部分平台显示的是含税价，部分平台会在结算时额外计算税费。
            本站会尽量标注税费情况，但不保证所有税费信息实时准确。
          </p>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white">
            价格差距如何计算？
          </h2>

          <p className="mt-4 text-zinc-500 dark:text-zinc-400 leading-7">
            价格差距用于表示最高价地区相对最低价地区贵多少。计算公式为：
          </p>

          <div className="mt-5 rounded-2xl bg-zinc-50 p-5 font-mono text-sm text-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-300">
            价格差距 = (最高价 - 最低价) / 最低价 × 100%
          </div>

          <p className="mt-4 text-zinc-500 dark:text-zinc-400 leading-7">
            例如，某产品最低价为 $16.35，最高价为 $27.44，则价格差距约为 68%。
            这表示最高价地区比最低价地区贵约 68%。
          </p>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white">
            数据更新与纠错
          </h2>

          <p className="mt-4 text-zinc-500 dark:text-zinc-400 leading-7">
            价格、汇率和税费可能随时间变化。本站会持续更新数据，但不保证所有信息实时同步。
            如果你发现价格错误、地区缺失或信息过期，可以通过联系我们页面提交纠错。
          </p>
        </section>
      </div>
    </main>
  );
}