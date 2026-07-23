import type { Metadata } from "next";
import Link from "next/link";
import JapaneseInfoPage from "../../../components/JapaneseInfoPage";

export const metadata: Metadata = {
  title: "サブスクリプション料金ガイド",
  description:
    "地域別価格、為替、税、支払い方法、アカウント、データの読み方を解説します。",
};

const guides = [
  {
    title: "地域別料金の見方",
    description: "現地価格、米ドル換算、米国基準との価格差を正しく読む方法。",
    href: "/ja/guides/price-guide/",
  },
  {
    title: "支払いとアカウント",
    description: "地域をまたぐ契約で注意したい支払い方法とアカウント条件。",
    href: "/ja/guides/payment-account/",
  },
  {
    title: "調査方法",
    description: "GeoSubが価格を取得、確認、公開するまでの考え方。",
    href: "/ja/guides/methodology/",
  },
];

export default function JapaneseGuidesPage() {
  return (
    <JapaneseInfoPage
      eyebrow="Guides"
      title="サブスクリプション料金ガイド"
      description="価格表の読み方から支払い時の注意点まで、比較に必要な基礎知識をまとめています。"
    >
      <div className="grid gap-4 md:grid-cols-3">
        {guides.map((guide) => (
          <Link
            key={guide.href}
            href={guide.href}
            className="rounded-lg border border-zinc-200 p-5 transition hover:border-lime-300 hover:bg-lime-50/40"
          >
            <h2 className="font-black text-zinc-950">{guide.title}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600">
              {guide.description}
            </p>
          </Link>
        ))}
      </div>
    </JapaneseInfoPage>
  );
}
