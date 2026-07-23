import type { Metadata } from "next";
import KoreanInfoPage from "../../../components/KoreanInfoPage";

export const metadata: Metadata = {
  title: "GeoSub 소개",
  description:
    "GeoSub가 전 세계 디지털 구독 가격을 비교하는 이유와 데이터 제공 방식을 소개합니다.",
};

export default function KoreanAboutPage() {
  return (
    <KoreanInfoPage
      eyebrow="About GeoSub"
      title="GeoSub 소개"
      description="GeoSub는 전 세계 디지털 구독 가격을 더 쉽게 비교하고 이해할 수 있도록 정리하는 가격 데이터 사이트입니다."
    >
      <h2 className="text-xl font-black text-zinc-950">우리가 하는 일</h2>
      <p className="mt-4 text-sm leading-8 text-zinc-600">
        같은 서비스라도 국가와 통화, 세금 제도, 플랫폼에 따라 가격이 달라집니다.
        GeoSub는 검토된 지역별 가격을 같은 기준으로 정리해 그 차이를 투명하게
        보여 줍니다.
      </p>
      <p className="mt-6 text-sm leading-8 text-zinc-500">
        각 가격에는 수집일, 환율 기준일, 세금 정보와 신뢰도를 함께 표시합니다.
        최종 결제 금액과 이용 가능 여부는 공식 결제 화면에서 확인하세요.
      </p>
    </KoreanInfoPage>
  );
}
