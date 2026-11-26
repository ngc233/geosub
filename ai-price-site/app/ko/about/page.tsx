import AuxiliaryArticle from "../../../components/AuxiliaryArticle";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Database,
  Globe2,
  Scale,
  SearchCheck,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getLocaleRobotsPolicy } from "../../../lib/seo-indexing-policy";

export const metadata: Metadata = {
  title: "GeoSub 소개",
  description:
    "GeoSub는 전 세계 AI 및 스트리밍 구독의 공개 가격을 환율 기준일, 세금 안내, 업데이트 날짜 및 소득 부담 맥락과 함께 비교합니다.",
  robots: getLocaleRobotsPolicy("ko"),
};

const valueCards = [
  {
    title: "국가·지역 간 투명한 비교",
    desc: "현지 통화 원가를 그대로 보존하면서 일관된 환율 기준을 적용해 국가 간 가격 차이를 투명하게 보여 줍니다.",
    icon: Globe2,
  },
  {
    title: "추적 가능한 검증 근거",
    desc: "공개되는 모든 가격에 출처 스토어, 확인 날짜, 가입 조건을 함께 남기며 검증되지 않은 추정치를 사실처럼 표시하지 않습니다.",
    icon: SearchCheck,
  },
  {
    title: "명확한 구매 조건 안내",
    desc: "가격 비교와 함께 세금 규정, 계정 국가 제한, 결제 수단 조건, 요금제 제공 여부를 나란히 안내합니다.",
    icon: ShieldCheck,
  },
] as const;

const workflow = [
  {
    title: "공개 스토어 가격 기록",
    desc: "글로벌 국가·지역의 공식 App Store 구독 요금과 지원 서비스의 공식 웹 정가를 기록합니다.",
    icon: Database,
  },
  {
    title: "일관성 및 이상치 검증",
    desc: "통화 코드, 결제 주기, 대상 지역과 날짜를 대조해 이상치나 상충하는 관측값은 공개를 보류합니다.",
    icon: BookOpenCheck,
  },
  {
    title: "설명 가능한 비교 데이터 제공",
    desc: "현지 표시 가격, 미국 달러 기준가, 근로시간 기준 체감 부담과 결제 조건을 함께 제시합니다.",
    icon: Scale,
  },
] as const;

export default function KoreanAboutPage() {
  return (
    <AuxiliaryArticle
      locale="ko"
      summaryTitle="편집 기준"
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            GeoSub 소개 · 독립 구독 가격 인텔리전스
          </span>
          <h1>전 세계 구독 가격을 검증 가능한 비교 맥락으로 정리합니다.</h1>
          <p>
            GeoSub는 국가별 공개 AI 및 스트리밍 구독 가격을 환율, 세금 안내, 업데이트 날짜, 현지 체감 부담과 함께 비교할 수 있도록 정리하는 독립 데이터 서비스입니다.
          </p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">편집 기준</p>
          <p>
            지역별 가격은 출처, 확인 날짜, 통화와 결제 조건을 모두 설명할 수 있을 때만 비교할 가치가 있습니다.
          </p>
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">해결하고자 하는 문제</p>
          <h2>시장마다 흩어진 가격 정보, 추측에 의존하지 않는 비교</h2>
          <p>
            국가와 통화별로 다른 App Store 구독 가격을 일관된 기준으로 정리해 지역 간 가격 차이, 요금제 변동과 구독 조건을 쉽게 이해할 수 있도록 돕습니다.
          </p>
        </div>
        <div className="gs-aux-stack">
          {valueCards.map((item) => {
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
          <p className="gs-aux-kicker">검증 프로세스</p>
          <h2>공개 요금에서 신뢰할 수 있는 비교까지</h2>
          <p>
            각 가격은 현지 통화, 확인 날짜, 환율 기준일을 그대로 유지합니다. 일관성 검사를 통과한 지역 가격만 게시하며 계정 국가, 결제 수단, 세금과 공식 결제 금액을 함께 확인하도록 안내합니다.
          </p>
        </div>
        <div className="gs-aux-stack">
          {workflow.map((item, index) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="gs-aux-block">
                <div className="gs-aux-card-top">
                  <div className="gs-aux-card-title-group">
                    <span data-gs-ui="tag" className="gs-aux-step-num" aria-hidden="true">
                      0{index + 1}
                    </span>
                    <h3>{item.title}</h3>
                  </div>
                  <span className="gs-aux-icon-chip">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                </div>
                <p>{item.desc}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="gs-aux-grid-2">
          <article className="gs-aux-block">
            <div className="gs-aux-card-top">
              <div className="gs-aux-card-title-group">
                <span className="gs-aux-icon-chip">
                  <BadgeDollarSign size={18} aria-hidden="true" />
                </span>
                <h2 className="!m-0">독립성 원칙</h2>
              </div>
            </div>
            <p>
              후원이나 제휴가 있는 경우 명확히 표시합니다. 상업적 대가가 지역별 가격 순위, 검증 기준 또는 편집 판단을 바꾸는 일은 절대 없습니다.
            </p>
          </article>

          <article className="gs-aux-block">
            <div className="gs-aux-card-top">
              <div className="gs-aux-card-title-group">
                <span className="gs-aux-icon-chip">
                  <Users size={18} aria-hidden="true" />
                </span>
                <h2 className="!m-0">누구를 위한 서비스인가요</h2>
              </div>
            </div>
            <ul className="gs-aux-checklist">
              <li>
                <CheckCircle2 aria-hidden="true" />
                <span>국가별 AI 및 스트리밍 요금제 비용을 비교하는 개인 이용자</span>
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" />
                <span>디지털 서비스 가격 전략을 분석하는 언론인 및 연구자</span>
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" />
                <span>글로벌 구독 요금 체계를 벤치마킹하는 프로덕트·그로스 팀</span>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div>
              <p className="gs-aux-kicker">지속적인 검증</p>
              <h2 className="!m-0">가격은 바뀌어도 검증 기준은 투명하게 유지됩니다</h2>
            </div>
            <span className="gs-aux-icon-chip">
              <Clock3 size={18} aria-hidden="true" />
            </span>
          </div>
          <p>
            국가별 스토어 정가, 환율 기준일 및 가격 변동 내역이 어떻게 검증되는지 확인하거나, 문의 페이지를 통해 데이터 오류 제보를 보내 주세요.
          </p>
          <div className="gs-aux-actions">
            <Link
              href="/ko/data-sources"
              className="gs-aux-primary-btn"
              data-gs-ui="button"
            >
              <span>데이터 출처 및 방법론</span>
              <ArrowRight size={15} aria-hidden="true" />
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
    </AuxiliaryArticle>
  );
}
