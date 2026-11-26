import AuxiliaryArticle from "../../../components/AuxiliaryArticle";
import AnalyticsConsentButton from "../../../components/AnalyticsConsentButton";
import PrivacyDisclosure from "../../../components/PrivacyDisclosure";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Cookie,
  Database,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "隐私政策",
  description:
    "了解 GeoSub 如何处理无标识页面汇总、经同意的行为分析和用户主动提交的联系工单，以及你可以如何管理选择和提出数据请求。",
};

const principles = [
  {
    title: "公开浏览无需实名",
    desc: "浏览价格与订阅信息无需提交姓名、身份证件、支付资料或账户密码。",
    icon: EyeOff,
  },
  {
    title: "分析由你选择",
    desc: "带访客或会话标识的行为分析只会在获得所需同意后运行，可随时撤回。",
    icon: Cookie,
  },
  {
    title: "工单保持私密",
    desc: "联系工单只用于核实与回复请求，不公开展示，也不用于广告画像。",
    icon: LockKeyhole,
  },
] as const;

const dataScopes = [
  {
    title: "无标识日汇总",
    desc: "无标识浏览总量仅用于基础页面计数，不读写 Cookie。",
    icon: BarChart3,
  },
  {
    title: "第一方交互分析",
    desc: "匿名交互与故障诊断事件需按页面设置取得同意后记录。",
    icon: Database,
  },
  {
    title: "第三方统计工具",
    desc: "Google Analytics 或 Tag Manager 仅在你主动同意后运行。",
    icon: Cookie,
  },
  {
    title: "主动提交工单",
    desc: "工单填写的联系信息仅用于沟通、纠错核对和隐私请求处理。",
    icon: Mail,
  },
] as const;

export default function PrivacyPage() {
  return (
    <AuxiliaryArticle
      locale="zh"
      summaryTitle="核心承诺"
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            隐私与数据最小化 · 更新于 2026 年 8 月 22 日
          </span>
          <h1>数据应该帮助你判断，不该用来追踪你。</h1>
          <p>
            这里用清楚的语言说明 GeoSub 记录什么、为什么记录、保存多久，以及你如何随时关闭行为分析或提出查询、更正和删除请求。
          </p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">核心承诺</p>
          <p>我们不出售可识别个人身份的信息，也不让广告或商业合作改变价格排名与核验结论。</p>
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">隐私基石</p>
          <h2>默认克制的三项基本原则</h2>
          <p>在收集任何可选统计信息之前，公开比价阅读始终保持免登录与最小化收集。</p>
        </div>
        <div className="gs-aux-stack">
          {principles.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="gs-aux-block">
                <div className="gs-aux-card-top">
                  <div className="gs-aux-card-title-group">
                    <span className="gs-aux-icon-chip">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <h3>{item.title}</h3>
                  </div>
                </div>
                <p>{item.desc}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">数据处理说明</p>
          <h2>不同数据，不混在一起说</h2>
          <p>无标识页面总量、经同意的行为分析和用户主动填写的联系工单用途截然不同，各自独立隔离。</p>
        </div>
        <div className="gs-aux-grid-2">
          {dataScopes.map((scope) => {
            const Icon = scope.icon;
            return (
              <article key={scope.title} className="gs-aux-block">
                <div className="gs-aux-card-top">
                  <div className="gs-aux-card-title-group">
                    <span className="gs-aux-icon-chip">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <h3>{scope.title}</h3>
                  </div>
                </div>
                <p>{scope.desc}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <PrivacyDisclosure locale="zh" articleLayout />
      </section>

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div>
              <p className="gs-aux-kicker">你的数据，由你决定</p>
              <h2 className="!m-0">管理统计偏好或提交隐私请求</h2>
            </div>
            <span className="gs-aux-icon-chip">
              <ShieldCheck size={18} aria-hidden="true" />
            </span>
          </div>
          <p>
            你可以直接在下方重新打开统计与 Cookie 偏好弹窗，或通过私密联系工单提交“隐私请求”。为防止他人冒用，我们仅核对与请求相关的必要信息，绝不会索要密码或付款资料。
          </p>
          <div className="gs-aux-actions">
            <Link
              href="/zh/contact#contact-form"
              className="gs-aux-primary-btn"
              data-gs-ui="button"
            >
              <span>提交隐私请求</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <AnalyticsConsentButton locale="zh" variant="secondary" />
          </div>
        </article>
      </section>
    </AuxiliaryArticle>
  );
}
