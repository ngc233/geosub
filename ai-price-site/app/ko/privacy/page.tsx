import AuxiliaryArticle from "../../../components/AuxiliaryArticle";
import AnalyticsConsentButton from "../../../components/AnalyticsConsentButton";
import PrivacyDisclosure from "../../../components/PrivacyDisclosure";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Cookie,
  Database,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { getLocaleRobotsPolicy } from "../../../lib/seo-indexing-policy";

export const metadata: Metadata = {
  title: "개인정보 처리방침",
  description:
    "GeoSub가 식별자 없는 페이지 집계, 동의 기반 분석 이벤트 및 이용자 문의 티켓을 처리하는 방식과 설정 관리 방법을 안내합니다.",
  robots: getLocaleRobotsPolicy("ko"),
};

const principles = [
  {
    title: "계정 없이 자유로운 열람",
    desc: "지역별 가격을 비교할 때 이름, 신분증, 결제 정보 또는 스토어 계정 정보를 요구하지 않습니다.",
    icon: EyeOff,
  },
  {
    title: "선택에 따른 분석 실행",
    desc: "식별자를 사용하는 행동 분석은 이용자가 동의한 경우에만 동작하며 언제든 철회할 수 있습니다.",
    icon: Cookie,
  },
  {
    title: "비공개로 보호되는 문의 내역",
    desc: "제출된 문의 티켓은 요청 확인 및 답변 목적으로만 사용되며 외부 공개나 광고 프로파일링에 쓰이지 않습니다.",
    icon: LockKeyhole,
  },
] as const;

const dataScopes = [
  {
    title: "식별자 없는 일별 집계",
    desc: "쿠키를 읽거나 쓰지 않고 방문자 ID도 생성하지 않은 채 UTC 일별 페이지 조회 합계만 기록합니다.",
    icon: BarChart3,
  },
  {
    title: "자체 진단 및 상호작용 분석",
    desc: "익명 상호작용 및 안정성 진단 이벤트는 필요한 동의를 받은 뒤에만 기록됩니다.",
    icon: Database,
  },
  {
    title: "제3자 측정 도구",
    desc: "Google Analytics 또는 Google Tag Manager는 이용자가 허용을 선택한 후에만 실행됩니다.",
    icon: Cookie,
  },
  {
    title: "자발적 문의 티켓",
    desc: "양식에 입력한 연락처 정보는 가격 정정 검토나 개인정보 요청 처리를 위해서만 사용됩니다.",
    icon: Mail,
  },
] as const;

export default function KoreanPrivacyPage() {
  return (
    <AuxiliaryArticle
      locale="ko"
      summaryTitle="핵심 약속"
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            개인정보 보호 및 데이터 최소화 · 2026년 8월 22일 업데이트
          </span>
          <h1>데이터는 가격 비교를 돕기 위한 것이지, 웹 추적을 위한 것이 아닙니다.</h1>
          <p>
            이 방침은 GeoSub가 어떤 정보를 왜 기록하고 얼마나 보관하는지, 그리고 언제든지 분석 설정을 변경할 수 있는 방법을 알기 쉽게 설명합니다.
          </p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">핵심 약속</p>
          <p>
            GeoSub는 개인을 식별할 수 있는 정보를 판매하지 않으며, 상업적 제휴가 지역별 가격 순위나 검증 기준에 영향을 미치지 않도록 합니다.
          </p>
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">기본 원칙</p>
          <h2>기본값부터 지키는 3가지 프라이버시 원칙</h2>
          <p>모든 공개 가격 비교 페이지는 로그인 장벽이나 숨겨진 프로파일링 없이 열람할 수 있습니다.</p>
        </div>
        <div className="gs-aux-stack">
          {principles.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="gs-aux-block">
                <div className="gs-aux-card-top">
                  <div className="gs-aux-card-title-group">
                    <span className="gs-aux-icon-chip">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <h3>{item.title}</h3>
                  </div>
                </div>
                <p>{item.desc}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">데이터 범주</p>
          <h2>목적이 다른 신호의 엄격한 분리</h2>
          <p>식별자 없는 페이지 집계, 동의 기반 분석, 고객 문의는 각기 독립된 경계 안에서 처리됩니다.</p>
        </div>
        <div className="gs-aux-grid-2">
          {dataScopes.map((scope) => {
            const Icon = scope.icon;
            return (
              <article key={scope.title} className="gs-aux-block">
                <div className="gs-aux-card-top">
                  <div className="gs-aux-card-title-group">
                    <span className="gs-aux-icon-chip">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <h3>{scope.title}</h3>
                  </div>
                </div>
                <p>{scope.desc}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <PrivacyDisclosure locale="ko" articleLayout />
      </section>

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div>
              <p className="gs-aux-kicker">이용자 선택권</p>
              <h2 className="!m-0">언제든지 분석 환경설정 관리</h2>
            </div>
            <span className="gs-aux-icon-chip">
              <ShieldCheck size={18} aria-hidden="true" />
            </span>
          </div>
          <p>
            아래 버튼으로 분석 및 쿠키 설정 창을 바로 다시 열어 비필수 측정을 허용하거나 거부할 수 있습니다. 거부 시 비필수 분석이 즉시 중단되며 분석 세션이 삭제됩니다.
          </p>
          <div className="gs-aux-actions">
            <AnalyticsConsentButton locale="ko" variant="primary" />
            <Link
              href="/ko/contact"
              className="gs-aux-secondary-btn"
              data-gs-ui="button"
            >
              <span>개인정보 문의 접수</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </article>
      </section>
    </AuxiliaryArticle>
  );
}
