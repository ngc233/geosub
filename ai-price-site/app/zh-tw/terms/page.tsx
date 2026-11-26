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
import { getLocaleRobotsPolicy } from "../../../lib/seo-indexing-policy";

export const metadata: Metadata = {
  title: "服務條款",
  description:
    "閱讀使用 GeoSub 的服務條款，了解訂閱價格比較範圍、資訊限制、外部連結說明與官方結帳頁優先原則。",
  robots: getLocaleRobotsPolicy("zh-tw"),
};

const termsSections = [
  {
    number: "01",
    kicker: "服務性質",
    title: "獨立公開比價參考，非品牌隸屬或購買建議",
    icon: Scale,
    body: "GeoSub 提供公開價格參考、跨地區比較與訂閱相關資訊，不構成法律、財務或購買建議。GeoSub 為獨立比較服務，與頁面所列品牌或應用程式商店並無隸屬、贊助或背書關係。",
    points: [
      "頁面顯示的價格、匯率換算與價差百分比僅供橫向資訊參考",
      "任何商業或內容合作皆會明確標示，絕不影響價格排序與核驗標準",
    ],
  },
  {
    number: "02",
    kicker: "結帳與規則優先",
    title: "實際計費與購買資格以官方結帳頁與平台規範為準",
    icon: Landmark,
    body: "使用 GeoSub 即代表你了解站內資料屬於公開價格參考。跨區訂閱、帳號地區、付款方式、稅費與平台風險控管皆可能影響可用性，最終請以官方結帳頁與各服務條款為準。",
    points: [
      "匯率波動、當地稅制調整或商店即時調價都可能使最終扣款與參考值不同",
      "GeoSub 不販售共用帳號、代儲值或規避平台條款的工具，請遵守官方訂閱規範",
    ],
  },
  {
    number: "03",
    kicker: "合理使用",
    title: "合理引用與維護服務穩定",
    icon: ShieldCheck,
    body: "歡迎個人讀者、媒體與研究者在標註「資料來源：GeoSub」及檢查日期的前提下，合理引用公開比較數據。",
    points: [
      "禁止以高頻率自動化程式惡意抓取、發動阻斷服務測試或干擾網站正常運作",
      "引用地區價格時請一併保留原始幣別、計費週期與檢查日期以維持準確性",
    ],
  },
] as const;

export default function TraditionalChineseTermsPage() {
  return (
    <AuxiliaryArticle
      locale="zh-tw"
      summaryTitle="核心聲明"
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            使用規範與資訊邊界
          </span>
          <h1>服務條款</h1>
          <p>
            本頁說明使用 GeoSub 查詢訂閱價格比較與指南內容時適用的服務範圍、資訊邊界、合理使用規則與免責聲明。
          </p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">核心聲明</p>
          <p>
            站內所有地區價格比較、幣別換算與稅費說明皆為參考資訊；實際扣款金額、購買資格與退款條件一律以官方商店結帳頁與平台條款為準。
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
                <p className="gs-aux-kicker">外部連結與條款更新</p>
                <h2 className="!m-0">第三方平台連結與聯絡管道</h2>
              </div>
            </div>
            <span className="gs-aux-icon-chip">
              <ExternalLink size={18} aria-hidden="true" />
            </span>
          </div>
          <p>
            GeoSub 提供指向官方產品網站與應用程式商店的參考連結以便核對；外部服務依其自身條款與隱私政策運作。本條款如有修訂，將於本頁發布後生效。
          </p>
          <div className="gs-aux-actions">
            <Link
              href="/zh-tw/data-sources"
              className="gs-aux-primary-btn"
              data-gs-ui="button"
            >
              <FileText size={15} aria-hidden="true" />
              <span>查看資料來源與研究方法</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link
              href="/zh-tw/privacy"
              className="gs-aux-secondary-btn"
              data-gs-ui="button"
            >
              <span>閱讀隱私權政策</span>
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

      <section>
        <div className="gs-aux-disclaimer">
          <AlertTriangle aria-hidden="true" />
          <p>
            <strong>重要提示：</strong> 使用 GeoSub 即表示你了解上述資訊邊界。訂閱前請務必在官方結帳畫面再次確認最終價格、稅額與帳號適用資格。
          </p>
        </div>
      </section>
    </AuxiliaryArticle>
  );
}
