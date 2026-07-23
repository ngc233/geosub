import type { Metadata } from "next";
import JapaneseInfoPage from "../../../../components/JapaneseInfoPage";

export const metadata: Metadata = {
  title: "価格データの調査方法",
  description:
    "GeoSubが地域別価格を取得し、異常値を確認して公開するまでの方法を説明します。",
};

export default function JapaneseMethodologyPage() {
  return (
    <JapaneseInfoPage
      eyebrow="Methodology"
      title="価格データの調査方法"
      description="同じ条件の価格だけを比較し、異常値を公開ランキングから分離します。"
    >
      <div className="space-y-5 text-sm leading-8 text-zinc-600">
        <p>
          価格は製品、プラン、国・地域、通貨、請求周期ごとに取得します。同じプランの複数回の観測が安定していることを確認し、通貨や小数点、請求周期の誤認が疑われるデータは自動的に隔離します。
        </p>
        <p>
          公開ページには確認済みデータのみを表示します。取得日、為替基準日、プラン確認日、ページ更新日は、それぞれ異なる意味を持つため分けて表示します。
        </p>
      </div>
    </JapaneseInfoPage>
  );
}
