"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { RotateCw } from "lucide-react";
import { useEffect } from "react";

const NotFoundView = dynamic(() => import("../../components/AuxiliaryNotFound"));

export function TraditionalChineseNotFound() {
  return <NotFoundView locale="zh-tw" />;
}

export default function TraditionalChineseError({
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
          <h1>這個頁面暫時無法開啟</h1>
          <p>
            載入頁面時發生問題，系統已自動記錄。請稍後重新整理，或先瀏覽其他訂閱比價頁面。
          </p>
          <div className="gs-state-actions">
            <button type="button" data-gs-ui="button" onClick={onRetry}>
              重新載入
            </button>
            <Link href="/zh-tw" data-gs-ui="button">
              返回首頁
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
