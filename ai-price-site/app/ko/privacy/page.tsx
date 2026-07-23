import type { Metadata } from "next";
import KoreanInfoPage from "../../../components/KoreanInfoPage";

export const metadata: Metadata = {
  title: "개인정보 처리방침",
  description: "GeoSub의 방문 분석과 웹사이트 이용 데이터 처리 방식을 설명합니다.",
};

export default function KoreanPrivacyPage() {
  return (
    <KoreanInfoPage
      eyebrow="Privacy Policy"
      title="개인정보 처리방침"
      description="GeoSub의 방문 분석과 웹사이트 이용 데이터 처리 방식을 안내합니다."
    >
      <h2 className="text-xl font-black text-zinc-950">기본 원칙</h2>
      <p className="mt-4 text-sm leading-8 text-zinc-600">
        GeoSub는 공개 가격 정보를 제공하며, 사이트를 둘러보기 위해 이름이나
        신원 확인 정보처럼 민감한 개인정보를 요구하지 않습니다.
      </p>
      <p className="mt-6 text-sm leading-8 text-zinc-500">
        Google Analytics 또는 Google Tag Manager를 이용해 페이지 조회,
        일반적인 이용 행동과 사이트 성능을 측정할 수 있습니다. 이 정보는
        콘텐츠와 안정성을 개선하는 데 사용하며, 결제 정보나 가격 비교에
        필요하지 않은 민감한 신원 정보를 요구하지 않습니다.
      </p>
    </KoreanInfoPage>
  );
}
