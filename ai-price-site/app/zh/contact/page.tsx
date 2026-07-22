export const metadata = {
  title: '联系我们',
  description: '联系 GeoSub，提交数据纠错、功能建议、合作请求或隐私相关问题。',
};

const contactItems = [
  {
    title: '数据纠错',
    desc: '如果你发现订阅价格、税费、地区名称或汇率折算存在错误，可以向我们提交纠错信息。',
  },
  {
    title: '功能建议',
    desc: '如果你希望增加新的 AI 工具、流媒体服务、礼品卡平台或图表功能，可以向我们反馈。',
  },
  {
    title: '商务合作',
    desc: '如果你希望进行内容合作、数据合作或品牌合作，可以通过联系方式与我们沟通。',
  },
  {
    title: '隐私问题',
    desc: '如果你对隐私政策、数据处理或用户权利有疑问，可以联系我们处理。',
  },
];

export default function ContactPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
          联系我们
        </h1>

        <p className="mt-5 text-zinc-500 dark:text-zinc-400 leading-7">
          你可以通过本页面联系 GeoSub，提交数据纠错、产品建议、商务合作或隐私相关问题。
        </p>
      </div>

      <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white">
          联系邮箱
        </h2>

        <p className="mt-4 text-zinc-500 dark:text-zinc-400 leading-7">
          请通过以下邮箱联系我们，并在邮件中注明相关产品、地区和问题类型。
        </p>

        <div className="mt-5 rounded-2xl bg-zinc-50 p-5 font-mono text-sm font-bold text-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-300">
          yoshirinra@gmail.com
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {contactItems.map((item) => (
          <div
            key={item.title}
            className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"
          >
            <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white">
              {item.title}
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              {item.desc}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
