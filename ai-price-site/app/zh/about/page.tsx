import AuxiliaryArticle from "../../../components/AuxiliaryArticle";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Database,
  Globe2,
  Scale,
  SearchCheck,
  ShieldCheck,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "关于 GeoSub",
  description:
    "了解 GeoSub 如何整理和核验全球数字订阅价格，解释汇率、税费、更新时间、购买力与订阅条件，并坚持数据和商业合作相互独立。",
};

const valueCards = [
  {
    title: "跨地区可比",
    desc: "保留本地币种，并以一致的汇率基准帮助用户理解不同市场的实际价差。",
    icon: Globe2,
  },
  {
    title: "证据可追溯",
    desc: "公开价格附带来源、检查日期和适用条件，不把未经复核的数字包装成结论。",
    icon: SearchCheck,
  },
  {
    title: "条件说清楚",
    desc: "价格之外，同时提示税费、账号地区、支付方式和套餐可用性等关键边界。",
    icon: ShieldCheck,
  },
] as const;

const workflow = [
  {
    title: "收集公开价格",
    desc: "整理不同地区的 App Store 订阅价格和产品套餐信息。",
    icon: Database,
  },
  {
    title: "完成一致性检查",
    desc: "核对币种、套餐、地区、来源和时间，隔离异常或冲突记录。",
    icon: BookOpenCheck,
  },
  {
    title: "形成可解释比较",
    desc: "展示本地价格、美元参考、购买力和订阅条件，不隐去重要限制。",
    icon: Scale,
  },
] as const;

export default function AboutPage() {
  return (
    <AuxiliaryArticle
      locale="zh"
      summaryTitle="判断标准"
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            关于 GeoSub · 独立价格情报
          </span>
          <h1>把全球订阅价格，变成可以理解的选择。</h1>
          <p>
            GeoSub 是独立的数字订阅价格情报平台。我们整理不同国家和地区的公开价格，并解释数字背后的汇率、税费、更新时间、购买力和订阅条件。
          </p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">我们的判断标准</p>
          <p>一个价格只有在来源、时间、币种和适用条件都能解释时，才值得被比较。</p>
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">我们解决什么问题</p>
          <h2>价格散落在不同市场，比较不该靠猜</h2>
          <p>
            同一个订阅服务，在不同国家可能使用不同币种、税费规则、套餐名称和支付条件。GeoSub 把分散信息整理为一致的数据结构，让用户看见差异，也看见差异成立的前提。
          </p>
        </div>
        <div className="gs-aux-stack">
          {valueCards.map((item) => {
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
          <p className="gs-aux-kicker">核验方法</p>
          <h2>从公开数字到可信比较</h2>
          <p>
            每个价格都会保留本地币种、采集日期和汇率基准。页面只使用通过一致性检查的地区价格，并提醒用户核对官方结算条件。
          </p>
        </div>
        <div className="gs-aux-stack">
          {workflow.map((item, index) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="gs-aux-block">
                <div className="gs-aux-card-top">
                  <div className="gs-aux-card-title-group">
                    <span data-gs-ui="tag" className="gs-aux-step-num" aria-hidden="true">
                      0{index + 1}
                    </span>
                    <h3>{item.title}</h3>
                  </div>
                  <span className="gs-aux-icon-chip">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                </div>
                <p>{item.desc}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="gs-aux-grid-2">
          <article className="gs-aux-block">
            <div className="gs-aux-card-top">
              <div className="gs-aux-card-title-group">
                <span className="gs-aux-icon-chip">
                  <BadgeDollarSign size={18} aria-hidden="true" />
                </span>
                <h2 className="!m-0">商业合作不改结论</h2>
              </div>
            </div>
            <p>
              广告、品牌或联合数据合作均会明确标注。付费绝不改变价格排名、数据审核结果或编辑判断。
            </p>
          </article>

          <article className="gs-aux-block">
            <div className="gs-aux-card-top">
              <div className="gs-aux-card-title-group">
                <span className="gs-aux-icon-chip">
                  <Users size={18} aria-hidden="true" />
                </span>
                <h2 className="!m-0">为真实决策者服务</h2>
              </div>
            </div>
            <ul className="gs-aux-checklist">
              <li>
                <CheckCircle2 aria-hidden="true" />
                <span>比较不同市场订阅成本的个人用户</span>
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" />
                <span>研究数字产品定价的媒体与分析者</span>
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" />
                <span>关注出海、支付和区域策略的团队</span>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div>
              <p className="gs-aux-kicker">持续维护</p>
              <h2 className="!m-0">价格会变化，解释也需要持续更新</h2>
            </div>
            <span className="gs-aux-icon-chip">
              <Clock3 size={18} aria-hidden="true" />
            </span>
          </div>
          <p>发现数据错误、过期价格或希望补充的新订阅产品，欢迎提交私密联系工单或查阅完整数据源标准。</p>
          <div className="gs-aux-actions">
            <Link
              href="/zh/contact#contact-form"
              className="gs-aux-primary-btn"
              data-gs-ui="button"
            >
              <span>提交反馈或合作</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link
              href="/zh/data-sources"
              className="gs-aux-secondary-btn"
              data-gs-ui="button"
            >
              <span>查看数据来源与口径</span>
            </Link>
          </div>
        </article>
      </section>
    </AuxiliaryArticle>
  );
}
