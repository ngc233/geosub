import type { ReactNode } from "react";
import PublicIcon from "./PublicIcon";
import type { CanvasLocale } from "../lib/canvas-ui-copy";

export default function CountryDataDisclosure({
  children,
  locale = "zh",
}: {
  children: ReactNode;
  locale?: CanvasLocale;
}) {
  return (
    <details className="gs-country-evidence">
      <summary className="gs-disclosure-header">
        {locale === "en" ? "Methodology & data sources" : "数据说明与来源"}
        <PublicIcon name="ChevronDown" className="gs-disclosure-chevron" size={16} />
      </summary>
      <div className="gs-country-evidence-content">{children}</div>
    </details>
  );
}
