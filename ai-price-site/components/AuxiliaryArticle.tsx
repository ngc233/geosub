import AuxiliaryStyles from "./AuxiliaryStyles";
import type { ReactNode } from "react";
import { GuideContents } from "./GuideReadingTools";
import type { CanvasLocale } from "../lib/canvas-ui-copy";

const defaultSummaryTitleByLocale: Record<CanvasLocale, string> = {
  zh: "核心原则",
  en: "Overview",
  "zh-tw": "核心原則",
  ja: "基本方針",
  ko: "핵심 원칙",
  es: "Principios clave",
};

/** Article canvas for trust & methodology pages without guide-only query work. */
export default function AuxiliaryArticle({
  children,
  header,
  summaryTitle,
  contact = false,
  locale = "zh",
}: {
  children: ReactNode;
  header?: ReactNode;
  summaryTitle?: string;
  contact?: boolean;
  locale?: CanvasLocale;
}) {
  return (
    <div className="gs-public-unified gs-aux-scope">
      <AuxiliaryStyles kind="article" />
      {contact && <AuxiliaryStyles kind="contact" />}
      <div
        className="gs-guide-article-layout gs-aux-layout"
        data-has-header={header ? "true" : undefined}
      >
        {header && <header className="gs-aux-header min-w-0">{header}</header>}
        <GuideContents
          locale={locale}
          includeH3={false}
          summaryTitle={summaryTitle ?? defaultSummaryTitleByLocale[locale]}
        />
        <article className="gs-guide-article gs-guide-prose gs-aux-prose">{children}</article>
      </div>
    </div>
  );
}
