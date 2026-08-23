import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, BarChart3, Building2, CheckCircle2, FileSearch, Lightbulb, Mail, Megaphone, MessageSquareText, ShieldCheck } from "lucide-react";
import ContactTicketForm from "./ContactTicketForm";

export const metadata: Metadata = {
  title: "联系我们与合作",
  description: "联系 GeoSub 提交价格纠错、产品建议、隐私请求，或咨询数据、内容、品牌与广告合作。",
};

const contactEmail = "yoshirinra@gmail.com";

const contactItems = [
  { title: "价格与数据纠错", desc: "发现价格、税费、币种、地区或订阅条件有误？请附上产品、地区、页面链接和可信来源。", action: "提交纠错", subject: "GeoSub 数据纠错", icon: FileSearch, tone: "bg-blue-50 text-blue-700" },
  { title: "产品与功能建议", desc: "告诉我们你希望新增的订阅产品、对比维度、工具或使用场景，我们会纳入需求评估。", action: "提出建议", subject: "GeoSub 产品建议", icon: Lightbulb, tone: "bg-amber-50 text-amber-700" },
  { title: "数据与内容合作", desc: "适合研究机构、媒体、开发者和数据服务商。可讨论数据引用、联合研究及内容合作。", action: "发起合作", subject: "GeoSub 数据或内容合作", icon: BarChart3, tone: "bg-emerald-50 text-emerald-700" },
  { title: "广告与品牌合作", desc: "面向与数字订阅、支付、出海和效率工具相关的品牌，提供清晰标注、独立审核的合作机会。", action: "咨询广告合作", subject: "GeoSub 广告与品牌合作", icon: Megaphone, tone: "bg-violet-50 text-violet-700" },
] as const;

const advertisingOptions = [
  { title: "品牌展示", desc: "在相关内容或工具页面展示明确标注的品牌信息，不伪装成编辑推荐。" },
  { title: "赞助内容", desc: "围绕订阅趋势、跨区定价或支付场景策划内容，并清楚披露合作关系。" },
  { title: "联合数据项目", desc: "基于可验证的方法制作行业观察、数据报告或专题页面，结论保持独立。" },
] as const;

function mailto(subject: string) {
  return `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}`;
}

export default function ContactPage() {
  return (
    <main className="bg-[#f6f2ea] text-[#182230]">
      <section className="border-b border-black/10 bg-[#182230] px-5 py-16 text-white sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-[0.12em] text-lime-300">
              <MessageSquareText className="h-4 w-4" aria-hidden="true" /> CONTACT · PARTNERSHIP
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">
              让价格信息更准确，<span className="text-lime-300">让合作更透明。</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              无论你要纠正一条价格、推荐一个产品，还是讨论数据、内容与品牌合作，都可以从这里找到最直接的沟通方式。
            </p>
          </div>
          <div className="border border-white/15 bg-white/5 p-6 sm:p-7">
            <p className="text-xs font-bold tracking-[0.14em] text-slate-400">联系邮箱</p>
            <a href={mailto("联系 GeoSub")} className="mt-3 flex items-center justify-between gap-4 text-lg font-bold hover:text-lime-300 sm:text-xl">
              <span className="break-all">{contactEmail}</span><Mail className="h-5 w-5 shrink-0" aria-hidden="true" />
            </a>
            <div className="mt-6 border-t border-white/10 pt-5 text-sm leading-6 text-slate-300">
              <p className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" aria-hidden="true" />请在主题中注明事项类型，便于快速分流。</p>
              <p className="mt-2 flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" aria-hidden="true" />数据纠错请尽量附页面链接、地区和来源。</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-black tracking-[0.14em] text-zinc-500">选择联系类型</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">告诉我们，你想解决什么问题</h2>
            <p className="mt-4 leading-7 text-zinc-600">点击对应入口会自动填写邮件主题。信息越具体，我们越容易核实并推进。</p>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-2">
            {contactItems.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="group border border-black/10 bg-white p-6 transition hover:-translate-y-0.5 hover:border-black/25 hover:shadow-lg sm:p-7">
                  <div className={`flex h-11 w-11 items-center justify-center ${item.tone}`}><Icon className="h-5 w-5" aria-hidden="true" /></div>
                  <h3 className="mt-5 text-xl font-black">{item.title}</h3>
                  <p className="mt-3 min-h-12 text-sm leading-6 text-zinc-600">{item.desc}</p>
                  <a href="#contact-form" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#182230] hover:underline">
                    {item.action}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
                  </a>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#f6f2ea] px-5 pb-14 sm:px-8 sm:pb-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-7 text-center">
            <p className="text-xs font-black tracking-[0.14em] text-zinc-500">私密联系工单</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">直接在站内提交，我们负责跟进</h2>
            <p className="mt-4 text-sm leading-6 text-zinc-600">工单不会公开展示。提交后会生成编号，并进入 GeoSub 后台处理队列。</p>
          </div>
          <ContactTicketForm />
        </div>
      </section>

      <section className="bg-white px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <div className="flex h-12 w-12 items-center justify-center bg-violet-50 text-violet-700"><Building2 className="h-6 w-6" aria-hidden="true" /></div>
            <p className="mt-6 text-xs font-black tracking-[0.14em] text-zinc-500">ADVERTISING &amp; BRAND</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">GeoSub 可以接广告吗？</h2>
            <p className="mt-5 leading-7 text-zinc-600">
              可以，但只接受与读者需求相关、合作关系清晰、不会干预价格数据和编辑结论的项目。我们更看重长期信任，而不是把每个位置都变成广告位。
            </p>
            <a href="#contact-form" className="mt-7 inline-flex items-center gap-2 bg-[#182230] px-5 py-3 text-sm font-black text-white transition hover:bg-lime-500 hover:text-[#182230]">
              获取合作方案<ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
          <div className="grid gap-px border border-black/10 bg-black/10 sm:grid-cols-3">
            {advertisingOptions.map((option, index) => (
              <div key={option.title} className="bg-[#faf9f6] p-6">
                <span className="text-xs font-black text-zinc-400">0{index + 1}</span>
                <h3 className="mt-7 text-lg font-black">{option.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-600">{option.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 border border-black/10 bg-[#eaf8c9] p-7 sm:p-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-black"><ShieldCheck className="h-5 w-5" aria-hidden="true" />商业合作原则</div>
            <h2 className="mt-4 text-2xl font-black sm:text-3xl">合作可以发生，数据立场不能出售</h2>
          </div>
          <ul className="grid gap-3 text-sm font-semibold text-zinc-700 sm:grid-cols-2">
            <li className="flex gap-2"><BadgeCheck className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />广告与赞助内容明确标注</li>
            <li className="flex gap-2"><BadgeCheck className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />付费不改变价格排名</li>
            <li className="flex gap-2"><BadgeCheck className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />不出售个人浏览数据</li>
            <li className="flex gap-2"><BadgeCheck className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />保留事实核验与编辑独立性</li>
          </ul>
        </div>
      </section>

      <section className="border-t border-black/10 px-5 py-14 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black">隐私相关请求</p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">如需查询、更正或删除与浏览器标识符相关的数据，请在邮件主题中注明“隐私请求”。</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-bold">
            <a href="#contact-form" className="inline-flex items-center gap-2 hover:underline"><Mail className="h-4 w-4" aria-hidden="true" />联系处理</a>
            <Link href="/zh/privacy" className="inline-flex items-center gap-2 hover:underline">阅读隐私政策<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
