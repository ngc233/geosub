import type { Metadata } from "next";
import JapaneseInfoPage from "../../../components/JapaneseInfoPage";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "GeoSubにおけるアクセス解析とウェブサイト利用データの取り扱いについて説明します。",
};

export default function JapanesePrivacyPage() {
  return (
    <JapaneseInfoPage
      eyebrow="Privacy Policy"
      title="プライバシーポリシー"
      description="GeoSubにおけるアクセス解析と、ウェブサイト利用データの取り扱いについて説明します。"
    >
      <h2 className="text-xl font-black text-zinc-950">基本方針</h2>
      <p className="mt-4 text-sm leading-8 text-zinc-600">
        GeoSubは公開価格情報を扱うサイトであり、閲覧のために氏名や本人確認情報などの機微な個人情報を求めません。
      </p>
      <p className="mt-6 text-sm leading-8 text-zinc-500">
        サイト管理者が設定した場合、Google AnalyticsまたはGoogle Tag Managerを利用して、ページ閲覧や一般的な操作情報を測定することがあります。価格比較に不要な機微情報の収集は行いません。
      </p>
    </JapaneseInfoPage>
  );
}
