import type { Metadata } from "next";
import KoreanInfoPage from "../../../components/KoreanInfoPage";

export const metadata: Metadata = {
  title: "데이터 출처와 가격 비교 방식",
  description:
    "GeoSub가 사용하는 App Store 가격, 환율, 세금 정보와 가격 검토 방식을 설명합니다.",
};

export default function KoreanDataSourcesPage() {
  return (
    <KoreanInfoPage
      eyebrow="Data Sources"
      title="데이터 출처와 가격 비교 방식"
      description="GeoSub의 공개 순위는 검토된 App Store 지역별 구독 가격을 기준으로 합니다."
    >
      <h2 className="text-xl font-black text-zinc-950">가격 데이터 처리</h2>
      <div className="mt-4 space-y-5 text-sm leading-8 text-zinc-600">
        <p>
          가격은 제품, 요금제, 국가·지역, 통화와 결제 주기를 구분해 저장합니다.
          비정상적으로 낮은 가격이나 통화, 소수점, 결제 주기 오류가 의심되는
          데이터는 공개하지 않고 자동 검토 대상으로 분리합니다.
        </p>
        <p>
          미국 달러와 중국 위안 환산에는 화면에 표시된 기준일의 환율을 사용합니다.
          세금 정보는 비교를 위한 안내이며 App Store 표시 가격에 세율을 임의로
          더하지 않습니다.
        </p>
        <p className="text-zinc-500">
          가격과 이용 가능 여부는 달라질 수 있습니다. 최종 금액, 세금과 구매
          조건은 공식 결제 화면이 우선합니다.
        </p>
      </div>
    </KoreanInfoPage>
  );
}
