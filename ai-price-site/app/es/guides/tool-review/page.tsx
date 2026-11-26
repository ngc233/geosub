import type { Metadata } from "next";
import PublicGuidePage from "../../../../components/PublicGuidePage";
import {
  getDefaultArticleQuickTools,
  getGuideHubCopy,
  getSiblingCoreGuideLinks,
} from "../../../../lib/guide-hub-copy";
import { getLocaleRobotsPolicy } from "../../../../lib/seo-indexing-policy";

export const metadata: Metadata = {
  title: "Análisis de herramientas digitales",
  description:
    "Evalúa herramientas digitales según casos de uso reales, límites técnicos, coste total, disponibilidad regional y fecha de las pruebas.",
  robots: getLocaleRobotsPolicy("es"),
};

export default function SpanishToolReviewPage() {
  const copy = getGuideHubCopy("es");
  return (
    <PublicGuidePage
      canvas
      locale="es"
      eyebrow={copy.toolReview.eyebrow}
      title={copy.toolReview.title}
      description={copy.toolReview.articleDescription}
      metadata={<span>{copy.coreArticleMeta(3, 3)}</span>}
      sections={[
        {
          title: "Parte de tus tareas reales y frecuentes",
          body: "Anota qué tareas repites a diario, qué capacidades son imprescindibles y qué límites no puedes asumir. Las herramientas de chat, programación, imagen, búsqueda y colaboración exigen criterios distintos.",
        },
        {
          title: "Compara el coste total, no solo el titular más barato",
          body: "Revisa ciclo de facturación, cuotas de uso, funciones incluidas, impuestos, cambio de divisa y disponibilidad en tu país. Un plan económico puede excluir justo la función que necesitas.",
        },
        {
          title: "Comprueba la fecha de la evidencia",
          body: "Los modelos, las ventajas de cada plan y las tarifas cambian con frecuencia. Verifica versión probada, fecha, método y pruebas reproducibles antes de dar por vigente una conclusión.",
        },
      ]}
      note="La decisión más fiable nace de probar tus propias tareas reales. Las puntuaciones y comparativas de precios sirven para acotar opciones, no para sustituir la prueba directa."
      relatedLabel={copy.articleContinueTitle}
      relatedLinks={getSiblingCoreGuideLinks("es", "tool-review")}
      quickTools={getDefaultArticleQuickTools("es", "tool-review")}
    />
  );
}
