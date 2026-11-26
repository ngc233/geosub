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
  title: "Política de privacidad",
  description:
    "Esta página explica cómo gestiona GeoSub los totales diarios sin identificadores, la analítica sujeta a consentimiento y las consultas enviadas por los usuarios.",
  robots: getLocaleRobotsPolicy("es"),
};

const principles = [
  {
    title: "Consulta pública sin cuenta",
    desc: "Comparar precios regionales nunca requiere tu nombre, documento de identidad, datos bancarios ni credenciales de tienda.",
    icon: EyeOff,
  },
  {
    title: "Analítica solo si tú lo eliges",
    desc: "La medición basada en identificadores funciona únicamente cuando la aceptas y puede revocarse en cualquier momento.",
    icon: Cookie,
  },
  {
    title: "Consultas de soporte confidenciales",
    desc: "Las solicitudes enviadas se utilizan exclusivamente para verificar y responder tu mensaje, nunca para publicidad ni publicación.",
    icon: LockKeyhole,
  },
] as const;

const dataScopes = [
  {
    title: "Totales diarios sin identificadores",
    desc: "Recuentos agregados UTC sin leer ni guardar cookies ni crear identificadores de visitante.",
    icon: BarChart3,
  },
  {
    title: "Diagnóstico propio",
    desc: "Eventos anónimos de interacción y fiabilidad registrados solo tras el consentimiento correspondiente.",
    icon: Database,
  },
  {
    title: "Medición de terceros",
    desc: "Google Analytics o Google Tag Manager se ejecuta estrictamente después de que elijas aceptarlo.",
    icon: Cookie,
  },
  {
    title: "Solicitudes voluntarias",
    desc: "Los datos de contacto enviados en formularios sirven únicamente para tramitar correcciones o solicitudes de privacidad.",
    icon: Mail,
  },
] as const;

export default function SpanishPrivacyPage() {
  return (
    <AuxiliaryArticle
      locale="es"
      summaryTitle="Compromiso esencial"
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            Privacidad y minimización de datos · Actualizado el 22 ago 2026
          </span>
          <h1>Los datos deben ayudarte a comparar precios, nunca a rastrearte por la web.</h1>
          <p>
            Esta política explica con claridad qué registra GeoSub, con qué finalidad, durante cuánto tiempo se conserva y cómo cambiar tus preferencias de analítica en cualquier momento.
          </p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">Compromiso esencial</p>
          <p>
            GeoSub nunca vende información personal identificable ni permite que acuerdos comerciales influyan en los rankings regionales o en las reglas de verificación.
          </p>
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">Reglas fundamentales</p>
          <h2>Tres principios de privacidad por defecto</h2>
          <p>Las comparativas públicas siguen siendo accesibles sin registros obligatorios ni perfiles ocultos.</p>
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
          <p className="gs-aux-kicker">Categorías de datos</p>
          <h2>Señales distintas mantenidas estrictamente por separado</h2>
          <p>Los recuentos diarios sin identificadores, la analítica consentida y las consultas de soporte operan con límites independientes.</p>
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
        <PrivacyDisclosure locale="es" articleLayout />
      </section>

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div>
              <p className="gs-aux-kicker">Tus opciones</p>
              <h2 className="!m-0">Gestiona tus preferencias de analítica en cualquier momento</h2>
            </div>
            <span className="gs-aux-icon-chip">
              <ShieldCheck size={18} aria-hidden="true" />
            </span>
          </div>
          <p>
            Vuelve a abrir aquí abajo el cuadro de preferencias de analítica y cookies para aceptar o rechazar la medición no esencial. Al rechazarla, GeoSub detiene de inmediato la analítica opcional y borra su sesión.
          </p>
          <div className="gs-aux-actions">
            <AnalyticsConsentButton locale="es" variant="primary" />
            <Link
              href="/es/contact"
              className="gs-aux-secondary-btn"
              data-gs-ui="button"
            >
              <span>Enviar consulta de privacidad</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </article>
      </section>
    </AuxiliaryArticle>
  );
}
