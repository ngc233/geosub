import type { Metadata } from "next";
import PublicGuidePage from "../../../../components/PublicGuidePage";
import {
  getDefaultArticleQuickTools,
  getGuideHubCopy,
  getSiblingCoreGuideLinks,
} from "../../../../lib/guide-hub-copy";
import { getLocaleRobotsPolicy } from "../../../../lib/seo-indexing-policy";

export const metadata: Metadata = {
  title: "デジタルツール評価ガイド",
  description:
    "実際の用途、機能上の制約、総額コスト、地域ごとの提供状況、検証日の観点からデジタルツールを評価する方法。",
  robots: getLocaleRobotsPolicy("ja"),
};

export default function JapaneseToolReviewPage() {
  const copy = getGuideHubCopy("ja");
  return (
    <PublicGuidePage
      canvas
      locale="ja"
      eyebrow={copy.toolReview.eyebrow}
      title={copy.toolReview.title}
      description={copy.toolReview.articleDescription}
      metadata={<span>{copy.coreArticleMeta(3, 3)}</span>}
      sections={[
        {
          title: "自分の実際の業務タスクから始める",
          body: "日常的に繰り返す作業、必須となる機能、許容できない制限を整理しましょう。チャット、コーディング、画像生成、検索、共同編集では評価基準が異なります。",
        },
        {
          title: "表面上の最安値ではなく総コストで比較する",
          body: "請求周期、利用上限、含まれる機能、税金、通貨換算、対象地域をまとめて確認します。安価なプランでは必要な機能が省かれていることがあります。",
        },
        {
          title: "検証バージョンと日付を確認する",
          body: "AI モデルやプラン特典、料金は頻繁に更新されます。レビュー結論を鵜呑みにせず、検証されたバージョン、日付、再現可能な根拠を確認してください。",
        },
      ]}
      note="最も確実な判断材料は、自分の実際の作業で試すことです。スコアや価格比較は候補を絞り込むための手段として活用しましょう。"
      relatedLabel={copy.articleContinueTitle}
      relatedLinks={getSiblingCoreGuideLinks("ja", "tool-review")}
      quickTools={getDefaultArticleQuickTools("ja", "tool-review")}
    />
  );
}
