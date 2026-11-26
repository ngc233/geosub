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
import { getLocaleRobotsPolicy } from "../../../lib/seo-indexing-policy";

export const metadata: Metadata = {
  title: "隱私權政策",
  description:
    "說明 GeoSub 如何處理無識別碼頁面彙總、經同意的分析事件與使用者主動提交的聯絡工單，以及如何隨時管理分析設定。",
  robots: getLocaleRobotsPolicy("zh-tw"),
};

const principles = [
  {
    title: "免帳號即可公開瀏覽",
    desc: "比較地區價格不需要提供姓名、身分證件、付款資料或商店帳號密碼。",
    icon: EyeOff,
  },
  {
    title: "分析統計由你決定",
    desc: "帶有識別碼的行為分析僅在你主動同意後執行，並可隨時撤回或重設。",
    icon: Cookie,
  },
  {
    title: "聯絡工單保持私密",
    desc: "主動提交的工單僅用於核實與回覆你的請求，絕不公開展示或用於廣告輪廓分析。",
    icon: LockKeyhole,
  },
] as const;

const dataScopes = [
  {
    title: "無識別碼每日彙總",
    desc: "不讀寫 Cookie、也不建立訪客識別碼，僅計算 UTC 每日標準化頁面瀏覽總量。",
    icon: BarChart3,
  },
  {
    title: "第一方互動診斷",
    desc: "匿名互動與穩定度診斷事件僅在取得必要同意後記錄。",
    icon: Database,
  },
  {
    title: "第三方測量工具",
    desc: "Google Analytics 或 Google Tag Manager 嚴格限定於你選擇接受後才會載入。",
    icon: Cookie,
  },
  {
    title: "主動提交工單",
    desc: "表單中填寫的聯絡資訊僅用於處理價格勘誤、合作詢問或隱私資料請求。",
    icon: Mail,
  },
] as const;

export default function TraditionalChinesePrivacyPage() {
  return (
    <AuxiliaryArticle
      locale="zh-tw"
      summaryTitle="核心承諾"
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            隱私與資料最小化 · 更新於 2026 年 8 月 22 日
          </span>
          <h1>資料應該協助你比較價格，而不是跨網站追蹤你。</h1>
          <p>
            本政策以清楚直白的文字說明 GeoSub 記錄哪些資訊、使用目的、保存期間，以及你如何隨時調整分析偏好或提出資料請求。
          </p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">核心承諾</p>
          <p>
            GeoSub 絕不出售可識別個人身分的資訊，也不允許商業合作影響地區價格排名與核驗規則。
          </p>
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">基礎原則</p>
          <h2>預設保護隱私的三項準則</h2>
          <p>所有公開價格比較皆可在免登入、無強制追蹤的前提下直接查閱。</p>
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
          <p className="gs-aux-kicker">資料類別</p>
          <h2>不同用途的訊號嚴格區隔</h2>
          <p>無識別碼頁面計數、經同意的行為分析與客服工單各自獨立運作，互不混用。</p>
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
        <PrivacyDisclosure locale="zh-tw" articleLayout />
      </section>

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div>
              <p className="gs-aux-kicker">你的選擇</p>
              <h2 className="!m-0">隨時管理統計偏好或提出隱私請求</h2>
            </div>
            <span className="gs-aux-icon-chip">
              <ShieldCheck size={18} aria-hidden="true" />
            </span>
          </div>
          <p>
            你可以點擊下方按鈕重新開啟分析與 Cookie 設定視窗；拒絕後，GeoSub 會立即停止非必要分析並清除分析工作階段。如需查詢或刪除相關紀錄，歡迎透過聯絡頁面提出。
          </p>
          <div className="gs-aux-actions">
            <AnalyticsConsentButton locale="zh-tw" variant="primary" />
            <Link
              href="/zh-tw/contact"
              className="gs-aux-secondary-btn"
              data-gs-ui="button"
            >
              <span>提交隱私或資料請求</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </article>
      </section>
    </AuxiliaryArticle>
  );
}
