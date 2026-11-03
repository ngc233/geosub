import { PublicCard } from "../../../components/ui/PublicControls";
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
  { title: "价格与数据纠错", desc: "发现价格、税费、币种、地区或订阅条件有误？请附上产品、地区、页面链接和可信来源。", action: "提交纠错", subject: "GeoSub 数据纠错", icon: FileSearch },
  { title: "产品与功能建议", desc: "告诉我们你希望新增的订阅产品、对比维度、工具或使用场景，我们会纳入需求评估。", action: "提出建议", subject: "GeoSub 产品建议", icon: Lightbulb },
  { title: "数据与内容合作", desc: "适合研究机构、媒体、开发者和数据服务商。可讨论数据引用、联合研究及内容合作。", action: "发起合作", subject: "GeoSub 数据或内容合作", icon: BarChart3 },
  { title: "广告与品牌合作", desc: "面向与数字订阅、支付、出海和效率工具相关的品牌，提供清晰标注、独立审核的合作机会。", action: "咨询广告合作", subject: "GeoSub 广告与品牌合作", icon: Megaphone },
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
    <main className="gs-aux-page" data-gs-aux="contact">
      <PublicCard className="gs-aux-hero">
        <div className="gs-aux-container gs-aux-grid gs-aux-grid-two">
          <div>
            <div className="gs-aux-eyebrow">
              <MessageSquareText className="gs-aux-glyph" aria-hidden="true" /> CONTACT · PARTNERSHIP
            </div>
            <h1 className="gs-aux-emphasis">
              让价格信息更准确，<span className="gs-aux-plain">让合作更透明。</span>
            </h1>
            <p className="gs-aux-lead">
              无论你要纠正一条价格、推荐一个产品，还是讨论数据、内容与品牌合作，都可以从这里找到最直接的沟通方式。
            </p>
          </div>
          <div className="gs-aux-panel">
            <p className="gs-aux-caption">联系邮箱</p>
            <a href={mailto("联系 GeoSub")} className="gs-aux-link">
              <span className="gs-aux-block">{contactEmail}</span><Mail className="gs-aux-glyph" aria-hidden="true" />
            </a>
            <div className="gs-aux-small">
              <p className="gs-aux-inline"><CheckCircle2 className="gs-aux-glyph" aria-hidden="true" />请在主题中注明事项类型，便于快速分流。</p>
              <p className="gs-aux-inline"><CheckCircle2 className="gs-aux-glyph" aria-hidden="true" />数据纠错请尽量附页面链接、地区和来源。</p>
            </div>
          </div>
        </div>
      </PublicCard>

      <section className="gs-aux-section">
        <div className="gs-aux-container">
          <div className="gs-aux-copy">
            <p className="gs-aux-caption">选择联系类型</p>
            <h2 className="gs-aux-emphasis">告诉我们，你想解决什么问题</h2>
            <p className="gs-aux-block">点击对应入口会自动填写邮件主题。信息越具体，我们越容易核实并推进。</p>
          </div>
          <div className="gs-aux-grid gs-aux-grid-two">
            {contactItems.map((item) => {
              const Icon = item.icon;
              return (
                <PublicCard key={item.title} className="gs-aux-card">
                  <div className="gs-aux-icon"><Icon className="gs-aux-glyph" aria-hidden="true" /></div>
                  <h3 className="gs-aux-lead">{item.title}</h3>
                  <p className="gs-aux-small">{item.desc}</p>
                  <a href="#contact-form" className="gs-aux-link">
                    {item.action}<ArrowRight className="gs-aux-glyph" aria-hidden="true" />
                  </a>
                </PublicCard>
              );
            })}
          </div>
        </div>
      </section>

      <section className="gs-aux-section">
        <div className="gs-aux-container gs-aux-narrow">
          <div className="gs-aux-block">
            <p className="gs-aux-caption">私密联系工单</p>
            <h2 className="gs-aux-emphasis">直接在站内提交，我们负责跟进</h2>
            <p className="gs-aux-small">工单不会公开展示。提交后会生成编号，并进入 GeoSub 后台处理队列。</p>
          </div>
          <ContactTicketForm />
        </div>
      </section>

      <section className="gs-aux-section">
        <div className="gs-aux-container gs-aux-grid gs-aux-grid-two">
          <div>
            <div className="gs-aux-icon"><Building2 className="gs-aux-glyph" aria-hidden="true" /></div>
            <p className="gs-aux-caption">ADVERTISING &amp; BRAND</p>
            <h2 className="gs-aux-emphasis">GeoSub 可以接广告吗？</h2>
            <p className="gs-aux-block">
              可以，但只接受与读者需求相关、合作关系清晰、不会干预价格数据和编辑结论的项目。我们更看重长期信任，而不是把每个位置都变成广告位。
            </p>
            <a href="#contact-form" className="gs-aux-link">
              获取合作方案<ArrowRight className="gs-aux-glyph" aria-hidden="true" />
            </a>
          </div>
          <div className="gs-aux-grid gs-aux-grid-three">
            {advertisingOptions.map((option, index) => (
              <div key={option.title} className="gs-aux-block">
                <span className="gs-aux-caption">0{index + 1}</span>
                <h3 className="gs-aux-lead">{option.title}</h3>
                <p className="gs-aux-small">{option.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="gs-aux-section">
        <div className="gs-aux-container gs-aux-grid gs-aux-grid-two">
          <div>
            <div className="gs-aux-inline"><ShieldCheck className="gs-aux-glyph" aria-hidden="true" />商业合作原则</div>
            <h2 className="gs-aux-emphasis">合作可以发生，数据立场不能出售</h2>
          </div>
          <ul className="gs-aux-grid gs-aux-grid-two">
            <li className="gs-aux-inline"><BadgeCheck className="gs-aux-glyph" aria-hidden="true" />广告与赞助内容明确标注</li>
            <li className="gs-aux-inline"><BadgeCheck className="gs-aux-glyph" aria-hidden="true" />付费不改变价格排名</li>
            <li className="gs-aux-inline"><BadgeCheck className="gs-aux-glyph" aria-hidden="true" />不出售个人浏览数据</li>
            <li className="gs-aux-inline"><BadgeCheck className="gs-aux-glyph" aria-hidden="true" />保留事实核验与编辑独立性</li>
          </ul>
        </div>
      </section>

      <section className="gs-aux-section">
        <div className="gs-aux-container">
          <div>
            <p className="gs-aux-small gs-aux-emphasis">隐私相关请求</p>
            <p className="gs-aux-small">如需查询、更正或删除与浏览器标识符相关的数据，请在邮件主题中注明“隐私请求”。</p>
          </div>
          <div className="gs-aux-inline">
            <a href="#contact-form" className="gs-aux-link"><Mail className="gs-aux-glyph" aria-hidden="true" />联系处理</a>
            <Link href="/zh/privacy" className="gs-aux-link">阅读隐私政策<ArrowRight className="gs-aux-glyph" aria-hidden="true" /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
