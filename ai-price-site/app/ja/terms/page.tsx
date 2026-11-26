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
  title: "利用規約",
  description:
    "GeoSub のサブスクリプション価格比較を利用する際のサービス範囲、情報の限界、外部リンク、免責事項について説明します。",
  robots: getLocaleRobotsPolicy("ja"),
};

const termsSections = [
  {
    number: "01",
    kicker: "サービスの性質",
    title: "独立した公開価格リファレンスであり、助言や提携ではないこと",
    icon: Scale,
    body: "GeoSub は公開価格の参照、地域別比較、サブスクリプションに関する情報を提供します。法務・金融・購入に関する助言ではなく、掲載されている各ブランドやストアと提携・協賛・承認関係にない独立した比較サービスです。",
    points: [
      "表示される価格、為替換算値、割引率は情報比較のための参考値です",
      "商業的または編集上の提携がある場合は明示し、ランキングや検証基準を変更しません",
    ],
  },
  {
    number: "02",
    kicker: "決済画面の優先",
    title: "公式の決済画面とプラットフォーム規約が最終基準",
    icon: Landmark,
    body: "GeoSub のデータは公開価格の参考情報です。地域をまたぐ契約、アカウント地域、支払い方法、税金、プラットフォームの制限によって契約可否や金額が異なる場合があり、公式の購入画面と各サービスの規約が常に優先されます。",
    points: [
      "為替変動、現地税制の変更、ストア側の価格改定により最終請求額が変わることがあります",
      "GeoSub は共有アカウントやチャージ代行、規約回避ツールを販売しません。公式の契約規約に従ってください",
    ],
  },
  {
    number: "03",
    kicker: "適正な利用",
    title: "公正な引用とサービス安定性の維持",
    icon: ShieldCheck,
    body: "個人の利用者、報道関係者、研究者は、出典（GeoSub）と確認日を明記したうえで比較データを引用いただけます。",
    points: [
      "過剰な自動スクレイピング、負荷試験、サイト運用を妨害する行為は禁止します",
      "地域別価格を引用する際は、正確性のため現地通貨・請求周期・確認日を併記してください",
    ],
  },
] as const;

export default function JapaneseTermsPage() {
  return (
    <AuxiliaryArticle
      locale="ja"
      summaryTitle="優先基準"
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            利用規約と情報の範囲
          </span>
          <h1>利用規約</h1>
          <p>
            本ページでは、GeoSub を利用する際に適用されるサービスの範囲、情報の位置づけ、適正利用のルール、決済に関する免責事項を定めます。
          </p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">優先基準</p>
          <p>
            すべての地域別価格比較、通貨換算、税情報は参考情報です。実際の請求額や契約資格は、公式ストアの決済画面および各プラットフォーム規約に従います。
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
                <p className="gs-aux-kicker">外部リンクと規約改定</p>
                <h2 className="!m-0">外部プラットフォームへのリンクと改定</h2>
              </div>
            </div>
            <span className="gs-aux-icon-chip">
              <ExternalLink size={18} aria-hidden="true" />
            </span>
          </div>
          <p>
            GeoSub は確認の便宜のため公式サイトやアプリストアへリンクしていますが、外部サービスはそれぞれの規約とプライバシーポリシーに基づいて運営されています。本規約の更新は本ページへの掲載をもって効力を生じます。
          </p>
          <div className="gs-aux-actions">
            <Link
              href="/ja/data-sources"
              className="gs-aux-primary-btn"
              data-gs-ui="button"
            >
              <FileText size={15} aria-hidden="true" />
              <span>データソースと検証方法</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link
              href="/ja/privacy"
              className="gs-aux-secondary-btn"
              data-gs-ui="button"
            >
              <span>プライバシーポリシー</span>
            </Link>
            <Link
              href="/ja/contact"
              className="gs-aux-secondary-btn"
              data-gs-ui="button"
            >
              <span>お問い合わせ</span>
            </Link>
          </div>
        </article>
      </section>

      <section>
        <div className="gs-aux-disclaimer">
          <AlertTriangle aria-hidden="true" />
          <p>
            <strong>重要事項：</strong> GeoSub を利用することで、上記の情報上の前提をご理解いただいたものとみなします。契約前には必ず公式の決済画面で最終金額、税額、利用条件をご確認ください。
          </p>
        </div>
      </section>
    </AuxiliaryArticle>
  );
}
