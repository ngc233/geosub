import { PublicCard } from "../../../components/ui/PublicControls";
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
    <main className="gs-aux-page" data-gs-aux="privacy">
      <PublicCard className="gs-aux-hero">
        <div className="gs-aux-container">
          <div className="gs-aux-eyebrow">
            <ShieldCheck className="gs-aux-glyph" aria-hidden="true" /> PRIVACY · CONTROL
          </div>
          <div className="gs-aux-grid gs-aux-grid-two">
            <div>
              <h1 className="gs-aux-emphasis">数据应该帮助你判断，<span className="gs-aux-plain">不该用来追踪你。</span></h1>
              <p className="gs-aux-lead">这里用清楚的语言说明 GeoSub 记录什么、为什么记录、保存多久，以及你如何拒绝分析或提出查询、更正和删除请求。</p>
            </div>
            <div className="gs-aux-panel">
              <p className="gs-aux-caption">核心承诺</p>
              <p className="gs-aux-lead">我们不出售可识别个人身份的信息，也不让广告合作改变价格排名或数据结论。</p>
            </div>
          </div>
        </div>
      </PublicCard>

      <section className="gs-aux-section">
        <div className="gs-aux-container gs-aux-grid gs-aux-grid-three">
          {principles.map((item) => { const Icon = item.icon; return <PublicCard key={item.title} className="gs-aux-card">
            <div className="gs-aux-icon"><Icon className="gs-aux-glyph" aria-hidden="true" /></div>
            <h2 className="gs-aux-lead">{item.title}</h2><p className="gs-aux-small">{item.desc}</p>
          </PublicCard>; })}
        </div>
      </section>

      <section className="gs-aux-section">
        <div className="gs-aux-container">
          <div className="gs-aux-grid gs-aux-grid-two">
            <div>
              <p className="gs-aux-caption">数据处理说明</p>
              <h2 className="gs-aux-emphasis">不同数据，不混在一起说</h2>
              <p className="gs-aux-small">无标识页面总量、经同意的行为分析和用户主动填写的联系工单用途不同。下面逐项说明各自边界。</p>
              <div className="gs-aux-small gs-aux-emphasis">
                <p className="gs-aux-inline"><BarChart3 className="gs-aux-glyph" />无标识浏览总量用于基础运营</p>
                <p className="gs-aux-inline"><Database className="gs-aux-glyph" />行为分析需按页面设置取得同意</p>
                <p className="gs-aux-inline"><Cookie className="gs-aux-glyph" />Google Analytics 或 Tag Manager 仅在同意后运行</p>
                <p className="gs-aux-inline"><Mail className="gs-aux-glyph" />工单内容仅用于沟通和处理</p>
              </div>
            </div>
            <PrivacyDisclosure locale="zh" />
          </div>
        </div>
      </section>

      <section className="gs-aux-section">
        <div className="gs-aux-container gs-aux-grid gs-aux-grid-two">
          <div><p className="gs-aux-small gs-aux-emphasis">你的数据，由你决定</p><h2 className="gs-aux-emphasis">需要查询、更正或删除相关信息？</h2><p className="gs-aux-small">请通过私密联系工单提交“隐私请求”。为防止他人冒用，我们可能需要核对与你请求相关的必要信息，但不会要求密码或付款资料。</p></div>
          <Link href="/zh/contact#contact-form" className="gs-aux-link">提交隐私请求<ArrowRight className="gs-aux-glyph" /></Link>
        </div>
      </section>
    </main>
  );
}
