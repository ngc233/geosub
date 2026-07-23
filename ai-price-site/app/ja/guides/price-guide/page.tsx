import type { Metadata } from "next";
import JapaneseInfoPage from "../../../../components/JapaneseInfoPage";

export const metadata: Metadata = {
  title: "地域別料金の見方",
  description: "サブスクリプションの地域別価格を正しく比較する方法を説明します。",
};

export default function JapanesePriceGuidePage() {
  return (
    <JapaneseInfoPage
      eyebrow="Price Guide"
      title="地域別料金の見方"
      description="現地価格、換算価格、税情報、米国基準との価格差を組み合わせて判断します。"
    >
      <div className="space-y-5 text-sm leading-8 text-zinc-600">
        <p>
          まず現地通貨の価格と請求周期を確認し、次に同じ基準日の為替レートで換算した米ドル価格を比較します。月額と年額、個人向けとファミリー向けを混同しないことが重要です。
        </p>
        <p>
          最安地域だけでなく、税情報、価格の確認日、データの信頼性も確認してください。表示価格が安くても、支払い方法やアカウント地域の条件によって契約できない場合があります。
        </p>
      </div>
    </JapaneseInfoPage>
  );
}
