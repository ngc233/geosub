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
import { getLocaleRobotsPolicy } from "../../../lib/seo-indexing-policy";

export const metadata: Metadata = {
  title: "關於 GeoSub",
  description:
    "了解 GeoSub 如何整理並核驗全球 AI 與串流媒體訂閱價格，說明匯率基準、稅費規則、更新時間與購買條件。",
  robots: getLocaleRobotsPolicy("zh-tw"),
};

const valueCards = [
  {
    title: "跨地區可比較",
    desc: "保留各市場原始當地幣別，並套用一致的匯率基準，透明呈現跨國訂閱價差。",
    icon: Globe2,
  },
  {
    title: "證據可追溯",
    desc: "公開價格附帶來源平台、檢查日期與適用條件，絕不把未經核驗的推測包裝成事實。",
    icon: SearchCheck,
  },
  {
    title: "清楚標示購買邊界",
    desc: "除了價格之外，同步提示當地稅費、帳號地區限制、付款方式與方案開放範圍。",
    icon: ShieldCheck,
  },
] as const;

const workflow = [
  {
    title: "整理公開商店定價",
    desc: "追蹤各國與地區的官方 App Store 訂閱價格及已支援產品的官網公開定價。",
    icon: Database,
  },
  {
    title: "執行一致性核驗",
    desc: "核對幣別代碼、計費週期、地區範圍與時間標記，隔離異常或彼此衝突的紀錄。",
    icon: BookOpenCheck,
  },
  {
    title: "發布可解釋的橫向比較",
    desc: "並排呈現當地標價、美元參考基準、工時負擔與結帳注意事項，不隱藏關鍵前提。",
    icon: Scale,
  },
] as const;

export default function TraditionalChineseAboutPage() {
  return (
    <AuxiliaryArticle
      locale="zh-tw"
      summaryTitle="編輯準則"
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            關於 GeoSub · 獨立價格情報
          </span>
          <h1>把全球訂閱價格，整理成清楚可查證的比較脈絡。</h1>
          <p>
            GeoSub 是獨立的數位訂閱價格比較平台，整理各國與地區的公開 AI 與串流媒體價格，並說明數字背後的匯率、稅費、更新日期、收入負擔與訂閱條件。
          </p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">編輯準則</p>
          <p>
            一筆地區價格唯有在來源、檢查日期、幣別與結帳條件都能清楚解釋時，才具備橫向比較的價值。
          </p>
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">我們解決的問題</p>
          <h2>價格分散在不同市場，比較不該靠猜測</h2>
          <p>
            我們整理各國與各幣別的 App Store 訂閱價格，協助讀者用一致標準看懂地區價差、方案變動與訂閱條件。
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
          <p className="gs-aux-kicker">核驗流程</p>
          <h2>從公開標價到可信賴的比較</h2>
          <p>
            每筆價格皆保留當地幣別、檢查日期與匯率基準日。頁面僅採用通過一致性檢查的地區紀錄，並提醒讀者在訂閱前確認帳號地區、付款方式、稅費與官方結帳金額。
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
                <h2 className="!m-0">堅持資料獨立</h2>
              </div>
            </div>
            <p>
              任何贊助或商業合作皆會明確標示，付費合作絕不會改變地區價格排名、核驗門檻或編輯結論。
            </p>
          </article>

          <article className="gs-aux-block">
            <div className="gs-aux-card-top">
              <div className="gs-aux-card-title-group">
                <span className="gs-aux-icon-chip">
                  <Users size={18} aria-hidden="true" />
                </span>
                <h2 className="!m-0">服務對象</h2>
              </div>
            </div>
            <ul className="gs-aux-checklist">
              <li>
                <CheckCircle2 aria-hidden="true" />
                <span>比較跨市場 AI 與串流媒體訂閱成本的個人讀者</span>
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" />
                <span>研究數位產品定價策略的媒體記者與分析人員</span>
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" />
                <span>評估全球訂閱方案與區域定價的產品與營運團隊</span>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div>
              <p className="gs-aux-kicker">持續核驗與回饋</p>
              <h2 className="!m-0">價格會變動，核驗標準始終公開透明</h2>
            </div>
            <span className="gs-aux-icon-chip">
              <Clock3 size={18} aria-hidden="true" />
            </span>
          </div>
          <p>
            若發現價格變動、資料誤差或希望補充特定訂閱服務，歡迎透過聯絡頁面提交工單，或先閱讀完整資料來源說明。
          </p>
          <div className="gs-aux-actions">
            <Link
              href="/zh-tw/data-sources"
              className="gs-aux-primary-btn"
              data-gs-ui="button"
            >
              <span>資料來源與研究方法</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link
              href="/zh-tw/contact"
              className="gs-aux-secondary-btn"
              data-gs-ui="button"
            >
              <span>聯絡我們</span>
            </Link>
          </div>
        </article>
      </section>
    </AuxiliaryArticle>
  );
}
