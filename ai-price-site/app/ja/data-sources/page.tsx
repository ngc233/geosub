import type { Metadata } from "next";
import JapaneseInfoPage from "../../../components/JapaneseInfoPage";

export const metadata: Metadata = {
  title: "データソースと価格比較の方法",
  description:
    "GeoSubが使用するApp Store価格、為替レート、税情報、価格確認の方法を説明します。",
};

export default function JapaneseDataSourcesPage() {
  return (
    <JapaneseInfoPage
      eyebrow="Data Sources"
      title="データソースと価格比較の方法"
      description="同じApp Storeプランと請求周期の地域別料金を比較し、現地通貨、取得日、為替基準日を明示します。"
    >
      <h2 className="text-xl font-black text-zinc-950">価格情報の扱い</h2>
      <div className="mt-4 space-y-5 text-sm leading-8 text-zinc-600">
        <p>
          各価格は、製品、プラン、国・地域、通貨、請求周期を区別して保存します。異常に安い価格、通貨の誤認、小数点や請求周期の不一致が疑われるデータは公開せず、自動確認の対象にします。
        </p>
        <p>
          選択した表示通貨への換算には、画面に表示した基準日の為替レートを使用します。必要なレートが古い、または取得できない場合は換算を停止します。税情報は比較の参考であり、App Storeの表示価格に税率を重ねて加算するものではありません。
        </p>
        <p className="text-zinc-500">
          価格や利用可否は変更されることがあります。最終的な金額、税額、購入条件は公式の購入画面が優先されます。
        </p>
      </div>
    </JapaneseInfoPage>
  );
}
