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
  title: "Condiciones del servicio",
  description:
    "Consulta las condiciones de uso de GeoSub, incluido el alcance de sus comparativas de precios, las limitaciones informativas, los enlaces externos y las advertencias de facturación.",
  robots: getLocaleRobotsPolicy("es"),
};

const termsSections = [
  {
    number: "01",
    kicker: "Naturaleza del servicio",
    title: "Referencia independiente de precios, no asesoramiento ni afiliación",
    icon: Scale,
    body: "GeoSub ofrece referencias públicas de precios, comparativas regionales e información sobre suscripciones. No presta asesoramiento jurídico, financiero ni de compra, y opera como un servicio independiente no afiliado, patrocinado ni respaldado por las marcas mostradas.",
    points: [
      "Las tarifas mostradas, las conversiones cambiarias y los porcentajes de ahorro tienen carácter meramente informativo",
      "Las colaboraciones comerciales o editoriales se etiquetan explícitamente y nunca alteran rankings ni verificaciones",
    ],
  },
  {
    number: "02",
    kicker: "Prioridad del pago oficial",
    title: "Las páginas oficiales de pago y las reglas de cada plataforma rigen el cobro",
    icon: Landmark,
    body: "Al utilizar GeoSub entiendes que los datos constituyen una referencia pública. Las suscripciones entre regiones, el país de la cuenta, el medio de pago, los impuestos y los controles de riesgo pueden afectar a la disponibilidad. Las pantallas oficiales de pago y las normas de cada plataforma son siempre la fuente definitiva.",
    points: [
      "Las fluctuaciones de divisas, los impuestos locales o los cambios de tarifa sin previo aviso pueden variar el cargo final",
      "GeoSub nunca vende cuentas compartidas, recargas ni herramientas para eludir condiciones de servicio",
    ],
  },
  {
    number: "03",
    kicker: "Uso aceptable",
    title: "Citación adecuada e integridad del servicio",
    icon: ShieldCheck,
    body: "Lectores particulares, periodistas e investigadores pueden consultar y citar las comparativas de GeoSub indicando la atribución y la fecha de verificación.",
    points: [
      "Queda prohibido el raspado automatizado abusivo, las pruebas de denegación de servicio o cualquier interferencia en la disponibilidad del sitio",
      "Al citar cifras regionales, conserva la moneda local, el ciclo de facturación y la fecha de observación para mantener el rigor",
    ],
  },
] as const;

export default function SpanishTermsPage() {
  return (
    <AuxiliaryArticle
      locale="es"
      summaryTitle="Fuente autorizada"
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            Condiciones y límites informativos
          </span>
          <h1>Condiciones del servicio</h1>
          <p>
            Esta página detalla el alcance del servicio, los límites informativos, las normas de uso aceptable y las advertencias de pago aplicables al utilizar GeoSub.
          </p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">Fuente autorizada</p>
          <p>
            Todas las comparativas regionales, conversiones de moneda y notas fiscales son referencias informativas. Las pantallas oficiales de pago y las condiciones de cada plataforma rigen el cobro real y la elegibilidad.
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
                <p className="gs-aux-kicker">Enlaces externos y cambios</p>
                <h2 className="!m-0">Plataformas de terceros y actualizaciones</h2>
              </div>
            </div>
            <span className="gs-aux-icon-chip">
              <ExternalLink size={18} aria-hidden="true" />
            </span>
          </div>
          <p>
            GeoSub enlaza a sitios web oficiales y tiendas de aplicaciones para facilitar la comprobación; los servicios externos operan bajo sus propias condiciones y políticas de privacidad. Las actualizaciones de estas condiciones entran en vigor al publicarse en esta página.
          </p>
          <div className="gs-aux-actions">
            <Link
              href="/es/data-sources"
              className="gs-aux-primary-btn"
              data-gs-ui="button"
            >
              <FileText size={15} aria-hidden="true" />
              <span>Revisar fuentes de datos y metodología</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link
              href="/es/privacy"
              className="gs-aux-secondary-btn"
              data-gs-ui="button"
            >
              <span>Leer Política de privacidad</span>
            </Link>
            <Link
              href="/es/contact"
              className="gs-aux-secondary-btn"
              data-gs-ui="button"
            >
              <span>Contactar</span>
            </Link>
          </div>
        </article>
      </section>

      <section>
        <div className="gs-aux-disclaimer">
          <AlertTriangle aria-hidden="true" />
          <p>
            <strong>Importante:</strong> El uso de GeoSub implica la comprensión de estos límites informativos. Confirma siempre el precio final, los impuestos y los requisitos en la pantalla oficial de pago antes de suscribirte.
          </p>
        </div>
      </section>
    </AuxiliaryArticle>
  );
}
