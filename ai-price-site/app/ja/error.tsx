"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { RotateCw } from "lucide-react";
import { useEffect } from "react";

const NotFoundView = dynamic(() => import("../../components/AuxiliaryNotFound"));

export function JapaneseNotFound() {
  return <NotFoundView locale="ja" />;
}

export default function JapaneseError({
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
          <h1>このページを一時的に表示できません</h1>
          <p>
            ページの読み込み中に問題が発生し、自動的に記録されました。しばらくしてから再試行するか、他の料金ページをご覧ください。
          </p>
          <div className="gs-state-actions">
            <button type="button" data-gs-ui="button" onClick={onRetry}>
              再読み込み
            </button>
            <Link href="/ja" data-gs-ui="button">
              ホームに戻る
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
