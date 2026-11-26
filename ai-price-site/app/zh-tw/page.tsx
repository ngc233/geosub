import type { Metadata } from "next";
import UnifiedHomepageCanvas from "../../components/UnifiedHomepageCanvas";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "全球數位訂閱價格比較",
  description:
    "比較 AI 與串流媒體訂閱在各 App Store 地區的真實價格，支援切換顯示幣別、稅費說明、更新日期與在地購買力參考。",
};

export default function TraditionalChinesePage() {
  return <UnifiedHomepageCanvas locale="zh-tw" />;
}
