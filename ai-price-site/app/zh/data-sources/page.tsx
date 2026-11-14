import AuxiliaryArticle from "../../../components/AuxiliaryArticle";
import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BadgeCheck, CalendarClock, CheckCircle2, CircleDollarSign, Database, FileSearch, Landmark, RefreshCw, Scale, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "数据来源与价格口径",
  description: "了解 GeoSub 的 App Store 地区订阅价格来源、套餐匹配、异常审核、汇率日期、税费说明、更新时间和可信状态。",
};

const sourceLayers = [
  { number: "01", title: "公开价格", badge: "主要来源", icon: Database, items: ["App Store 各地区公开订阅价格", "已接入产品的官网 Web 正价，与 App Store 分开展示", "产品、套餐、国家和币种的结构化记录", "原始本地币种与检查日期同步保留"] },
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
  return <AuxiliaryArticle>
    <section><div><div className="gs-aux-eyebrow gs-aux-icon-line"><Database className="gs-aux-icon" aria-hidden="true" /> DATA SOURCES · METHODOLOGY</div>
      <div className="gs-aux-stack"><div><h1>价格从哪里来，<span>每一步都应该说得清。</span></h1><p>GeoSub 按相同套餐和计费周期比较 App Store 各地区公开订阅价格，同时保留本地币种、来源、检查日期和汇率基准。</p></div><div className="gs-aux-note"><p className="gs-aux-eyebrow">来源政策</p><p>我们宁可暂时不展示，也不会用固定汇率、错误周期或无法解释的价格填补空白。</p></div></div>
    </div></section>

    <section><div><div><p className="gs-aux-eyebrow">数据结构</p><h2>来源、换算和限制分别呈现</h2><p>用户看到的不只是一个换算后的数字，还包括这个数字成立所需要的来源和条件。</p></div>
      <div className="gs-aux-stack">{sourceLayers.map((layer)=>{const Icon=layer.icon;return <article key={layer.title} className="gs-aux-block"><div className="gs-aux-icon-line"><span className="gs-aux-caption">{layer.number}</span><Icon className="gs-aux-icon" aria-hidden="true" /></div><div className="gs-aux-icon-line"><h3>{layer.title}</h3><span className="gs-aux-caption">{layer.badge}</span></div><ul>{layer.items.map((item)=><li key={item}><CheckCircle2 className="gs-aux-icon" aria-hidden="true" />{item}</li>)}</ul></article>;})}</div>
    </div></section>

    <section><div className="gs-aux-stack"><div><div className="gs-aux-icon-line"><RefreshCw className="gs-aux-icon" aria-hidden="true" /></div><p className="gs-aux-eyebrow">汇率与税费</p><h2>换算用于比较，不是结算承诺</h2><p>汇率用于把各地区本地价格换算为所选显示币种。参考汇率通常每 12 小时同步一次；页面标出汇率日期，过期或缺失时暂停对应换算。</p></div>
      <div className="gs-aux-stack"><article className="gs-aux-block"><CalendarClock className="gs-aux-icon" aria-hidden="true" /><h3>不同日期，分别标注</h3><p>价格检查日期、套餐复核日期和汇率日期含义不同，不会合并成一个模糊的“更新时间”。</p></article><article className="gs-aux-block"><Landmark className="gs-aux-icon" aria-hidden="true" /><h3>税费不重复叠加</h3><p>GeoSub 不会把税率额外加入采集价格里重新排序。App Store 标价通常已经反映平台地区定价逻辑，最终以官方结算页为准。</p></article></div>
    </div></section>

    <section><div className="gs-aux-stack"><article className="gs-aux-block"><div className="gs-aux-icon-line"><ShieldCheck className="gs-aux-icon" aria-hidden="true" />质量控制</div><h2>异常先隔离，再核实</h2><ul>{qualityRules.map((rule)=><li key={rule}><BadgeCheck className="gs-aux-icon" aria-hidden="true" />{rule}</li>)}</ul></article>
      <article className="gs-aux-block"><FileSearch className="gs-aux-icon" aria-hidden="true" /><h2>发现错误或过期数据？</h2><p>请提交产品、地区、套餐、页面链接和可信来源。纠错工单会进入私密后台审核队列。</p><Link href="/zh/contact#contact-form" className="gs-aux-link">提交数据纠错<ArrowRight className="gs-aux-icon" aria-hidden="true" /></Link></article></div></section>

    <section><div><AlertTriangle className="gs-aux-icon" aria-hidden="true" /><p><strong>风险提示：</strong>GeoSub 展示公开价格差异，用于比较不同地区的订阅成本，不鼓励规避平台规则。跨地区订阅可能受到账号地区、付款方式、账单信息、税费和平台风控影响。</p></div></section>
  </AuxiliaryArticle>;
}
