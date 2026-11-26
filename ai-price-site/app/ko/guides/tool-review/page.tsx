import type { Metadata } from "next";
import PublicGuidePage from "../../../../components/PublicGuidePage";
import {
  getDefaultArticleQuickTools,
  getGuideHubCopy,
  getSiblingCoreGuideLinks,
} from "../../../../lib/guide-hub-copy";
import { getLocaleRobotsPolicy } from "../../../../lib/seo-indexing-policy";

export const metadata: Metadata = {
  title: "디지털 도구 리뷰 및 평가 가이드",
  description:
    "실제 사용 사례, 기능 제한, 총 구독 비용, 국가별 제공 범위와 근거 날짜를 바탕으로 디지털 도구를 평가하는 기준입니다.",
  robots: getLocaleRobotsPolicy("ko"),
};

export default function KoreanToolReviewPage() {
  const copy = getGuideHubCopy("ko");
  return (
    <PublicGuidePage
      canvas
      locale="ko"
      eyebrow={copy.toolReview.eyebrow}
      title={copy.toolReview.title}
      description={copy.toolReview.articleDescription}
      metadata={<span>{copy.coreArticleMeta(3, 3)}</span>}
      sections={[
        {
          title: "실제로 자주 수행하는 작업부터 정리하세요",
          body: "반복되는 핵심 업무, 반드시 필요한 기능, 허용할 수 없는 제한 사항을 먼저 구분하세요. 대화형 AI, 코딩, 이미지 생성, 검색 및 협업 도구는 평가 기준이 서로 다릅니다.",
        },
        {
          title: "표면적인 최저가가 아닌 총비용을 비교하세요",
          body: "결제 주기, 사용량 한도, 포함 기능, 세금, 환전 수수료와 국가별 제공 범위를 함께 살펴봐야 합니다. 저렴한 요금제에는 꼭 필요한 핵심 기능이 빠져 있을 수 있습니다.",
        },
        {
          title: "검증 버전과 근거 날짜를 확인하세요",
          body: "모델 성능, 요금제 혜택과 가격은 수시로 바뀝니다. 리뷰 결론을 그대로 받아들이기 전에 테스트된 버전, 작성 날짜, 재현 가능한 근거를 확인하세요.",
        },
      ]}
      note="가장 확실한 판단 기준은 내 실제 작업으로 직접 검증해 보는 것입니다. 점수와 가격 비교는 후보를 좁히는 도구로 활용하세요."
      relatedLabel={copy.articleContinueTitle}
      relatedLinks={getSiblingCoreGuideLinks("ko", "tool-review")}
      quickTools={getDefaultArticleQuickTools("ko", "tool-review")}
    />
  );
}
