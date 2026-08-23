import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BadgeCheck, CalendarClock, CheckCircle2, CircleDollarSign, Database, FileSearch, Landmark, RefreshCw, Scale, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "数据来源与价格口径",
  description: "了解 GeoSub 的 App Store 地区订阅价格来源、套餐匹配、异常审核、汇率日期、税费说明、更新时间和可信状态。",
};

const sourceLayers = [
  { number: "01", title: "公开价格", badge: "主要来源", icon: Database, items: ["App Store 各地区公开订阅价格", "产品、套餐、国家和币种的结构化记录", "原始本地币种与检查日期同步保留"] },
  { number: "02", title: "换算比较", badge: "定期更新", icon: CircleDollarSign, items: ["按所选显示币种换算地区价格", "相对美国基准价和地区价差", "缺失或过期汇率不生成估算"] },
  { number: "03", title: "阅读边界", badge: "结算页为准", icon: Scale, items: ["本地标价与换算价格分别展示", "价格采集、汇率和套餐复核日期分别标注", "账号、付款方式和税费可能影响最终金额"] },
] as const;

const qualityRules = [
  "同一套餐按原始币种、计费周期、地区和美元折算价做一致性检查。",
  "明显偏离常见范围、币种疑似错误或周期不一致的记录会暂缓展示。",
  "地区排行只使用已通过检查、能够与同一套餐直接比较的价格。",
  "税费说明不会被机械加入采集价格中改变排序。",
] as const;

export default function DataSourcesPage() {
  return <main className="bg-[#f6f2ea] text-[#182230]">
    <section className="border-b border-white/10 bg-[#182230] px-5 py-16 text-white sm:px-8 sm:py-20"><div className="mx-auto max-w-6xl"><div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-[0.12em] text-lime-300"><Database className="h-4 w-4" /> DATA SOURCES · METHODOLOGY</div>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-end"><div><h1 className="max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">价格从哪里来，<span className="text-lime-300">每一步都应该说得清。</span></h1><p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">GeoSub 按相同套餐和计费周期比较 App Store 各地区公开订阅价格，同时保留本地币种、来源、检查日期和汇率基准。</p></div><div className="border border-white/15 bg-white/5 p-6"><p className="text-xs font-bold tracking-[0.12em] text-slate-400">来源政策</p><p className="mt-3 text-xl font-black">我们宁可暂时不展示，也不会用固定汇率、错误周期或无法解释的价格填补空白。</p></div></div>
    </div></section>

    <section className="px-5 py-14 sm:px-8 sm:py-20"><div className="mx-auto max-w-6xl"><div className="max-w-3xl"><p className="text-xs font-black tracking-[0.14em] text-zinc-500">数据结构</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">来源、换算和限制分别呈现</h2><p className="mt-5 leading-7 text-zinc-600">用户看到的不只是一个换算后的数字，还包括这个数字成立所需要的来源和条件。</p></div>
      <div className="mt-9 grid gap-px border border-black/10 bg-black/10 md:grid-cols-3">{sourceLayers.map((layer)=>{const Icon=layer.icon;return <article key={layer.title} className="bg-white p-6 sm:p-7"><div className="flex items-center justify-between"><span className="text-xs font-black text-zinc-400">{layer.number}</span><Icon className="h-5 w-5 text-blue-700" /></div><div className="mt-7 flex items-center justify-between gap-3"><h3 className="text-xl font-black">{layer.title}</h3><span className="bg-[#eaf8c9] px-2 py-1 text-[11px] font-black text-emerald-800">{layer.badge}</span></div><ul className="mt-5 space-y-3 text-sm leading-6 text-zinc-600">{layer.items.map((item)=><li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />{item}</li>)}</ul></article>;})}</div>
    </div></section>

    <section className="bg-white px-5 py-14 sm:px-8 sm:py-20"><div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16"><div><div className="flex h-12 w-12 items-center justify-center bg-blue-50 text-blue-700"><RefreshCw className="h-6 w-6" /></div><p className="mt-6 text-xs font-black tracking-[0.14em] text-zinc-500">汇率与税费</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">换算用于比较，不是结算承诺</h2><p className="mt-5 text-sm leading-7 text-zinc-600">汇率用于把各地区本地价格换算为所选显示币种。参考汇率通常每 12 小时同步一次；页面标出汇率日期，过期或缺失时暂停对应换算。</p></div>
      <div className="grid gap-4 sm:grid-cols-2"><article className="border border-black/10 bg-[#faf9f6] p-6"><CalendarClock className="h-6 w-6 text-blue-700" /><h3 className="mt-5 text-lg font-black">不同日期，分别标注</h3><p className="mt-3 text-sm leading-7 text-zinc-600">价格检查日期、套餐复核日期和汇率日期含义不同，不会合并成一个模糊的“更新时间”。</p></article><article className="border border-black/10 bg-[#faf9f6] p-6"><Landmark className="h-6 w-6 text-amber-700" /><h3 className="mt-5 text-lg font-black">税费不重复叠加</h3><p className="mt-3 text-sm leading-7 text-zinc-600">GeoSub 不会把税率额外加入采集价格里重新排序。App Store 标价通常已经反映平台地区定价逻辑，最终以官方结算页为准。</p></article></div>
    </div></section>

    <section className="px-5 py-14 sm:px-8 sm:py-20"><div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_0.75fr]"><article className="border border-black/10 bg-[#eaf8c9] p-7 sm:p-9"><div className="flex items-center gap-2 text-sm font-black"><ShieldCheck className="h-5 w-5" />质量控制</div><h2 className="mt-4 text-2xl font-black sm:text-3xl">异常先隔离，再核实</h2><ul className="mt-6 grid gap-4 sm:grid-cols-2">{qualityRules.map((rule)=><li key={rule} className="flex gap-3 text-sm leading-6 text-zinc-700"><BadgeCheck className="h-5 w-5 shrink-0 text-emerald-700" />{rule}</li>)}</ul></article>
      <article className="border border-black/10 bg-[#182230] p-7 text-white sm:p-9"><FileSearch className="h-7 w-7 text-lime-300" /><h2 className="mt-6 text-2xl font-black">发现错误或过期数据？</h2><p className="mt-4 text-sm leading-7 text-slate-300">请提交产品、地区、套餐、页面链接和可信来源。纠错工单会进入私密后台审核队列。</p><Link href="/zh/contact#contact-form" className="mt-7 inline-flex items-center gap-2 text-sm font-black text-lime-300 hover:underline">提交数据纠错<ArrowRight className="h-4 w-4" /></Link></article></div></section>

    <section className="border-t border-black/10 bg-white px-5 py-10 sm:px-8"><div className="mx-auto flex max-w-6xl items-start gap-3 text-sm leading-7 text-zinc-600"><AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-amber-700" /><p><strong className="text-zinc-950">风险提示：</strong>GeoSub 展示公开价格差异，用于比较不同地区的订阅成本，不鼓励规避平台规则。跨地区订阅可能受到账号地区、付款方式、账单信息、税费和平台风控影响。</p></div></section>
  </main>;
}
