import Link from "next/link";
import { CircleHelp } from "lucide-react";
import type { ReactNode } from "react";
import GuideCards from "./GuideCards";
import type { GuideCard } from "../lib/guide-presentation";
export default function GuideCollection({ eyebrow, title, description, cards, emptyText, showBack = true, steps = [], navigation }: {
  eyebrow: string; title: string; description?: string | null; cards: GuideCard[]; emptyText: string; showBack?: boolean; steps?: GuideCard[]; navigation?: ReactNode;
}) {
  return <main className="gs-public-unified gs-guide-scope"><div className="gs-guide-index pt-6 pb-10 gap-6 md:pt-10 md:pb-18 md:gap-9 flex flex-col">
    {steps.length > 0 && <link rel="preload" href={new URL("../assets/fonts/web/geosub-price-numerals-700.woff2", import.meta.url).href} as="font" type="font/woff2" crossOrigin="anonymous"/>}
    <header className="gs-guide-index-intro">{showBack && <Link href="/zh/guides" className="inline-flex items-center">返回指南</Link>}<span className="gs-sr-only">{eyebrow}</span><h1 className="mb-2.5">{title}</h1>{description && <p>{description}</p>}</header>
    {steps.length > 0 && <section className="gs-guide-start p-4 md:p-6"><h2>第一次买外区订阅？从这里开始</h2><div className="gs-guide-steps grid grid-cols-1 md:grid-cols-3 gap-3">{steps.map((step, index) => <Link key={step.href} href={step.href} className="gs-guide-step gap-3.5 flex items-start p-4" data-gs-motion-card><span className="gs-guide-step-number basis-8 shrink-0 inline-flex items-center justify-center h-8" aria-hidden="true">{index + 1}</span><span><strong className="leading-normal">{step.title}</strong>{step.description && <small className="gs-guide-caption block mt-1 leading-normal">{step.description}</small>}</span></Link>)}</div></section>}
    <GuideCards cards={cards} emptyText={emptyText}/>{navigation}
    <aside className="gs-guide-contact p-5 md:py-5.5 md:px-6.5 flex-wrap md:flex-nowrap flex items-center gap-5"><CircleHelp size={24} aria-hidden="true"/><div className="flex-1"><strong>没找到你要的？</strong><p className="mt-0.5">告诉我们你卡在哪一步。</p></div><Link href="/zh/contact" className="w-full md:w-auto justify-center" data-gs-ui="button">联系我们</Link></aside>
  </div></main>;
}
