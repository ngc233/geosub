"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { RotateCw } from "lucide-react";
import { useEffect } from "react";

const NotFoundView = dynamic(() => import("../../components/AuxiliaryNotFound"));

export function KoreanNotFound() {
  return <NotFoundView locale="ko" />;
}

export default function KoreanError({
  error,
  reset,
  retry,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  retry?: () => void;
}) {
  useEffect(() => {
    if (document.querySelector("link[data-gs-state-styles]")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/styles/v7-auxiliary-states.css";
    link.dataset.gsStateStyles = "true";
    document.head.appendChild(link);
  }, []);
  useEffect(() => {
    console.error("[public-page-render-failed]", { type: "Error" });
  }, [error]);
  const onRetry = reset ?? retry ?? (() => window.location.reload());
  return (
    <div className="gs-public-unified gs-state-page">
      <section className="gs-state-panel gs-state-error">
        <span className="gs-state-error-icon" aria-hidden="true">
          <RotateCw size={24} strokeWidth={1.75} />
        </span>
        <div>
          <h1>페이지를 일시적으로 불러올 수 없습니다</h1>
          <p>
            페이지를 불러오는 중 오류가 발생하여 자동 기록되었습니다. 잠시 후 다시 시도하거나 다른 가격 비교 페이지를 확인해 보세요.
          </p>
          <div className="gs-state-actions">
            <button type="button" data-gs-ui="button" onClick={onRetry}>
              다시 시도
            </button>
            <Link href="/ko" data-gs-ui="button">
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
