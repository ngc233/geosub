import type { Metadata } from "next";
import PublicGuidePage from "../../../../components/PublicGuidePage";
import {
  getDefaultArticleQuickTools,
  getGuideHubCopy,
  getSiblingCoreGuideLinks,
} from "../../../../lib/guide-hub-copy";
import { getLocaleRobotsPolicy } from "../../../../lib/seo-indexing-policy";

export const metadata: Metadata = {
  title: "數位工具訂閱評測指南",
  description:
    "從實際工作任務、能力限制、長期總成本、地區可用性與證據日期評估數位工具是否值得訂閱。",
  robots: getLocaleRobotsPolicy("zh-tw"),
};

export default function TraditionalChineseToolReviewPage() {
  const copy = getGuideHubCopy("zh-tw");
  return (
    <PublicGuidePage
      canvas
      locale="zh-tw"
      eyebrow={copy.toolReview.eyebrow}
      title={copy.toolReview.title}
      description={copy.toolReview.articleDescription}
      metadata={<span>{copy.coreArticleMeta(3, 3)}</span>}
      sections={[
        {
          title: "從你的真實高頻任務出發",
          body: "先列出日常最常處理的任務、必要功能與無法接受的限制。對話問答、程式開發、影像生成、檢索研究與團隊協作工具，各自需要不同的評估標準。",
        },
        {
          title: "比較完整總成本，而非表面最低價",
          body: "把計費週期、用量上限、內含權益、稅費、幣別換算與地區開放範圍一併納入考量。看似便宜的方案，可能剛好缺少你最依賴的核心能力。",
        },
        {
          title: "核對評測版本與證據日期",
          body: "模型版本、方案額度與地區定價都會隨時間調整。參考他人評測前，請先確認測試版本、發布日期、驗證方法與可重現的依據。",
        },
      ]}
      note="最可靠的決策來自親自用真實任務測試。評分與價格比較適合用來縮小候選範圍，不能取代實際體驗。"
      relatedLabel={copy.articleContinueTitle}
      relatedLinks={getSiblingCoreGuideLinks("zh-tw", "tool-review")}
      quickTools={getDefaultArticleQuickTools("zh-tw", "tool-review")}
    />
  );
}
