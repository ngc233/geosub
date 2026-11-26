"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { RotateCw } from "lucide-react";
import { useEffect } from "react";

const NotFoundView = dynamic(() => import("../../components/AuxiliaryNotFound"));

export function SpanishNotFound() {
  return <NotFoundView locale="es" />;
}

export default function SpanishError({
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
          <h1>Esta página no está disponible temporalmente</h1>
          <p>
            Ha ocurrido un problema al cargar la página y ya se ha registrado. Vuelve a intentarlo en unos instantes o explora otras páginas de precios.
          </p>
          <div className="gs-state-actions">
            <button type="button" data-gs-ui="button" onClick={onRetry}>
              Reintentar
            </button>
            <Link href="/es" data-gs-ui="button">
              Volver al inicio
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
