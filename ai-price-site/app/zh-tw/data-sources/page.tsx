import AuxiliaryArticle from "../../../components/AuxiliaryArticle";
import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Database,
  FileSearch,
  Landmark,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { getLocaleRobotsPolicy } from "../../../lib/seo-indexing-policy";

export const metadata: Metadata = {
  title: "資料來源與價格比較方法",
  description:
    "了解 GeoSub 如何比較已核驗的 App Store 地區訂閱價格，並分別標示匯率基準日、稅費說明與資料可信度。",
  robots: getLocaleRobotsPolicy("zh-tw"),
};

const sourceLayers = [
  {
    number: "01",
    title: "公開價格資料",
    badge: "App Store",
    icon: Database,
    items: [
      "各支援國家與地區的 App Store 公開訂閱價格",
      "已支援產品的官方網站常規公開價格，與 App Store 分開標示",
      "結構化保存產品、方案、國家／地區與原始幣別紀錄",
      "僅將通過覆核的可比較價格納入公開排行",
    ],
  },
  {
    number: "02",
    title: "幣別換算與比較",
    badge: "定期同步",
    icon: CircleDollarSign,
    items: [
      "依讀者選擇的顯示幣別即時換算各地區價格",
      "附帶地區稅費提示與資料核驗狀態",
      "對照美國基準價、地區價差幅度與訂閱風險說明",
    ],
  },
  {
    number: "03",
    title: "閱讀與結帳邊界",
    badge: "結帳頁為準",
    icon: Scale,
    items: [
      "當地原始標價與換算金額分開呈現",
      "價格檢查日、匯率基準日與方案覆核日各自獨立標示",
      "帳號所屬地區、付款方式與稅費都會影響最終扣款",
    ],
  },
] as const;

const qualityRules = [
  "每個方案都會依原始幣別、計費週期、地區與美元折算價進行一致性核對。",
  "明顯偏離合理區間、疑似幣別誤判或計費週期不一致的紀錄會暫緩展示並重新檢查。",
  "地區排行榜僅採用通過檢查且能與同一方案直接比較的價格。",
  "稅費說明僅供參考，不會重複疊加至排行價格；實際金額以官方結帳頁為準。",
] as const;

export default function TraditionalChineseDataSourcesPage() {
  return (
    <AuxiliaryArticle
      locale="zh-tw"
      summaryTitle="來源政策"
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            資料透明度與核驗標準
          </span>
          <h1>資料來源與價格比較方法</h1>
          <p>
            GeoSub 按相同方案與計費週期比較各地區的 App Store 公開訂閱價格，同時完整保留當地幣別、檢查日期與匯率基準。
          </p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">來源政策</p>
          <p>
            我們寧可暫時保留一筆異常資料，也不會用過期匯率、錯誤週期或未經核驗的報價填補空白。
          </p>
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">資料架構</p>
          <h2>來源、換算與結帳邊界清楚區分</h2>
          <p>
            頁面上呈現的不只是換算後的金額，也包含支撐這項比較成立的商店原始標價與適用條件。
          </p>
        </div>
        <div className="gs-aux-stack">
          {sourceLayers.map((layer) => {
            const Icon = layer.icon;
            return (
              <article key={layer.title} className="gs-aux-block">
                <div className="gs-aux-card-top">
                  <div className="gs-aux-card-title-group">
                    <span data-gs-ui="tag" className="gs-aux-step-num" aria-hidden="true">
                      {layer.number}
                    </span>
                    <h3>{layer.title}</h3>
                    <span className="gs-aux-badge">{layer.badge}</span>
                  </div>
                  <span className="gs-aux-icon-chip">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                </div>
                <ul className="gs-aux-checklist">
                  {layer.items.map((item) => (
                    <li key={item}>
                      <CheckCircle2 aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">數據解讀</p>
          <h2>匯率換算與稅費處理原則</h2>
          <p>
            參考匯率用於將各地區標價換算為所選顯示幣別，通常每 12 小時同步一次。頁面會顯示適用的匯率基準日；當必要匯率缺失或過期時，系統會暫停對應換算。
          </p>
        </div>
        <div className="gs-aux-grid-2">
          <article className="gs-aux-block">
            <div className="gs-aux-card-top">
              <div className="gs-aux-card-title-group">
                <span className="gs-aux-icon-chip">
                  <CalendarClock size={18} aria-hidden="true" />
                </span>
                <h3>不同訊號各自標註時間</h3>
              </div>
            </div>
            <p>
              價格檢查日期、方案覆核日期與匯率基準日期代表不同意義，絕不會混為單一模糊的更新時間。
            </p>
          </article>
          <article className="gs-aux-block">
            <div className="gs-aux-card-top">
              <div className="gs-aux-card-title-group">
                <span className="gs-aux-icon-chip">
                  <Landmark size={18} aria-hidden="true" />
                </span>
                <h3>稅費不重複加計</h3>
              </div>
            </div>
            <p>
              GeoSub 不會在 App Store 公開標價上額外疊加稅率重排順序，因為各區商店價格往往已反映平台定價規則。最終稅額請以結帳頁為準。
            </p>
          </article>
        </div>
      </section>

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div>
              <p className="gs-aux-kicker">品質控管</p>
              <h2 className="!m-0">異常紀錄於公開前先行隔離</h2>
            </div>
            <span className="gs-aux-icon-chip">
              <ShieldCheck size={18} aria-hidden="true" />
            </span>
          </div>
          <ul className="gs-aux-checklist">
            {qualityRules.map((rule) => (
              <li key={rule}>
                <BadgeCheck aria-hidden="true" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div>
              <p className="gs-aux-kicker">稽核與勘誤</p>
              <h2 className="!m-0">檢視近期調價紀錄或提交勘誤</h2>
            </div>
            <span className="gs-aux-icon-chip">
              <FileSearch size={18} aria-hidden="true" />
            </span>
          </div>
          <p>
            每筆已核驗的地區價格異動皆保留調整前後的當地幣金額與檢查時間。若發現標價出入，歡迎透過聯絡頁面告知我們覆核。
          </p>
          <div className="gs-aux-actions">
            <Link
              href="/zh-tw/price-history"
              className="gs-aux-primary-btn"
              data-gs-ui="button"
            >
              <span>查看價格變動歷史</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link
              href="/zh-tw/contact"
              className="gs-aux-secondary-btn"
              data-gs-ui="button"
            >
              <span>提交資料勘誤</span>
            </Link>
          </div>
        </article>
      </section>

      <section>
        <div className="gs-aux-disclaimer">
          <AlertTriangle aria-hidden="true" />
          <p>
            <strong>重要提醒：</strong> GeoSub 整理公開價格差異以供成本比較，並不鼓勵規避平台規範。跨地區訂閱可能受帳號地區、付款方式、帳單資訊、稅費與平台風險控管影響。
          </p>
        </div>
      </section>
    </AuxiliaryArticle>
  );
}
