import type { Metadata } from "next";
import KoreanInfoPage from "../../../../components/KoreanInfoPage";

export const metadata: Metadata = {
  title: "결제 수단과 계정 지역",
  description:
    "지역 간 구독에서 확인해야 할 결제 수단, 청구 정보와 계정 조건을 설명합니다.",
};

export default function KoreanPaymentAccountPage() {
  return (
    <KoreanInfoPage
      eyebrow="Payment & Account"
      title="결제 수단과 계정 지역"
      description="가격 차이가 있어도 모든 지역에서 같은 조건으로 구독할 수 있는 것은 아닙니다."
    >
      <div className="space-y-5 text-sm leading-8 text-zinc-600">
        <p>
          App Store 구매 가능 여부는 Apple Account의 국가·지역, 사용 가능한
          결제 수단, 청구 정보, 잔액과 서비스 제공 지역에 따라 달라집니다.
        </p>
        <p>
          GeoSub는 공개 가격을 비교하기 위한 사이트이며 지역 제한 우회를 권하지
          않습니다. 구매 전에 공식 이용 조건과 최종 결제 화면을 확인하세요.
        </p>
      </div>
    </KoreanInfoPage>
  );
}
