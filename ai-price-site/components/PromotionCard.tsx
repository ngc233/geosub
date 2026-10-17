import styles from "./ManagedContent.module.css";
import type { Draft } from "../lib/first-party-promotion";
export default function PromotionCard({ content, href, onActivate }: { content: Pick<Draft, "merchant" | "title" | "description" | "cta">; href?: string; onActivate?: (event: React.MouseEvent<HTMLAnchorElement>) => void }) {
  return <aside aria-label="自营推广" className={`${styles.scope} mx-auto w-full max-w-[1120px] break-words rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 text-[var(--color-text-primary)] [overflow-wrap:anywhere] sm:p-6`}>
    <p className="text-xs text-[var(--color-text-secondary)]">自营推广 · {content.merchant}</p>
    <h2 className="mt-2 text-lg font-semibold">{content.title}</h2>
    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--color-text-secondary)]">{content.description}</p>
    {href ? <a className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-[var(--color-border-default)] px-4 py-2 text-sm font-medium underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]" href={href} onClick={onActivate} rel="sponsored nofollow noopener" target="_blank" referrerPolicy="no-referrer">{content.cta}</a> : <span className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-[var(--color-border-default)] px-4 py-2 text-sm text-[var(--color-text-secondary)]">{content.cta}（预览不可跳转）</span>}
    <p className="mt-3 text-xs leading-6 text-[var(--color-text-secondary)]">推广信息独立于 GeoSub 价格比较，不代表相关平台的官方推荐或授权。</p>
  </aside>;
}
