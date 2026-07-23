import type { Metadata } from "next";
import Link from "next/link";
import KoreanInfoPage from "../../../components/KoreanInfoPage";

export const metadata: Metadata = {
  title: "구독 가격 가이드",
  description:
    "지역별 가격, 환율, 세금, 결제 수단, 계정과 데이터 읽는 법을 설명합니다.",
};

const guides = [
  {
    title: "지역별 가격 읽는 법",
    description: "현지 가격과 달러 환산가, 미국 기준 가격 차이를 올바르게 읽는 방법입니다.",
    href: "/ko/guides/price-guide/",
  },
  {
    title: "결제와 계정",
    description: "지역 간 구독에서 확인해야 할 결제 수단과 계정 조건입니다.",
    href: "/ko/guides/payment-account/",
  },
  {
    title: "조사 방법",
    description: "GeoSub가 가격을 수집하고 검토해 공개하는 방식입니다.",
    href: "/ko/guides/methodology/",
  },
];

export default function KoreanGuidesPage() {
  return (
    <KoreanInfoPage
      eyebrow="Guides"
      title="구독 가격 가이드"
      description="가격표를 읽는 방법부터 결제할 때 확인할 점까지, 비교에 필요한 기본 정보를 정리했습니다."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {guides.map((guide) => (
          <Link
            key={guide.href}
            href={guide.href}
            className="rounded-lg border border-zinc-200 p-5 transition hover:border-lime-300 hover:bg-lime-50/40"
          >
            <h2 className="font-black text-zinc-950">{guide.title}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600">{guide.description}</p>
          </Link>
        ))}
      </div>
    </KoreanInfoPage>
  );
}
