import type { Metadata } from "next";
import KoreanInfoPage from "../../../../components/KoreanInfoPage";

export const metadata: Metadata = {
  title: "가격 데이터 조사 방법",
  description:
    "GeoSub가 지역별 가격을 수집하고 이상값을 검토해 공개하는 방식을 설명합니다.",
};

export default function KoreanMethodologyPage() {
  return (
    <KoreanInfoPage
      eyebrow="Methodology"
      title="가격 데이터 조사 방법"
      description="같은 조건의 가격만 비교하고 이상값은 공개 순위에서 분리합니다."
    >
      <div className="space-y-5 text-sm leading-8 text-zinc-600">
        <p>
          가격은 제품, 요금제, 국가·지역, 통화와 결제 주기별로 수집합니다. 같은
          요금제의 반복 관측이 안정적인지 확인하고, 통화나 소수점, 결제 주기
          오류가 의심되는 데이터는 자동으로 격리합니다.
        </p>
        <p>
          공개 페이지에는 검토된 데이터만 표시합니다. 가격 수집일, 환율 기준일,
          요금제 검토일과 페이지 업데이트일은 의미가 다르므로 구분해 보여 줍니다.
        </p>
      </div>
    </KoreanInfoPage>
  );
}
