import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Cookie, Database, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import PrivacyDisclosure from "../../../components/PrivacyDisclosure";

export const metadata: Metadata = {
  title: "隐私政策",
  description: "了解 GeoSub 如何处理无标识页面汇总、经同意的行为分析和用户主动提交的联系工单，以及你可以如何管理选择和提出数据请求。",
};

const principles = [
  { title: "公开浏览无需实名", desc: "浏览价格与订阅信息无需提交姓名、证件、支付资料或账户密码。", icon: EyeOff },
  { title: "分析由你选择", desc: "带访客或会话标识的行为分析只会在获得所需同意后运行。", icon: Cookie },
  { title: "工单保持私密", desc: "联系工单只用于处理与回复请求，不公开展示，也不用于广告画像。", icon: LockKeyhole },
] as const;

export default function PrivacyPage() {
  return (
    <main className="bg-[#f6f2ea] text-[#182230]">
      <section className="border-b border-white/10 bg-[#182230] px-5 py-16 text-white sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-[0.12em] text-lime-300">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> PRIVACY · CONTROL
          </div>
          <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">数据应该帮助你判断，<span className="text-lime-300">不该用来追踪你。</span></h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">这里用清楚的语言说明 GeoSub 记录什么、为什么记录、保存多久，以及你如何拒绝分析或提出查询、更正和删除请求。</p>
            </div>
            <div className="border border-white/15 bg-white/5 p-6">
              <p className="text-xs font-bold tracking-[0.12em] text-slate-400">核心承诺</p>
              <p className="mt-3 text-xl font-black">我们不出售可识别个人身份的信息，也不让广告合作改变价格排名或数据结论。</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {principles.map((item) => { const Icon = item.icon; return <article key={item.title} className="border border-black/10 bg-white p-6">
            <div className="flex h-11 w-11 items-center justify-center bg-[#eaf8c9] text-emerald-800"><Icon className="h-5 w-5" aria-hidden="true" /></div>
            <h2 className="mt-5 text-lg font-black">{item.title}</h2><p className="mt-3 text-sm leading-6 text-zinc-600">{item.desc}</p>
          </article>; })}
        </div>
      </section>

      <section className="bg-white px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="text-xs font-black tracking-[0.14em] text-zinc-500">数据处理说明</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">不同数据，不混在一起说</h2>
              <p className="mt-5 text-sm leading-7 text-zinc-600">无标识页面总量、经同意的行为分析和用户主动填写的联系工单用途不同。下面逐项说明各自边界。</p>
              <div className="mt-7 space-y-3 text-sm font-bold text-zinc-700">
                <p className="flex gap-2"><BarChart3 className="h-5 w-5 text-blue-700" />无标识浏览总量用于基础运营</p>
                <p className="flex gap-2"><Database className="h-5 w-5 text-emerald-700" />行为分析需按页面设置取得同意</p>
                <p className="flex gap-2"><Cookie className="h-5 w-5 text-amber-700" />Google Analytics 或 Tag Manager 仅在同意后运行</p>
                <p className="flex gap-2"><Mail className="h-5 w-5 text-violet-700" />工单内容仅用于沟通和处理</p>
              </div>
            </div>
            <PrivacyDisclosure locale="zh" />
          </div>
        </div>
      </section>

      <section className="px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 border border-black/10 bg-[#eaf8c9] p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div><p className="text-sm font-black">你的数据，由你决定</p><h2 className="mt-3 text-2xl font-black sm:text-3xl">需要查询、更正或删除相关信息？</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-700">请通过私密联系工单提交“隐私请求”。为防止他人冒用，我们可能需要核对与你请求相关的必要信息，但不会要求密码或付款资料。</p></div>
          <Link href="/zh/contact#contact-form" className="inline-flex items-center justify-center gap-2 bg-[#182230] px-6 py-3 text-sm font-black text-white hover:bg-lime-500 hover:text-[#182230]">提交隐私请求<ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </main>
  );
}
