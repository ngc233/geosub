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
  title: "データソースと価格比較の方法",
  description:
    "GeoSub が検証済みの App Store 地域別サブスクリプション価格を比較し、為替基準日・税情報・信頼度を表示する仕組みを説明します。",
  robots: getLocaleRobotsPolicy("ja"),
};

const sourceLayers = [
  {
    number: "01",
    title: "価格データ",
    badge: "App Store",
    icon: Database,
    items: [
      "対象国・地域の公開 App Store サブスクリプション価格",
      "対象製品の公式 Web 通常価格（App Store 価格とは区別して表示）",
      "サービス・プラン・国・現地通貨を構造化して保持",
      "整合性確認を通過した記録のみを公開ランキングに反映",
    ],
  },
  {
    number: "02",
    title: "通貨換算と比較",
    badge: "定期同期",
    icon: CircleDollarSign,
    items: [
      "選択された表示通貨への地域別価格の換算",
      "各地域の税制メモとデータ検証ステータス",
      "米国基準価格との比較、価格差、契約時の注意事項",
    ],
  },
  {
    number: "03",
    title: "データの読み方",
    badge: "決済画面優先",
    icon: Scale,
    items: [
      "現地表示価格と換算価格を分けて併記",
      "価格確認日・為替基準日・プラン検証日を個別に表示",
      "アカウント地域、支払い方法、税金によって最終請求額が変動",
    ],
  },
] as const;

const qualityRules = [
  "各プランについて元の通貨、請求周期、地域、米ドル換算値の一貫性を検査します。",
  "通常の価格帯から大きく外れた値や、通貨・小数点・請求周期の不一致が疑われる記録は公開を保留し再確認します。",
  "地域ランキングには検査を通過し同一プランとして比較できる価格のみを使用します。",
  "税情報は参考表示であり、ランキング価格に税率を二重加算することはありません。最終金額は公式決済画面が優先されます。",
] as const;

export default function JapaneseDataSourcesPage() {
  return (
    <AuxiliaryArticle
      locale="ja"
      summaryTitle="データ方針"
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            データの透明性と検証基準
          </span>
          <h1>データソースと価格比較の方法</h1>
          <p>
            GeoSub は同一プラン・同一請求周期の公開 App Store 地域別価格を比較し、現地通貨、確認日、為替基準日をそのまま保持して表示します。
          </p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">データ方針</p>
          <p>
            古い為替レートや請求周期の不一致、未確認の金額で空白を埋めるくらいなら、該当行を一時的に非表示にする方針を採っています。
          </p>
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">データ構造</p>
          <h2>参照元・換算値・決済条件を明確に分離</h2>
          <p>
            換算後の金額だけでなく、その比較が成り立つための元のストア表示価格と前提条件をあわせて提示します。
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
          <p className="gs-aux-kicker">数値の読み方</p>
          <h2>為替レートと税情報の扱い</h2>
          <p>
            参考為替レートは通常 12 時間ごとに同期され、選択した表示通貨への換算に使用されます。画面には適用中の基準日を表示し、レートが欠損または期限切れの場合は換算を停止します。
          </p>
        </div>
        <div className="gs-aux-grid-2">
          <article className="gs-aux-block">
            <div className="gs-aux-card-top">
              <div className="gs-aux-card-title-group">
                <span className="gs-aux-icon-chip">
                  <CalendarClock size={18} aria-hidden="true" />
                </span>
                <h3>意味ごとに分かれた日付表示</h3>
              </div>
            </div>
            <p>
              価格確認日、プラン検証日、為替基準日はそれぞれ異なる意味を持つため、曖昧な単一の更新日時にまとめることはありません。
            </p>
          </article>
          <article className="gs-aux-block">
            <div className="gs-aux-card-top">
              <div className="gs-aux-card-title-group">
                <span className="gs-aux-icon-chip">
                  <Landmark size={18} aria-hidden="true" />
                </span>
                <h3>税率の二重加算を行わない</h3>
              </div>
            </div>
            <p>
              App Store の表示価格には現地の価格ルールが反映されていることが多いため、ランキング価格の上にさらに税率を加算することはしません。最終的な税額は公式決済画面が基準となります。
            </p>
          </article>
        </div>
      </section>

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div>
              <p className="gs-aux-kicker">品質管理</p>
              <h2 className="!m-0">異常値は公開前に隔離して再検証</h2>
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
              <p className="gs-aux-kicker">履歴確認・訂正連絡</p>
              <h2 className="!m-0">価格改定履歴の確認とデータ訂正</h2>
            </div>
            <span className="gs-aux-icon-chip">
              <FileSearch size={18} aria-hidden="true" />
            </span>
          </div>
          <p>
            公開済みの地域価格改定は変更前後の現地通貨額と確認日時つきで記録されています。表示内容に相違がある場合はお問い合わせページからお知らせください。
          </p>
          <div className="gs-aux-actions">
            <Link
              href="/ja/price-history"
              className="gs-aux-primary-btn"
              data-gs-ui="button"
            >
              <span>価格改定履歴を見る</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link
              href="/ja/contact"
              className="gs-aux-secondary-btn"
              data-gs-ui="button"
            >
              <span>データの訂正を連絡</span>
            </Link>
          </div>
        </article>
      </section>

      <section>
        <div className="gs-aux-disclaimer">
          <AlertTriangle aria-hidden="true" />
          <p>
            <strong>ご注意：</strong> GeoSub は比較のために公開価格差を表示するものであり、プラットフォーム規約の回避を推奨するものではありません。地域をまたぐ契約はアカウント地域、支払い方法、請求先情報、税金、リスク管理の影響を受ける場合があります。
          </p>
        </div>
      </section>
    </AuxiliaryArticle>
  );
}
