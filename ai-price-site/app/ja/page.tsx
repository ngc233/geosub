import type { Metadata } from "next";
import UnifiedHomepageCanvas from "../../components/UnifiedHomepageCanvas";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "世界のデジタルサブスクリプション価格",
  description:
    "AIやストリーミングのサブスクリプション料金を国・地域別に比較できます。現地価格、選択した表示通貨への換算、税情報、購買力の目安を掲載しています。",
};

export default function JapanesePage() {
  return <UnifiedHomepageCanvas locale="ja" />;
}
