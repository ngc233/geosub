import AuxiliaryArticle from "../../../components/AuxiliaryArticle";
import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  Landmark,
  Scale,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "服务条款",
  description: "本页面说明用户访问和使用 GeoSub 时需要了解的基础规则、信息边界和免责声明。",
};

const termsSections = [
  {
    number: "01",
    kicker: "服务性质",
    title: "独立公开比价参考，非隶属或购买建议",
    icon: Scale,
    body: "GeoSub 提供的是公开价格数据整理、地区价格比较和订阅信息参考，不构成购买建议、法律建议或财务建议。GeoSub 是独立比较服务，与页面展示的订阅品牌或应用商店不存在隶属、赞助或背书关系。",
    points: [
      "页面展示的价格、汇率折算与省钱幅度仅用于横向信息比较",
      "商业或内容合作均会明确标注，绝不干预价格排序或核验标准",
    ],
  },
  {
    number: "02",
    kicker: "结算与规则边界",
    title: "具体价格与可用性以官方结算页为准",
    icon: Landmark,
    body: "使用 GeoSub 即表示你理解这些数据是公开价格参考。跨区订阅、账号地区、支付方式、税费和平台风控可能影响最终是否可订阅，最终请以官方结算页和平台规则为准。",
    points: [
      "汇率波动、当地税制调整或平台随时改价可能导致换算值与扣款金额存在差异",
      "GeoSub 不销售账号、代充或规避平台地区风控的工具，请遵守各服务商官方条款",
    ],
  },
  {
    number: "03",
    kicker: "合理使用与引用",
    title: "尊重数据核验成果与服务稳定性",
    icon: ShieldCheck,
    body: "欢迎个人读者查阅对比，也支持媒体与研究者在注明“来源：GeoSub”及采集日期的前提下合理引用公开图表与结论。",
    points: [
      "禁止通过高频自动化脚本恶意抓取、压测或干扰网站正常访问",
      "引用地区价格时请一并保留币种、计费周期与日期口径，避免断章取义",
    ],
  },
] as const;

export default function TrustPage() {
  return (
    <AuxiliaryArticle
      locale="zh"
      summaryTitle="核心声明"
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            平台使用规则与信息边界
          </span>
          <h1>服务条款</h1>
          <p>
            本页面说明访问和使用 GeoSub 数字订阅比价与指南内容时需要了解的服务定位、结算边界、合理使用规范与免责声明。
          </p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">核心声明</p>
          <p>
            所有公开地区标价、汇率换算与税费说明均为独立信息参考；实际扣款金额、订阅资格与退款政策始终以对应平台的官方结算页为准。
          </p>
        </div>
      </section>

      {termsSections.map((section) => {
        const Icon = section.icon;
        return (
          <section key={section.number}>
            <article className="gs-aux-block">
              <div className="gs-aux-card-top">
                <div className="gs-aux-card-title-group">
                  <span data-gs-ui="tag" className="gs-aux-step-num" aria-hidden="true">
                    {section.number}
                  </span>
                  <div>
                    <p className="gs-aux-kicker">{section.kicker}</p>
                    <h2 className="!m-0">{section.title}</h2>
                  </div>
                </div>
                <span className="gs-aux-icon-chip">
                  <Icon size={18} aria-hidden="true" />
                </span>
              </div>
              <p>{section.body}</p>
              <ul className="gs-aux-checklist">
                {section.points.map((point) => (
                  <li key={point}>
                    <CheckCircle2 aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        );
      })}

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div className="gs-aux-card-title-group">
              <span data-gs-ui="tag" className="gs-aux-step-num" aria-hidden="true">
                04
              </span>
              <div>
                <p className="gs-aux-kicker">外部链接与修订</p>
                <h2 className="!m-0">第三方跳转说明与联系渠道</h2>
              </div>
            </div>
            <span className="gs-aux-icon-chip">
              <ExternalLink size={18} aria-hidden="true" />
            </span>
          </div>
          <p>
            页面中包含指向各产品官网或官方应用商店的参考链接，外部站点的可用性、隐私处理与交易安全由对应运营方独立负责。本条款可能随产品功能更新而修订，更新后将在本页直接生效。
          </p>
          <div className="gs-aux-actions">
            <Link
              href="/zh/data-sources"
              className="gs-aux-primary-btn"
              data-gs-ui="button"
            >
              <FileText size={15} aria-hidden="true" />
              <span>查看数据来源与口径</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link
              href="/zh/privacy"
              className="gs-aux-secondary-btn"
              data-gs-ui="button"
            >
              <span>阅读隐私政策</span>
            </Link>
            <Link
              href="/zh/contact"
              className="gs-aux-secondary-btn"
              data-gs-ui="button"
            >
              <span>联系我们</span>
            </Link>
          </div>
        </article>
      </section>

      <section>
        <div className="gs-aux-disclaimer">
          <AlertTriangle aria-hidden="true" />
          <p>
            <strong>重要提示：</strong>
            继续浏览或使用本站数据即代表你已阅读并理解上述信息边界。若发现页面价格与官方结算页存在出入，欢迎通过纠错通道告知我们复核。
          </p>
        </div>
      </section>
    </AuxiliaryArticle>
  );
}
