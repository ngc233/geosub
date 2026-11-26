"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { RotateCw } from "lucide-react";
import { useEffect } from "react";

const NotFoundView = dynamic(() => import("../../components/AuxiliaryNotFound"));

export function EnglishNotFound() {
  return <NotFoundView locale="en" />;
}

export default function EnglishError({
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
          <h1>This page is temporarily unavailable</h1>
          <p>
            Something went wrong while loading this page and the issue has been logged. Please retry in a moment or explore other pricing pages.
          </p>
          <div className="gs-state-actions">
            <button type="button" data-gs-ui="button" onClick={onRetry}>
              Try again
            </button>
            <Link href="/en" data-gs-ui="button">
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
