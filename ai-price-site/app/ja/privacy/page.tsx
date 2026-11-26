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
  title: "プライバシーポリシー",
  description:
    "GeoSub における識別子を使わないページ集計、同意に基づくアクセス解析、お問い合わせチケットの取り扱いと設定変更方法を説明します。",
  robots: getLocaleRobotsPolicy("ja"),
};

const principles = [
  {
    title: "アカウント登録なしで閲覧可能",
    desc: "地域別価格の比較に氏名、本人確認書類、決済情報、ストアの認証情報は一切不要です。",
    icon: EyeOff,
  },
  {
    title: "分析は同意した場合のみ",
    desc: "識別子を伴うアクセス解析は同意後にのみ動作し、いつでも設定を取り消すことができます。",
    icon: Cookie,
  },
  {
    title: "お問い合わせ内容の非公開保護",
    desc: "送信されたお問い合わせは確認と返信のみに利用し、外部公開や広告プロファイリングには使用しません。",
    icon: LockKeyhole,
  },
] as const;

const dataScopes = [
  {
    title: "識別子なしの日次ページ集計",
    desc: "Cookie の読み書きや訪問者 ID の生成を行わず、UTC 日次の閲覧総数のみを集計します。",
    icon: BarChart3,
  },
  {
    title: "自社による診断・操作計測",
    desc: "匿名の操作イベントや障害診断情報は、必要な同意を得た後にのみ記録されます。",
    icon: Database,
  },
  {
    title: "外部計測ツール",
    desc: "Google Analytics または Google Tag Manager は、利用者が許可を選択した場合に限り実行されます。",
    icon: Cookie,
  },
  {
    title: "任意送信のお問い合わせ",
    desc: "フォームに入力された連絡先は、価格訂正の確認やプライバシー関連請求への対応にのみ使用します。",
    icon: Mail,
  },
] as const;

export default function JapanesePrivacyPage() {
  return (
    <AuxiliaryArticle
      locale="ja"
      summaryTitle="基本姿勢"
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            プライバシーとデータ最小化 · 2026年8月22日更新
          </span>
          <h1>データは価格比較を助けるためのものであり、追跡のためのものではありません。</h1>
          <p>
            本ポリシーでは、GeoSub が何を記録し、なぜ利用し、どのくらいの期間保持するのか、そして分析設定をいつでも変更する方法を分かりやすく説明します。
          </p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">基本姿勢</p>
          <p>
            GeoSub は個人を特定できる情報を販売せず、商業上の提携によって地域別ランキングや検証ルールを変更することもありません。
          </p>
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">基本原則</p>
          <h2>プライバシー重視の 3 つの原則</h2>
          <p>公開価格の比較ページはログイン壁や隠れたプロファイリングなしで誰でも閲覧できます。</p>
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
          <p className="gs-aux-kicker">データ区分</p>
          <h2>目的の異なるデータを厳格に分離</h2>
          <p>識別子なしの閲覧数集計、同意に基づく行動分析、サポートへのお問い合わせはそれぞれ独立して管理されます。</p>
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
        <PrivacyDisclosure locale="ja" articleLayout />
      </section>

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div>
              <p className="gs-aux-kicker">設定とお問い合わせ</p>
              <h2 className="!m-0">分析の設定はいつでも変更できます</h2>
            </div>
            <span className="gs-aux-icon-chip">
              <ShieldCheck size={18} aria-hidden="true" />
            </span>
          </div>
          <p>
            下のボタンから分析・Cookie 設定ダイアログをいつでも開き直せます。拒否を選択すると不要な計測を直ちに停止し、分析セッションを消去します。データに関するご請求はお問い合わせページよりご連絡ください。
          </p>
          <div className="gs-aux-actions">
            <AnalyticsConsentButton locale="ja" variant="primary" />
            <Link
              href="/ja/contact"
              className="gs-aux-secondary-btn"
              data-gs-ui="button"
            >
              <span>お問い合わせページへ</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </article>
      </section>
    </AuxiliaryArticle>
  );
}
