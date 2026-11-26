import AuxiliaryArticle from "../../../components/AuxiliaryArticle";
import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Database,
  FileSearch,
  Landmark,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { getLocaleRobotsPolicy } from "../../../lib/seo-indexing-policy";

export const metadata: Metadata = {
  title: "데이터 출처 및 가격 비교 방법론",
  description:
    "GeoSub가 검토된 App Store 지역별 구독 가격을 비교하고 환율 기준일, 세금 안내 및 데이터 신뢰도를 표시하는 방식을 설명합니다.",
  robots: getLocaleRobotsPolicy("ko"),
};

const sourceLayers = [
  {
    number: "01",
    title: "가격 데이터",
    badge: "App Store",
    icon: Database,
    items: [
      "지원 국가 및 지역의 공개 App Store 구독 가격",
      "지원 제품의 공식 웹 일반 정가(App Store 가격과 구분하여 표시)",
      "제품, 요금제, 국가 및 현지 통화 단위의 구조화된 기록",
      "검토를 통과한 관측값만 공개 순위에 반영",
    ],
  },
  {
    number: "02",
    title: "통화 환산 및 비교",
    badge: "정기 동기화",
    icon: CircleDollarSign,
    items: [
      "선택한 표시 통화로 지역별 가격 환산",
      "지역별 세금 안내 및 데이터 신뢰 상태 표시",
      "미국 기준가 대비 차이, 가격 분포 및 구독 유의사항 제공",
    ],
  },
  {
    number: "03",
    title: "수치 해석 원칙",
    badge: "결제 화면 우선",
    icon: Scale,
    items: [
      "현지 표시 정가와 환산 가격을 분리하여 표시",
      "가격 확인일, 환율 기준일, 요금제 검토일을 개별 표기",
      "계정 국가, 결제 수단, 세금에 따라 최종 청구액 변동 가능",
    ],
  },
] as const;

const qualityRules = [
  "모든 요금제는 원본 통화, 결제 주기, 지역 및 미국 달러 환산가를 기준으로 일관성을 점검합니다.",
  "일반적인 범위를 크게 벗어나거나 통화·소수점·결제 주기 오류가 의심되는 가격은 보류 후 재검토합니다.",
  "지역별 순위에는 검사를 통과하고 동일 요금제로 직접 비교 가능한 가격만 사용합니다.",
  "세금 안내는 참고 정보이며 순위 가격에 세율을 중복 합산하지 않습니다. 최종 결제 화면 금액이 기준입니다.",
] as const;

export default function KoreanDataSourcesPage() {
  return (
    <AuxiliaryArticle
      locale="ko"
      summaryTitle="데이터 원칙"
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            데이터 투명성 및 검증 기준
          </span>
          <h1>데이터 출처 및 가격 비교 방법론</h1>
          <p>
            GeoSub는 동일한 요금제와 결제 주기를 기준으로 공개 App Store 지역별 구독 가격을 비교하며, 현지 통화와 확인 날짜, 환율 기준일을 함께 보존합니다.
          </p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">데이터 원칙</p>
          <p>
            오래된 환율 스냅샷, 맞지 않는 결제 주기, 검증되지 않은 금액으로 빈칸을 채우기보다 해당 행을 일시적으로 비우는 원칙을 지킵니다.
          </p>
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">데이터 구조</p>
          <h2>출처, 환산값, 결제 조건의 명확한 분리</h2>
          <p>
            화면의 모든 수치는 환산 금액뿐만 아니라 비교가 성립하기 위한 원래 스토어 정가와 전제 조건을 함께 보여 줍니다.
          </p>
        </div>
        <div className="gs-aux-stack">
          {sourceLayers.map((layer) => {
            const Icon = layer.icon;
            return (
              <article key={layer.title} className="gs-aux-block">
                <div className="gs-aux-card-top">
                  <div className="gs-aux-card-title-group">
                    <span data-gs-ui="tag" className="gs-aux-step-num" aria-hidden="true">
                      {layer.number}
                    </span>
                    <h3>{layer.title}</h3>
                    <span className="gs-aux-badge">{layer.badge}</span>
                  </div>
                  <span className="gs-aux-icon-chip">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                </div>
                <ul className="gs-aux-checklist">
                  {layer.items.map((item) => (
                    <li key={item}>
                      <CheckCircle2 aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">데이터 읽는 법</p>
          <h2>환율 적용 및 세금 처리 기준</h2>
          <p>
            기준 환율은 보통 12시간마다 동기화되어 현지 가격을 독자가 선택한 통화로 환산합니다. 적용된 환율 날짜를 명시하며, 필요한 환율이 누락되었거나 만료된 경우 해당 환산을 일시 중지합니다.
          </p>
        </div>
        <div className="gs-aux-grid-2">
          <article className="gs-aux-block">
            <div className="gs-aux-card-top">
              <div className="gs-aux-card-title-group">
                <span className="gs-aux-icon-chip">
                  <CalendarClock size={18} aria-hidden="true" />
                </span>
                <h3>신호별로 분리된 날짜 표기</h3>
              </div>
            </div>
            <p>
              가격 확인일, 요금제 검토일, 환율 기준일은 각각 고유한 의미를 가지며 모호한 하나의 업데이트 날짜로 합치지 않습니다.
            </p>
          </article>
          <article className="gs-aux-block">
            <div className="gs-aux-card-top">
              <div className="gs-aux-card-title-group">
                <span className="gs-aux-icon-chip">
                  <Landmark size={18} aria-hidden="true" />
                </span>
                <h3>세금 중복 가산 금지</h3>
              </div>
            </div>
            <p>
              App Store 표시 가격에는 이미 현지 가격 정책이 반영된 경우가 많으므로 순위 가격 위에 임의로 세금을 다시 더하지 않습니다. 최종 세액은 공식 결제 화면을 따릅니다.
            </p>
          </article>
        </div>
      </section>

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div>
              <p className="gs-aux-kicker">품질 관리</p>
              <h2 className="!m-0">이상 징후 데이터는 공개 전 격리</h2>
            </div>
            <span className="gs-aux-icon-chip">
              <ShieldCheck size={18} aria-hidden="true" />
            </span>
          </div>
          <ul className="gs-aux-checklist">
            {qualityRules.map((rule) => (
              <li key={rule}>
                <BadgeCheck aria-hidden="true" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div>
              <p className="gs-aux-kicker">검증 및 정정 제보</p>
              <h2 className="!m-0">실시간 가격 변동 내역 확인 및 제보</h2>
            </div>
            <span className="gs-aux-icon-chip">
              <FileSearch size={18} aria-hidden="true" />
            </span>
          </div>
          <p>
            게시된 모든 지역 가격 변동은 변경 전후 현지 통화 금액과 확인 시각이 기록됩니다. 표시된 정보에 차이가 있다면 문의 페이지로 알려 주세요.
          </p>
          <div className="gs-aux-actions">
            <Link
              href="/ko/price-history"
              className="gs-aux-primary-btn"
              data-gs-ui="button"
            >
              <span>가격 변동 내역 보기</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link
              href="/ko/contact"
              className="gs-aux-secondary-btn"
              data-gs-ui="button"
            >
              <span>데이터 정정 요청</span>
            </Link>
          </div>
        </article>
      </section>

      <section>
        <div className="gs-aux-disclaimer">
          <AlertTriangle aria-hidden="true" />
          <p>
            <strong>유의사항:</strong> GeoSub는 비교를 위해 공개 가격 차이를 보여 주며 플랫폼 규정 우회를 권장하지 않습니다. 국가 간 구독은 계정 지역, 결제 수단, 청구지 정보, 세금 및 플랫폼 정책의 영향을 받을 수 있습니다.
          </p>
        </div>
      </section>
    </AuxiliaryArticle>
  );
}
