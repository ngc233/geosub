import type { Metadata } from "next";
import JapaneseInfoPage from "../../../../components/JapaneseInfoPage";

export const metadata: Metadata = {
  title: "支払い方法とアカウント地域",
  description:
    "地域をまたぐサブスクリプションで確認したい支払い方法、請求先、アカウント条件を説明します。",
};

export default function JapanesePaymentAccountPage() {
  return (
    <JapaneseInfoPage
      eyebrow="Payment & Account"
      title="支払い方法とアカウント地域"
      description="価格差があっても、すべての地域で同じ条件で契約できるとは限りません。"
    >
      <div className="space-y-5 text-sm leading-8 text-zinc-600">
        <p>
          App Storeの購入可否は、Apple Accountの国・地域、利用できる支払い方法、請求先情報、残高、サービス側の提供地域によって変わります。
        </p>
        <p>
          GeoSubは公開価格の比較を目的としており、地域制限の回避を勧めるものではありません。購入前に公式の利用条件と最終確認画面をご確認ください。
        </p>
      </div>
    </JapaneseInfoPage>
  );
}
