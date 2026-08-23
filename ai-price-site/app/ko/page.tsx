import type { Metadata } from "next";
import LocalizedHomepagePage from "../../components/LocalizedHomepagePage";

export const metadata: Metadata = {
  title: "전 세계 디지털 구독 가격",
  description: "AI와 스트리밍 구독료를 국가·지역별로 비교하세요. 현지 가격, 선택한 표시 통화 환산가, 세금 정보와 구매력 지표를 함께 제공합니다.",
};

export default function KoreanPage() {
  return <LocalizedHomepagePage locale="ko" />;
}
