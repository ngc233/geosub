import type { Metadata } from "next";
import KoreanInfoPage from "../../../../components/KoreanInfoPage";

export const metadata: Metadata = {
  title: "지역별 가격 읽는 법",
  description: "구독 서비스의 지역별 가격을 올바르게 비교하는 방법을 설명합니다.",
};

export default function KoreanPriceGuidePage() {
  return (
    <KoreanInfoPage
      eyebrow="Price Guide"
      title="지역별 가격 읽는 법"
      description="현지 가격, 환산 가격, 세금 정보와 미국 기준 가격 차이를 함께 살펴보세요."
    >
      <div className="space-y-5 text-sm leading-8 text-zinc-600">
        <p>
          먼저 현지 통화 가격과 결제 주기를 확인한 뒤, 같은 기준일의 환율로
          환산한 미국 달러 가격을 비교합니다. 월간과 연간, 개인과 가족 요금제를
          혼동하지 않는 것이 중요합니다.
        </p>
        <p>
          최저가 지역뿐 아니라 세금 정보, 가격 확인일과 데이터 신뢰도도 함께
          확인하세요. 가격이 저렴해도 결제 수단이나 계정 지역 조건 때문에
          구독하지 못할 수 있습니다.
        </p>
      </div>
    </KoreanInfoPage>
  );
}
