import type { Metadata } from "next";
import JapaneseInfoPage from "../../../components/JapaneseInfoPage";

export const metadata: Metadata = {
  title: "GeoSubについて",
  description:
    "GeoSubの目的と、世界のデジタルサブスクリプション価格を比較する仕組みを紹介します。",
};

export default function JapaneseAboutPage() {
  return (
    <JapaneseInfoPage
      eyebrow="About GeoSub"
      title="GeoSubについて"
      description="GeoSubは、世界各地のデジタルサブスクリプション料金を比較・理解しやすくするための価格データサイトです。"
    >
      <h2 className="text-xl font-black text-zinc-950">私たちの目的</h2>
      <p className="mt-4 text-sm leading-8 text-zinc-600">
        同じサービスでも、国や通貨、税制、プラットフォームによって料金は異なります。GeoSubは、確認済みの地域別価格を共通の基準で整理し、その違いを透明に示します。
      </p>
      <p className="mt-6 text-sm leading-8 text-zinc-500">
        掲載価格には取得日、為替基準日、税情報、信頼性を添えています。最終的な請求額と利用可否は、必ず公式の購入画面でご確認ください。
      </p>
    </JapaneseInfoPage>
  );
}
