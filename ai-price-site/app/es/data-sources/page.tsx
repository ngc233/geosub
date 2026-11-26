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
  title: "Fuentes de datos y metodología de precios",
  description:
    "Descubre cómo compara GeoSub precios regionales revisados de App Store y cómo presenta fechas de cambio, notas fiscales y nivel de confianza.",
  robots: getLocaleRobotsPolicy("es"),
};

const sourceLayers = [
  {
    number: "01",
    title: "Datos de precios",
    badge: "App Store",
    icon: Database,
    items: [
      "Precios públicos de suscripción en App Store para los países y regiones admitidos",
      "Tarifas web oficiales estándar de productos compatibles, separadas de los precios de App Store",
      "Registros estructurados por producto, plan, país y moneda original",
      "Solo las observaciones revisadas se incorporan a los rankings públicos",
    ],
  },
  {
    number: "02",
    title: "Conversión y comparación",
    badge: "Actualización periódica",
    icon: CircleDollarSign,
    items: [
      "Precios regionales convertidos a la moneda de visualización elegida",
      "Notas fiscales regionales y estado de verificación del dato",
      "Comparación frente a la base de EE. UU., dispersión de tarifas y avisos de contratación",
    ],
  },
  {
    number: "03",
    title: "Cómo leer las cifras",
    badge: "Prevalece la pantalla de pago",
    icon: Scale,
    items: [
      "Los precios locales originales y los importes convertidos se muestran por separado",
      "Las fechas de comprobación, tipo de cambio y revisión del plan se etiquetan de forma independiente",
      "La región de la cuenta, el método de pago y los impuestos pueden modificar el cargo final",
    ],
  },
] as const;

const qualityRules = [
  "Cada plan se comprueba por moneda original, ciclo de facturación, región y equivalencia en USD.",
  "Los importes fuera del rango habitual o con posibles errores de divisa o periodicidad se retienen para nueva verificación.",
  "Los rankings regionales utilizan únicamente precios verificados y comparables dentro del mismo plan.",
  "Las notas fiscales son informativas y no se vuelven a sumar sobre los precios del ranking; la pantalla oficial de pago sigue siendo la referencia definitiva.",
] as const;

export default function SpanishDataSourcesPage() {
  return (
    <AuxiliaryArticle
      locale="es"
      summaryTitle="Política de fuentes"
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            Transparencia y verificación de datos
          </span>
          <h1>Fuentes de datos y metodología de precios</h1>
          <p>
            GeoSub compara precios públicos regionales de App Store para el mismo plan y ciclo de facturación, conservando la moneda local, la fecha de comprobación y la base cambiaria.
          </p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">Política de fuentes</p>
          <p>
            Preferimos retener temporalmente una fila antes que rellenar huecos con tipos de cambio obsoletos, ciclos distintos o tarifas sin verificar.
          </p>
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">Arquitectura de datos</p>
          <h2>Fuentes, conversiones y condiciones de cobro bien diferenciadas</h2>
          <p>
            Cada cifra mostrada incluye tanto el valor convertido como la tarifa original de la tienda y las condiciones necesarias para que la comparación sea válida.
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
          <p className="gs-aux-kicker">Interpretación de datos</p>
          <h2>Tipos de cambio y tratamiento fiscal</h2>
          <p>
            Los tipos de referencia suelen sincronizarse cada 12 horas para convertir tarifas locales a la moneda seleccionada por el lector. Siempre se muestra la fecha aplicada y la conversión se detiene si falta un tipo o ha caducado.
          </p>
        </div>
        <div className="gs-aux-grid-2">
          <article className="gs-aux-block">
            <div className="gs-aux-card-top">
              <div className="gs-aux-card-title-group">
                <span className="gs-aux-icon-chip">
                  <CalendarClock size={18} aria-hidden="true" />
                </span>
                <h3>Fechas independientes para cada señal</h3>
              </div>
            </div>
            <p>
              Las fechas de comprobación de precio, revisión del plan y tipo de cambio tienen significados distintos y nunca se mezclan en una única marca temporal ambigua.
            </p>
          </article>
          <article className="gs-aux-block">
            <div className="gs-aux-card-top">
              <div className="gs-aux-card-title-group">
                <span className="gs-aux-icon-chip">
                  <Landmark size={18} aria-hidden="true" />
                </span>
                <h3>Sin doble cómputo de impuestos</h3>
              </div>
            </div>
            <p>
              No añadimos impuestos adicionales sobre los precios publicados por App Store en los rankings, ya que las tarifas de la tienda suelen reflejar la normativa local. El importe definitivo es el de la pantalla oficial de pago.
            </p>
          </article>
        </div>
      </section>

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div>
              <p className="gs-aux-kicker">Controles de calidad</p>
              <h2 className="!m-0">Las anomalías se aíslan antes de su publicación</h2>
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
              <p className="gs-aux-kicker">Auditoría y correcciones</p>
              <h2 className="!m-0">Consulta cambios recientes o envía una corrección</h2>
            </div>
            <span className="gs-aux-icon-chip">
              <FileSearch size={18} aria-hidden="true" />
            </span>
          </div>
          <p>
            Cada cambio de precio regional verificado registra el importe anterior y posterior en moneda local junto con su fecha. Si detectas una discrepancia, avísanos desde la página de contacto.
          </p>
          <div className="gs-aux-actions">
            <Link
              href="/es/price-history"
              className="gs-aux-primary-btn"
              data-gs-ui="button"
            >
              <span>Ver historial de cambios de precio</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link
              href="/es/contact"
              className="gs-aux-secondary-btn"
              data-gs-ui="button"
            >
              <span>Enviar corrección de datos</span>
            </Link>
          </div>
        </article>
      </section>

      <section>
        <div className="gs-aux-disclaimer">
          <AlertTriangle aria-hidden="true" />
          <p>
            <strong>Nota:</strong> GeoSub muestra diferencias públicas de precios con fines comparativos y no promueve eludir las normas de ninguna plataforma. Las suscripciones entre regiones dependen de la región de la cuenta, el medio de pago, la facturación, los impuestos y los controles de cada servicio.
          </p>
        </div>
      </section>
    </AuxiliaryArticle>
  );
}
