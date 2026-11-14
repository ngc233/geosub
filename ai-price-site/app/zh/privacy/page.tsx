import AuxiliaryArticle from "../../../components/AuxiliaryArticle";
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
    <AuxiliaryArticle>
      <section>
        <div>
          <div className="gs-aux-eyebrow gs-aux-icon-line">
            <ShieldCheck className="gs-aux-icon" aria-hidden="true" /> PRIVACY · CONTROL
          </div>
          <div className="gs-aux-stack">
            <div>
              <h1>数据应该帮助你判断，<span>不该用来追踪你。</span></h1>
              <p>这里用清楚的语言说明 GeoSub 记录什么、为什么记录、保存多久，以及你如何拒绝分析或提出查询、更正和删除请求。</p>
            </div>
            <div className="gs-aux-note">
              <p className="gs-aux-eyebrow">核心承诺</p>
              <p>我们不出售可识别个人身份的信息，也不让广告合作改变价格排名或数据结论。</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="gs-aux-stack">
          {principles.map((item) => { const Icon = item.icon; return <article key={item.title} className="gs-aux-block">
            <div className="gs-aux-icon-line"><Icon className="gs-aux-icon" aria-hidden="true" /></div>
            <h2>{item.title}</h2><p>{item.desc}</p>
          </article>; })}
        </div>
      </section>

      <section>
        <div>
          <div className="gs-aux-stack">
            <div>
              <p className="gs-aux-eyebrow">数据处理说明</p>
              <h2>不同数据，不混在一起说</h2>
              <p>无标识页面总量、经同意的行为分析和用户主动填写的联系工单用途不同。下面逐项说明各自边界。</p>
              <div className="gs-aux-stack">
                <p className="gs-aux-icon-line"><BarChart3 className="gs-aux-icon" aria-hidden="true" />无标识浏览总量用于基础运营</p>
                <p className="gs-aux-icon-line"><Database className="gs-aux-icon" aria-hidden="true" />行为分析需按页面设置取得同意</p>
                <p className="gs-aux-icon-line"><Cookie className="gs-aux-icon" aria-hidden="true" />Google Analytics 或 Tag Manager 仅在同意后运行</p>
                <p className="gs-aux-icon-line"><Mail className="gs-aux-icon" aria-hidden="true" />工单内容仅用于沟通和处理</p>
              </div>
            </div>
            <PrivacyDisclosure locale="zh" articleLayout />
          </div>
        </div>
      </section>

      <section>
        <div className="gs-aux-note">
          <div><p>你的数据，由你决定</p><h2>需要查询、更正或删除相关信息？</h2><p>请通过私密联系工单提交“隐私请求”。为防止他人冒用，我们可能需要核对与你请求相关的必要信息，但不会要求密码或付款资料。</p></div>
          <Link href="/zh/contact#contact-form" className="gs-aux-link">提交隐私请求<ArrowRight className="gs-aux-icon" aria-hidden="true" /></Link>
        </div>
      </section>
    </AuxiliaryArticle>
  );
}
