import AuxiliaryArticle from "../../../components/AuxiliaryArticle";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CheckCircle2,
  FileSearch,
  Lightbulb,
  Mail,
  Megaphone,
  ShieldCheck,
} from "lucide-react";
import ContactTicketForm from "./ContactTicketForm";

export const metadata: Metadata = {
  title: "联系我们与合作",
  description: "联系 GeoSub 提交价格纠错、产品建议、隐私请求，或咨询数据、内容、品牌与广告合作。",
};

const contactEmail = "yoshirinra@gmail.com";

const contactItems = [
  {
    title: "价格与数据纠错",
    desc: "发现价格、税费、币种、地区或订阅条件有误？请附上产品、地区、页面链接和可信来源。",
    action: "填写纠错工单",
    icon: FileSearch,
  },
  {
    title: "产品与功能建议",
    desc: "告诉我们你希望新增的订阅产品、对比维度、工具或使用场景，我们会纳入需求评估。",
    action: "提出产品建议",
    icon: Lightbulb,
  },
  {
    title: "数据与内容合作",
    desc: "适合研究机构、媒体、开发者和数据服务商，可讨论数据引用、联合研究及内容合作。",
    action: "咨询数据合作",
    icon: BarChart3,
  },
  {
    title: "广告与品牌合作",
    desc: "面向与数字订阅、支付、出海和效率工具相关的品牌，提供清晰标注、独立审核的合作机会。",
    action: "咨询品牌合作",
    icon: Megaphone,
  },
] as const;

const advertisingOptions = [
  {
    number: "01",
    title: "品牌展示",
    desc: "在相关内容或工具页面展示明确标注的品牌信息，绝不伪装成编辑推荐。",
  },
  {
    number: "02",
    title: "赞助内容",
    desc: "围绕订阅趋势、跨区定价或支付场景策划内容，并清楚披露合作关系。",
  },
  {
    number: "03",
    title: "联合数据项目",
    desc: "基于可验证的方法制作行业观察、数据报告或专题页面，结论保持独立。",
  },
] as const;

function mailto(subject: string) {
  return `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}`;
}

export default function ContactPage() {
  return (
    <AuxiliaryArticle
      contact
      locale="zh"
      summaryTitle="联系邮箱"
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            纠错反馈与合作通道
          </span>
          <h1>让价格信息更准确，让合作更透明。</h1>
          <p>
            无论你要纠正一条价格、推荐新增产品，还是讨论数据、内容与品牌合作，都可以通过下方工单或直连邮箱与我们取得联系。
          </p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">直连联系邮箱</p>
          <p>
            <a href={mailto("联系 GeoSub")} className="gs-aux-link">
              <Mail size={16} aria-hidden="true" />
              <span>{contactEmail}</span>
            </a>
          </p>
          <ul className="gs-aux-checklist !mt-3">
            <li>
              <CheckCircle2 aria-hidden="true" />
              <span>请在邮件或工单主题中注明事项类型，便于快速分流处理。</span>
            </li>
            <li>
              <CheckCircle2 aria-hidden="true" />
              <span>数据纠错请尽量附上页面链接、对应地区与官方结算截图或来源。</span>
            </li>
          </ul>
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">选择联系类型</p>
          <h2>告诉我们，你想解决什么问题</h2>
          <p>信息越具体，我们越容易复核并跟进处理。</p>
        </div>
        <div className="gs-aux-grid-2">
          {contactItems.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="gs-aux-block flex flex-col">
                <div className="gs-aux-card-top">
                  <div className="gs-aux-card-title-group">
                    <span className="gs-aux-icon-chip">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <h3>{item.title}</h3>
                  </div>
                </div>
                <p>{item.desc}</p>
                <a href="#contact-form" className="gs-aux-link mt-auto pt-2">
                  <span>{item.action}</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </a>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">私密联系工单</p>
          <h2>直接在站内提交，我们负责跟进</h2>
          <p>工单不会公开展示。提交后会生成回执编号，并进入私密审核处理队列。</p>
        </div>
        <ContactTicketForm canvas />
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">合作边界</p>
          <h2>GeoSub 可以接商业合作吗？</h2>
          <p>
            可以，但只接受与读者需求相关、合作关系清晰、不会干预价格数据和编辑结论的项目。
          </p>
        </div>
        <div className="gs-aux-stack">
          {advertisingOptions.map((option) => (
            <article key={option.number} className="gs-aux-block">
              <div className="gs-aux-card-top">
                <div className="gs-aux-card-title-group">
                  <span data-gs-ui="tag" className="gs-aux-step-num" aria-hidden="true">
                    {option.number}
                  </span>
                  <h3>{option.title}</h3>
                </div>
                <span className="gs-aux-icon-chip">
                  <Building2 size={18} aria-hidden="true" />
                </span>
              </div>
              <p>{option.desc}</p>
            </article>
          ))}

          <article className="gs-aux-block">
            <div className="gs-aux-card-top">
              <div>
                <p className="gs-aux-kicker">商业合作原则</p>
                <h2 className="!m-0">合作可以发生，数据立场不能出售</h2>
              </div>
              <span className="gs-aux-icon-chip">
                <ShieldCheck size={18} aria-hidden="true" />
              </span>
            </div>
            <ul className="gs-aux-checklist">
              <li>
                <BadgeCheck aria-hidden="true" />
                <span>广告与赞助内容明确标注</span>
              </li>
              <li>
                <BadgeCheck aria-hidden="true" />
                <span>付费不改变价格排名</span>
              </li>
              <li>
                <BadgeCheck aria-hidden="true" />
                <span>不出售个人浏览数据</span>
              </li>
              <li>
                <BadgeCheck aria-hidden="true" />
                <span>保留事实核验与编辑独立性</span>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div>
              <p className="gs-aux-kicker">隐私相关请求</p>
              <h2 className="!m-0">查询、更正或删除浏览器标识相关记录</h2>
            </div>
            <span className="gs-aux-icon-chip">
              <Mail size={18} aria-hidden="true" />
            </span>
          </div>
          <p>如需查询、更正或删除与浏览器标识符相关的数据，请在上方工单或邮件主题中注明“隐私请求”。</p>
          <div className="gs-aux-actions">
            <a href="#contact-form" className="gs-aux-primary-btn" data-gs-ui="button">
              <span>前往工单填写</span>
              <ArrowRight size={15} aria-hidden="true" />
            </a>
            <Link href="/zh/privacy" className="gs-aux-secondary-btn" data-gs-ui="button">
              <span>阅读隐私政策</span>
            </Link>
          </div>
        </article>
      </section>
    </AuxiliaryArticle>
  );
}
