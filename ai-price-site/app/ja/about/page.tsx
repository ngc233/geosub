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
  title: "GeoSub について",
  description:
    "GeoSub は世界各国の AI・動画配信サブスクリプションの公開価格を、為替レート・税情報・更新日・負担感とあわせて比較する独立系データサイトです。",
  robots: getLocaleRobotsPolicy("ja"),
};

const valueCards = [
  {
    title: "国・地域をまたいで比較可能",
    desc: "現地通貨の元の金額を保持したまま共通の為替基準を適用し、市場間の価格差を透明に可視化します。",
    icon: Globe2,
  },
  {
    title: "根拠をたどれる検証記録",
    desc: "掲載データには参照元ストア、確認日、適用条件を明記し、未確認の推測値を事実のように表示しません。",
    icon: SearchCheck,
  },
  {
    title: "契約条件と制約を明示",
    desc: "料金だけでなく、税制、アカウント地域の制約、決済方法、プラン提供範囲も同時に案内します。",
    icon: ShieldCheck,
  },
] as const;

const workflow = [
  {
    title: "公開ストア価格の整理",
    desc: "各国の公式 App Store サブスクリプション価格および対象サービスの公式 Web 価格を記録します。",
    icon: Database,
  },
  {
    title: "整合性チェックの実施",
    desc: "通貨コード、請求周期、対象国、確認日時を検査し、異常値や不整合な記録は公開を保留します。",
    icon: BookOpenCheck,
  },
  {
    title: "説明可能な比較データの公開",
    desc: "現地価格、米ドル基準値、現地所得に対する労働時間目安、決済条件を並べて提示します。",
    icon: Scale,
  },
] as const;

export default function JapaneseAboutPage() {
  return (
    <AuxiliaryArticle
      locale="ja"
      summaryTitle="編集基準"
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            GeoSub について · 独立系プライスインテリジェンス
          </span>
          <h1>世界のサブスクリプション価格を、検証できる判断材料へ。</h1>
          <p>
            GeoSub は、世界各国の AI・動画配信サブスクリプションの公開料金を整理し、為替レート、税情報、更新日、現地負担感とあわせて比較できる独立系サービスです。
          </p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">編集基準</p>
          <p>
            地域別価格は、参照元・確認日・通貨・決済条件のすべてを説明できて初めて比較する価値が生まれます。
          </p>
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">解決したい課題</p>
          <h2>国ごとに分散した料金情報を、推測なしで比較する</h2>
          <p>
            各国・各通貨の App Store サブスクリプション価格を共通の基準で整理し、地域間の価格差やプラン改定、契約条件を分かりやすく示します。
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
          <p className="gs-aux-kicker">検証プロセス</p>
          <h2>公開価格から信頼できる比較テーブルまで</h2>
          <p>
            すべての価格は現地通貨、確認日、為替基準日を保持しています。整合性チェックを通過した地域価格のみを掲載し、アカウント地域・支払い手段・税金・公式決済画面での最終確認を促します。
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
                <h2 className="!m-0">独立性の徹底</h2>
              </div>
            </div>
            <p>
              広告や提携がある場合は明確に表記します。対価によって地域別ランキング、検証基準、編集上の結論が変わることは一切ありません。
            </p>
          </article>

          <article className="gs-aux-block">
            <div className="gs-aux-card-top">
              <div className="gs-aux-card-title-group">
                <span className="gs-aux-icon-chip">
                  <Users size={18} aria-hidden="true" />
                </span>
                <h2 className="!m-0">主な利用者</h2>
              </div>
            </div>
            <ul className="gs-aux-checklist">
              <li>
                <CheckCircle2 aria-hidden="true" />
                <span>AI・配信サービスの国内外プラン料金を比較したい個人ユーザー</span>
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" />
                <span>デジタルサービスの国際価格戦略を調査する記者・リサーチャー</span>
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" />
                <span>グローバルな料金体系をベンチマークするプロダクト・事業チーム</span>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div>
              <p className="gs-aux-kicker">継続的な検証</p>
              <h2 className="!m-0">価格は変化しても、検証基準は常に透明です</h2>
            </div>
            <span className="gs-aux-icon-chip">
              <Clock3 size={18} aria-hidden="true" />
            </span>
          </div>
          <p>
            各国のストア価格や為替基準日、価格改定履歴の詳しい仕組みをご確認いただけます。誤りのご指摘やお問い合わせも受け付けています。
          </p>
          <div className="gs-aux-actions">
            <Link
              href="/ja/data-sources"
              className="gs-aux-primary-btn"
              data-gs-ui="button"
            >
              <span>データソースと検証方法</span>
              <ArrowRight size={15} aria-hidden="true" />
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
    </AuxiliaryArticle>
  );
}
