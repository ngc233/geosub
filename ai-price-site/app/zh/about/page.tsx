import { PublicCard } from "../../../components/ui/PublicControls";
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
  return <main className="gs-aux-page" data-gs-aux="about">
    <PublicCard className="gs-aux-hero">
      <div className="gs-aux-container"><div className="gs-aux-eyebrow"><Globe2 className="gs-aux-glyph" /> ABOUT GEOSUB</div>
        <div className="gs-aux-grid gs-aux-grid-two"><div><h1 className="gs-aux-emphasis">把全球订阅价格，变成<span className="gs-aux-plain">可以理解的选择。</span></h1><p className="gs-aux-lead">GeoSub 是数字订阅价格情报平台。我们整理不同国家和地区的公开价格，并解释数字背后的汇率、税费、更新时间、购买力和订阅条件。</p></div><div className="gs-aux-panel"><p className="gs-aux-caption">我们的判断标准</p><p className="gs-aux-lead">一个价格只有在来源、时间、币种和适用条件都能解释时，才值得被比较。</p></div></div>
      </div>
    </PublicCard>

    <section className="gs-aux-section"><div className="gs-aux-container"><div className="gs-aux-copy"><p className="gs-aux-caption">我们解决什么问题</p><h2 className="gs-aux-emphasis">价格散落在不同市场，比较不该靠猜</h2><p className="gs-aux-block">同一个订阅服务，在不同国家可能使用不同币种、税费规则、套餐名称和支付条件。GeoSub 把这些分散信息整理为一致的数据结构，让用户看见差异，也看见差异成立的前提。</p></div>
      <div className="gs-aux-grid gs-aux-grid-three">{valueCards.map((item) => { const Icon=item.icon; return <PublicCard key={item.title} className="gs-aux-card"><div className="gs-aux-icon"><Icon className="gs-aux-glyph" /></div><h3 className="gs-aux-lead">{item.title}</h3><p className="gs-aux-small">{item.desc}</p></PublicCard>; })}</div></div></section>

    <section className="gs-aux-section"><div className="gs-aux-container gs-aux-grid gs-aux-grid-two"><div><p className="gs-aux-caption">HOW IT WORKS</p><h2 className="gs-aux-emphasis">从公开数字到可信比较</h2><p className="gs-aux-small">每个价格都会保留本地币种、采集日期和汇率基准。页面只使用通过一致性检查的地区价格，并提醒用户核对官方结算条件。</p><Link href="/zh/data-sources" className="gs-aux-link">查看数据来源与方法<ArrowRight className="gs-aux-glyph" /></Link></div>
      <div className="gs-aux-grid gs-aux-grid-three">{workflow.map((item,index)=>{const Icon=item.icon;return <PublicCard key={item.title} className="gs-aux-card"><div className="gs-aux-inline"><span className="gs-aux-caption">0{index+1}</span><Icon className="gs-aux-glyph" /></div><h3 className="gs-aux-lead">{item.title}</h3><p className="gs-aux-small">{item.desc}</p></PublicCard>;})}</div></div></section>

    <section className="gs-aux-section"><div className="gs-aux-container gs-aux-grid gs-aux-grid-two"><PublicCard className="gs-aux-card"><BadgeDollarSign className="gs-aux-glyph" /><h2 className="gs-aux-emphasis">商业合作不改变数据结论</h2><p className="gs-aux-small">GeoSub 可以开展广告、品牌、内容和联合数据合作，但必须明确标注。付费不会改变价格排名、数据审核结果或编辑判断。</p><Link href="/zh/contact" className="gs-aux-link">了解合作方式<ArrowRight className="gs-aux-glyph" /></Link></PublicCard>
      <PublicCard className="gs-aux-card"><Users className="gs-aux-glyph" /><h2 className="gs-aux-emphasis">为需要做决定的人服务</h2><div className="gs-aux-stack"><p className="gs-aux-inline"><CheckCircle2 className="gs-aux-glyph" />比较不同市场订阅成本的个人用户</p><p className="gs-aux-inline"><CheckCircle2 className="gs-aux-glyph" />研究数字产品定价的媒体与分析者</p><p className="gs-aux-inline"><CheckCircle2 className="gs-aux-glyph" />关注出海、支付和区域策略的团队</p></div></PublicCard></div></section>

    <section className="gs-aux-section"><div className="gs-aux-container"><div className="gs-aux-inline"><Clock3 className="gs-aux-glyph" /><div><p className="gs-aux-small gs-aux-emphasis">价格会变化，解释也需要持续更新</p><p className="gs-aux-small">发现数据错误、过期价格或缺少的产品，欢迎提交私密联系工单。</p></div></div><Link href="/zh/contact#contact-form" className="gs-aux-link">提交反馈<ArrowRight className="gs-aux-glyph" /></Link></div></section>
  </main>;
}
