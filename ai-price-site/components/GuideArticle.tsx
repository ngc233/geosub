import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { GuideContents, GuideCopyLink } from "./GuideReadingTools";
import GuideRelatedPrices from "./GuideRelatedPrices";
import type { GuideLink } from "../lib/guide-presentation";
export default function GuideArticle({ eyebrow, title, description, metadata, children, relatedLinks = [], relatedLabel = "相关阅读", tocEnabled = true }: {
  eyebrow: string; title: string; description?: string | null; metadata?: ReactNode; children: ReactNode; relatedLinks?: GuideLink[]; relatedLabel?: string; tocEnabled?: boolean;
}) {
  return <main className="gs-public-unified gs-guide-scope"><div className="gs-guide-article-layout pt-6 pb-10 md:pt-8 md:pb-18 flex flex-col md:grid items-start gap-10">
    <GuideContents enabled={tocEnabled}/>
    <article className="gs-guide-article min-w-0"><header><div className="gs-guide-breadcrumb mb-3.5 flex flex-wrap items-center gap-1.5"><Link href="/zh/guides">返回指南</Link><span aria-hidden="true">/</span><span>{eyebrow}</span></div><h1 className="font-bold">{title}</h1>{metadata && <div className="gs-guide-article-meta gap-y-2 gap-x-4.5 flex flex-wrap mb-7">{metadata}</div>}</header>
      {description && <aside className="gs-guide-summary p-5 md:px-5.5" data-guide-summary><strong>先说结论</strong><p className="mt-2.5" data-guide-description>{description}</p></aside>}
      {children}
    </article>
    <aside className="gs-guide-side w-full gap-3.5 min-w-0 flex flex-col"><Suspense fallback={null}><GuideRelatedPrices links={relatedLinks}/></Suspense><GuideCopyLink/></aside>
  </div>{relatedLinks.length > 0 && <section className="gs-guide-related pb-10 md:pb-18"><h2 className="mb-3.5">{relatedLabel}</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{relatedLinks.map((link, i) => <Link key={`${link.href}-${i}`} href={link.href} className="p-4.5" data-gs-motion-card><strong>{link.title}</strong>{link.description && <p className="gs-guide-caption mt-2">{link.description}</p>}</Link>)}</div></section>}</main>;
}
