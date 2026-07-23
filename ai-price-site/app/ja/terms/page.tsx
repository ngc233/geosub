import type { Metadata } from "next";
import JapaneseInfoPage from "../../../components/JapaneseInfoPage";

export const metadata: Metadata = {
  title: "利用規約",
  description:
    "GeoSubの価格情報を利用する際の基本条件、情報の範囲、免責事項を説明します。",
};

export default function JapaneseTermsPage() {
  return (
    <JapaneseInfoPage
      eyebrow="Terms of Service"
      title="利用規約"
      description="GeoSubの価格情報を利用する際の基本条件、情報の範囲、免責事項を説明します。"
    >
      <h2 className="text-xl font-black text-zinc-950">情報の位置づけ</h2>
      <p className="mt-4 text-sm leading-8 text-zinc-600">
        GeoSubは、公開価格の参照、地域別比較、サブスクリプション情報を提供します。法律、金融、購入に関する助言を提供するものではありません。
      </p>
      <p className="mt-6 text-sm leading-8 text-zinc-500">
        地域をまたぐ契約では、アカウント地域、支払い方法、税金、プラットフォームの規則によって利用できない場合があります。公式の購入画面と各サービスの規約を優先してください。
      </p>
    </JapaneseInfoPage>
  );
}
