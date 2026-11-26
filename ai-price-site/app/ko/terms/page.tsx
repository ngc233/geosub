import AuxiliaryArticle from "../../../components/AuxiliaryArticle";
import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  Landmark,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { getLocaleRobotsPolicy } from "../../../lib/seo-indexing-policy";

export const metadata: Metadata = {
  title: "이용약관",
  description:
    "GeoSub 구독 가격 비교 서비스 이용에 적용되는 서비스 범위, 정보 한계, 외부 링크 및 결제 화면 우선 원칙을 확인하세요.",
  robots: getLocaleRobotsPolicy("ko"),
};

const termsSections = [
  {
    number: "01",
    kicker: "서비스 성격",
    title: "독립적인 공개 가격 참고 자료이며 자문이나 제휴가 아님",
    icon: Scale,
    body: "GeoSub는 공개 가격 참고 자료, 국가별 비교 및 구독 정보를 제공합니다. 법률, 금융 또는 구매 자문을 제공하지 않으며, 표시된 브랜드와 제휴·후원·보증 관계가 없는 독립 비교 서비스입니다.",
    points: [
      "표시된 가격, 환율 환산액 및 할인율은 정보 비교 목적의 참고 자료입니다",
      "상업적 또는 콘텐츠 제휴는 명확히 표시되며 순위나 검증 기준을 절대 변경하지 않습니다",
    ],
  },
  {
    number: "02",
    kicker: "공식 결제 기준 우선",
    title: "공식 결제 화면과 플랫폼 약관이 실제 청구를 결정",
    icon: Landmark,
    body: "GeoSub 이용자는 본 데이터가 공개 가격 참고 자료임을 이해합니다. 국가 간 구독, 계정 지역, 결제 수단, 세금 및 플랫폼 위험 관리 정책이 이용 가능 여부에 영향을 줄 수 있으며, 최종 결제 화면과 공식 플랫폼 규정이 항상 우선합니다.",
    points: [
      "환율 변동, 현지 세법 변경 또는 스토어 가격 조정으로 인해 실제 청구액이 달라질 수 있습니다",
      "GeoSub는 공유 계정, 대리 충전 또는 약관 우회 수단을 판매하지 않으며 공식 약관 준수를 권장합니다",
    ],
  },
  {
    number: "03",
    kicker: "올바른 이용",
    title: "공정한 인용 및 서비스 안정성 보호",
    icon: ShieldCheck,
    body: "개인 독자, 언론인 및 연구자는 출처(GeoSub)와 확인 날짜를 명시하여 비교 데이터를 자유롭게 참고하고 인용할 수 있습니다.",
    points: [
      "과도한 자동화 스크래핑, 서비스 거부 시도 등 사이트 가용성을 해치는 행위는 금지됩니다",
      "지역별 수치를 인용할 때는 정확성을 위해 현지 통화, 결제 주기와 확인 날짜를 함께 표기해 주세요",
    ],
  },
] as const;

export default function KoreanTermsPage() {
  return (
    <AuxiliaryArticle
      locale="ko"
      summaryTitle="기준 원칙"
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            이용약관 및 정보 범위
          </span>
          <h1>이용약관</h1>
          <p>
            이 페이지에서는 GeoSub를 이용할 때 적용되는 서비스 범위, 정보 한계, 올바른 이용 규칙 및 결제 관련 면책 사항을 안내합니다.
          </p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">기준 원칙</p>
          <p>
            모든 지역별 가격 비교, 통화 환산 및 세금 안내는 참고용 정보입니다. 실제 청구 금액과 가입 자격은 공식 스토어 결제 화면과 플랫폼 약관을 따릅니다.
          </p>
        </div>
      </section>

      {termsSections.map((section) => {
        const Icon = section.icon;
        return (
          <section key={section.number}>
            <article className="gs-aux-block">
              <div className="gs-aux-card-top">
                <div className="gs-aux-card-title-group">
                  <span data-gs-ui="tag" className="gs-aux-step-num" aria-hidden="true">
                    {section.number}
                  </span>
                  <div>
                    <p className="gs-aux-kicker">{section.kicker}</p>
                    <h2 className="!m-0">{section.title}</h2>
                  </div>
                </div>
                <span className="gs-aux-icon-chip">
                  <Icon size={18} aria-hidden="true" />
                </span>
              </div>
              <p>{section.body}</p>
              <ul className="gs-aux-checklist">
                {section.points.map((point) => (
                  <li key={point}>
                    <CheckCircle2 aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        );
      })}

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div className="gs-aux-card-title-group">
              <span data-gs-ui="tag" className="gs-aux-step-num" aria-hidden="true">
                04
              </span>
              <div>
                <p className="gs-aux-kicker">외부 링크 및 개정</p>
                <h2 className="!m-0">제3자 플랫폼 링크 및 약관 업데이트</h2>
              </div>
            </div>
            <span className="gs-aux-icon-chip">
              <ExternalLink size={18} aria-hidden="true" />
            </span>
          </div>
          <p>
            GeoSub는 확인 편의를 위해 공식 웹사이트 및 앱 스토어 링크를 제공하며, 외부 서비스는 각자의 약관과 개인정보 처리방침에 따라 운영됩니다. 본 약관의 변경 사항은 이 페이지에 게시되는 즉시 효력이 발생합니다.
          </p>
          <div className="gs-aux-actions">
            <Link
              href="/ko/data-sources"
              className="gs-aux-primary-btn"
              data-gs-ui="button"
            >
              <FileText size={15} aria-hidden="true" />
              <span>데이터 출처 및 방법론 보기</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link
              href="/ko/privacy"
              className="gs-aux-secondary-btn"
              data-gs-ui="button"
            >
              <span>개인정보 처리방침</span>
            </Link>
            <Link
              href="/ko/contact"
              className="gs-aux-secondary-btn"
              data-gs-ui="button"
            >
              <span>문의하기</span>
            </Link>
          </div>
        </article>
      </section>

      <section>
        <div className="gs-aux-disclaimer">
          <AlertTriangle aria-hidden="true" />
          <p>
            <strong>중요 안내:</strong> GeoSub를 이용하는 것은 이러한 정보 범위를 이해했음을 의미합니다. 구독하기 전 반드시 공식 결제 화면에서 최종 금액, 세금 및 이용 자격을 확인하세요.
          </p>
        </div>
      </section>
    </AuxiliaryArticle>
  );
}
