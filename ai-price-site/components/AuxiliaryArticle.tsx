import AuxiliaryStyles from "./AuxiliaryStyles";
import type { ReactNode } from "react";
import { GuideContents } from "./GuideReadingTools";

/** Article canvas without guide-only breadcrumbs, related prices or query work. */
export default function AuxiliaryArticle({ children, contact = false }: { children: ReactNode; contact?: boolean }) {
  return <main className="gs-public-unified gs-aux-scope"><AuxiliaryStyles kind="article"/>{contact && <AuxiliaryStyles kind="contact"/>}
    <div className="gs-guide-article-layout gs-aux-layout">
      <GuideContents />
      <article className="gs-guide-article gs-guide-prose gs-aux-prose">{children}</article>
    </div>
  </main>;
}
