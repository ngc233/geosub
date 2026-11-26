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
  title: "Acerca de GeoSub",
  description:
    "GeoSub compara precios públicos de suscripciones de IA y streaming en distintos países, con tipos de cambio, notas fiscales, fechas de actualización y contexto de asequibilidad.",
  robots: getLocaleRobotsPolicy("es"),
};

const valueCards = [
  {
    title: "Comparación transparente entre regiones",
    desc: "Conserva la moneda local original mientras aplica una referencia cambiaria homogénea para mostrar las diferencias entre mercados.",
    icon: Globe2,
  },
  {
    title: "Evidencia verificable",
    desc: "Cada tarifa publicada mantiene su fuente de tienda, fecha de comprobación y notas de elegibilidad, sin presentar estimaciones no verificadas como hechos.",
    icon: SearchCheck,
  },
  {
    title: "Límites de compra claros",
    desc: "Detalla normas fiscales, restricciones de región de cuenta, métodos de pago y disponibilidad de planes junto a cada comparativa.",
    icon: ShieldCheck,
  },
] as const;

const workflow = [
  {
    title: "Recopilación de tarifas públicas",
    desc: "Seguimiento de precios oficiales de suscripción en App Store y tarifas web públicas de los servicios admitidos en múltiples regiones.",
    icon: Database,
  },
  {
    title: "Controles de coherencia",
    desc: "Verificación de códigos de divisa, ciclos de facturación, alcance regional y fechas, reteniendo observaciones anómalas o contradictorias.",
    icon: BookOpenCheck,
  },
  {
    title: "Comparativas explicables",
    desc: "Presentación conjunta de precios locales, referencias en USD, horas de trabajo locales equivalentes y condiciones de pago.",
    icon: Scale,
  },
] as const;

export default function SpanishAboutPage() {
  return (
    <AuxiliaryArticle
      locale="es"
      summaryTitle="Criterio editorial"
      header={
        <>
          <span className="gs-guide-eyebrow">
            <i aria-hidden="true" />
            Acerca de GeoSub · Inteligencia independiente de precios
          </span>
          <h1>Convertimos los precios globales de suscripción en contexto claro y verificable.</h1>
          <p>
            GeoSub compara precios públicos de suscripciones de IA y streaming entre países, con tipos de cambio, notas fiscales, fechas de actualización y contexto salarial local.
          </p>
        </>
      }
    >
      <section>
        <div className="gs-aux-note" data-guide-summary>
          <p className="gs-aux-eyebrow">Criterio editorial</p>
          <p>
            Un precio regional solo merece compararse cuando pueden explicarse su origen, su fecha de comprobación, su moneda y sus condiciones reales de contratación.
          </p>
        </div>
      </section>

      <section>
        <div className="gs-aux-section-head">
          <p className="gs-aux-kicker">El problema que resolvemos</p>
          <h2>Los precios están dispersos por mercados; compararlos no debería basarse en suposiciones</h2>
          <p>
            Organizamos precios de suscripción de App Store en distintos países y divisas para que las diferencias regionales, los cambios de tarifas y las opciones de contratación sean fáciles de entender.
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
          <p className="gs-aux-kicker">Proceso de verificación</p>
          <h2>De tarifas públicas a comparativas fiables</h2>
          <p>
            Cada precio conserva su moneda local, fecha de comprobación y fecha de referencia cambiaria. Solo publicamos tarifas regionales que superan controles de coherencia y recordamos verificar región de cuenta, medio de pago, impuestos e importe oficial antes de pagar.
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
                <h2 className="!m-0">Independencia ante todo</h2>
              </div>
            </div>
            <p>
              Cualquier patrocinio o colaboración se identifica de forma explícita. Ningún acuerdo comercial altera jamás los rankings regionales, los filtros de verificación ni las conclusiones editoriales.
            </p>
          </article>

          <article className="gs-aux-block">
            <div className="gs-aux-card-top">
              <div className="gs-aux-card-title-group">
                <span className="gs-aux-icon-chip">
                  <Users size={18} aria-hidden="true" />
                </span>
                <h2 className="!m-0">A quién sirve GeoSub</h2>
              </div>
            </div>
            <ul className="gs-aux-checklist">
              <li>
                <CheckCircle2 aria-hidden="true" />
                <span>Usuarios que comparan el coste de planes de IA y streaming entre países</span>
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" />
                <span>Periodistas e investigadores que analizan estrategias de precios digitales</span>
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" />
                <span>Equipos de producto y negocio que evalúan tarifas internacionales</span>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section>
        <article className="gs-aux-block">
          <div className="gs-aux-card-top">
            <div>
              <p className="gs-aux-kicker">Verificación continua</p>
              <h2 className="!m-0">Los precios cambian; la metodología sigue siendo transparente</h2>
            </div>
            <span className="gs-aux-icon-chip">
              <Clock3 size={18} aria-hidden="true" />
            </span>
          </div>
          <p>
            Consulta cómo verificamos tarifas regionales, tipos de cambio e historial de variaciones, o escríbenos si detectas algún cambio reciente.
          </p>
          <div className="gs-aux-actions">
            <Link
              href="/es/data-sources"
              className="gs-aux-primary-btn"
              data-gs-ui="button"
            >
              <span>Fuentes de datos y metodología</span>
              <ArrowRight size={15} aria-hidden="true" />
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
    </AuxiliaryArticle>
  );
}
