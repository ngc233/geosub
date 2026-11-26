import type { ReactNode } from "react";
import PublicIcon from "./PublicIcon";
import type { CanvasLocale } from "../lib/canvas-ui-copy";

const disclosureTitleByLocale: Record<CanvasLocale, string> = {
  zh: "数据说明与来源",
  "zh-tw": "資料說明與來源",
  en: "Methodology & data sources",
  ja: "データの算出方法と出典",
  ko: "데이터 기준 및 출처",
  es: "Metodología y fuentes de datos",
};

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
        {disclosureTitleByLocale[locale]}
        <PublicIcon name="ChevronDown" className="gs-disclosure-chevron" size={16} />
      </summary>
      <div className="gs-country-evidence-content">{children}</div>
    </details>
  );
}
