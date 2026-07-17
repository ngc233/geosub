import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "服务条款",
  description: "本页面说明用户访问和使用 GeoSub 时需要了解的基础规则、信息边界和免责声明。",
};

export default function TrustPage() {
  return (
    <main className="min-h-screen bg-[#faf8f2] px-5 py-16">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime-600">
          Terms of Service
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
          服务条款
        </h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-600">
          本页面说明用户访问和使用 GeoSub 时需要了解的基础规则、信息边界和免责声明。
        </p>

        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm shadow-zinc-950/[0.03]">
          <h2 className="text-xl font-black text-zinc-950">
            页面说明
          </h2>

          <p className="mt-4 text-sm leading-8 text-zinc-600">
            GeoSub 提供的是公开价格数据整理、地区价格比较和订阅信息参考，不构成购买建议、法律建议或财务建议。具体价格、可用性、税费和订阅政策请以官方平台为准。
          </p>

          <p className="mt-6 text-sm leading-8 text-zinc-500">
            使用 GeoSub 即表示你理解这些数据是公开价格参考。跨区订阅、账号地区、支付方式、税费和平台风控可能影响最终是否可订阅，最终请以官方结算页和平台规则为准。
          </p>
        </div>
      </section>
    </main>
  );
}
