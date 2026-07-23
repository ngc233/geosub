import type { Metadata } from "next";
import KoreanInfoPage from "../../../components/KoreanInfoPage";

export const metadata: Metadata = {
  title: "이용약관",
  description:
    "GeoSub 가격 정보를 이용할 때 적용되는 기본 조건과 정보 범위, 면책 사항을 설명합니다.",
};

export default function KoreanTermsPage() {
  return (
    <KoreanInfoPage
      eyebrow="Terms of Service"
      title="이용약관"
      description="GeoSub 가격 정보를 이용할 때 적용되는 기본 조건과 정보 범위, 면책 사항을 안내합니다."
    >
      <h2 className="text-xl font-black text-zinc-950">정보의 성격</h2>
      <p className="mt-4 text-sm leading-8 text-zinc-600">
        GeoSub는 공개 가격 조회와 지역별 비교, 구독 관련 정보를 제공합니다.
        법률, 금융 또는 구매에 관한 조언을 제공하지 않습니다.
      </p>
      <p className="mt-6 text-sm leading-8 text-zinc-500">
        지역 간 구독은 계정 지역, 결제 수단, 세금과 플랫폼 정책에 따라 이용하지
        못할 수 있습니다. 공식 결제 화면과 각 서비스의 약관을 우선해 주세요.
      </p>
    </KoreanInfoPage>
  );
}
