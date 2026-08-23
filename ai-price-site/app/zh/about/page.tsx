import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeDollarSign, BookOpenCheck, CheckCircle2, Clock3, Database, Globe2, Scale, SearchCheck, ShieldCheck, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "关于 GeoSub",
  description: "了解 GeoSub 如何整理和核验全球数字订阅价格，解释汇率、税费、更新时间、购买力与订阅条件，并坚持数据和商业合作相互独立。",
};

const valueCards = [
  { title: "跨地区可比", desc: "保留本地币种，并以一致的汇率基准帮助用户理解不同市场的实际价差。", icon: Globe2 },
  { title: "证据可追溯", desc: "公开价格附带来源、检查日期和适用条件，不把未经复核的数字包装成结论。", icon: SearchCheck },
  { title: "条件说清楚", desc: "价格之外，同时提示税费、账号地区、支付方式和套餐可用性等关键边界。", icon: ShieldCheck },
] as const;

const workflow = [
  { title: "收集公开价格", desc: "整理不同地区的 App Store 订阅价格和产品套餐信息。", icon: Database },
  { title: "完成一致性检查", desc: "核对币种、套餐、地区、来源和时间，隔离异常或冲突记录。", icon: BookOpenCheck },
  { title: "形成可解释比较", desc: "展示本地价格、美元参考、购买力和订阅条件，不隐去重要限制。", icon: Scale },
] as const;

export default function AboutPage() {
  return <main className="bg-[#f6f2ea] text-[#182230]">
    <section className="border-b border-white/10 bg-[#182230] px-5 py-16 text-white sm:px-8 sm:py-20">
      <div className="mx-auto max-w-6xl"><div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-[0.12em] text-lime-300"><Globe2 className="h-4 w-4" /> ABOUT GEOSUB</div>
        <div className="mt-6 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end"><div><h1 className="max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">把全球订阅价格，变成<span className="text-lime-300">可以理解的选择。</span></h1><p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">GeoSub 是数字订阅价格情报平台。我们整理不同国家和地区的公开价格，并解释数字背后的汇率、税费、更新时间、购买力和订阅条件。</p></div><div className="border border-white/15 bg-white/5 p-6"><p className="text-xs font-bold tracking-[0.12em] text-slate-400">我们的判断标准</p><p className="mt-3 text-xl font-black">一个价格只有在来源、时间、币种和适用条件都能解释时，才值得被比较。</p></div></div>
      </div>
    </section>

    <section className="px-5 py-14 sm:px-8 sm:py-20"><div className="mx-auto max-w-6xl"><div className="max-w-3xl"><p className="text-xs font-black tracking-[0.14em] text-zinc-500">我们解决什么问题</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">价格散落在不同市场，比较不该靠猜</h2><p className="mt-5 leading-8 text-zinc-600">同一个订阅服务，在不同国家可能使用不同币种、税费规则、套餐名称和支付条件。GeoSub 把这些分散信息整理为一致的数据结构，让用户看见差异，也看见差异成立的前提。</p></div>
      <div className="mt-9 grid gap-4 md:grid-cols-3">{valueCards.map((item) => { const Icon=item.icon; return <article key={item.title} className="border border-black/10 bg-white p-6"><div className="flex h-11 w-11 items-center justify-center bg-[#eaf8c9] text-emerald-800"><Icon className="h-5 w-5" /></div><h3 className="mt-5 text-lg font-black">{item.title}</h3><p className="mt-3 text-sm leading-6 text-zinc-600">{item.desc}</p></article>; })}</div></div></section>

    <section className="bg-white px-5 py-14 sm:px-8 sm:py-20"><div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16"><div><p className="text-xs font-black tracking-[0.14em] text-zinc-500">HOW IT WORKS</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">从公开数字到可信比较</h2><p className="mt-5 text-sm leading-7 text-zinc-600">每个价格都会保留本地币种、采集日期和汇率基准。页面只使用通过一致性检查的地区价格，并提醒用户核对官方结算条件。</p><Link href="/zh/data-sources" className="mt-7 inline-flex items-center gap-2 text-sm font-black hover:underline">查看数据来源与方法<ArrowRight className="h-4 w-4" /></Link></div>
      <div className="grid gap-px border border-black/10 bg-black/10 sm:grid-cols-3">{workflow.map((item,index)=>{const Icon=item.icon;return <article key={item.title} className="bg-[#faf9f6] p-6"><div className="flex items-center justify-between"><span className="text-xs font-black text-zinc-400">0{index+1}</span><Icon className="h-5 w-5 text-blue-700" /></div><h3 className="mt-8 text-lg font-black">{item.title}</h3><p className="mt-3 text-sm leading-6 text-zinc-600">{item.desc}</p></article>;})}</div></div></section>

    <section className="px-5 py-14 sm:px-8 sm:py-20"><div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2"><article className="border border-black/10 bg-[#182230] p-7 text-white sm:p-9"><BadgeDollarSign className="h-7 w-7 text-lime-300" /><h2 className="mt-6 text-2xl font-black">商业合作不改变数据结论</h2><p className="mt-4 text-sm leading-7 text-slate-300">GeoSub 可以开展广告、品牌、内容和联合数据合作，但必须明确标注。付费不会改变价格排名、数据审核结果或编辑判断。</p><Link href="/zh/contact" className="mt-7 inline-flex items-center gap-2 text-sm font-black text-lime-300 hover:underline">了解合作方式<ArrowRight className="h-4 w-4" /></Link></article>
      <article className="border border-black/10 bg-[#eaf8c9] p-7 sm:p-9"><Users className="h-7 w-7 text-emerald-800" /><h2 className="mt-6 text-2xl font-black">为需要做决定的人服务</h2><div className="mt-5 grid gap-3 text-sm font-semibold text-zinc-700"><p className="flex gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-700" />比较不同市场订阅成本的个人用户</p><p className="flex gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-700" />研究数字产品定价的媒体与分析者</p><p className="flex gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-700" />关注出海、支付和区域策略的团队</p></div></article></div></section>

    <section className="border-t border-black/10 bg-white px-5 py-12 sm:px-8"><div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-5 w-5 text-zinc-500" /><div><p className="text-sm font-black">价格会变化，解释也需要持续更新</p><p className="mt-2 text-sm text-zinc-600">发现数据错误、过期价格或缺少的产品，欢迎提交私密联系工单。</p></div></div><Link href="/zh/contact#contact-form" className="inline-flex items-center justify-center gap-2 bg-[#182230] px-5 py-3 text-sm font-black text-white">提交反馈<ArrowRight className="h-4 w-4" /></Link></div></section>
  </main>;
}
