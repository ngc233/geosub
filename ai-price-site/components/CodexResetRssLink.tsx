"use client";

import { useState } from "react";
import { Copy, Rss } from "lucide-react";
import type { ResetLocale } from "../lib/codex-reset";
import { PublicTextButton } from "./ui/PublicControls";
import styles from "./CodexResetUnified.module.css";

export default function CodexResetRssLink({ locale, url, publicStyle = false }: { locale: ResetLocale; url: string; publicStyle?:boolean }) {
  const [result, setResult] = useState<"idle" | "copied" | "manual">("idle");
  const [busy, setBusy] = useState(false);
  const labels = locale === "zh"
    ? { subscribe: "订阅 RSS", copy: "复制 RSS 链接", copied: "RSS 链接已复制", manual: "请选中下方链接手动复制", copying: "复制中……" }
    : { subscribe: "Subscribe via RSS", copy: "Copy RSS link", copied: "RSS link copied", manual: "Select the link below to copy it manually", copying: "Copying…" };
  async function copy() {
    setBusy(true);
    try { await navigator.clipboard.writeText(url); setResult("copied"); }
    catch { setResult("manual"); }
    finally { setBusy(false); }
  }
  if (publicStyle) return <div className={styles.rss} data-codex-rss><div><a href={url}><Rss aria-hidden="true"/>{labels.subscribe}</a><PublicTextButton onClick={copy} disabled={busy}><Copy aria-hidden="true"/>{busy?labels.copying:labels.copy}</PublicTextButton></div><p aria-live="polite">{result==="copied"?labels.copied:result==="manual"?labels.manual:""}</p>{result==="manual"&&<input readOnly aria-label={labels.copy} value={url} onFocus={event=>event.target.select()}/>}</div>;
  return <div>
    <div className="flex flex-wrap gap-2">
      <a href={url} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700">
        <Rss size={16} aria-hidden="true"/>{labels.subscribe}
      </a>
      <button type="button" onClick={copy} disabled={busy}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm underline underline-offset-4 disabled:opacity-60">
        <Copy size={15} aria-hidden="true"/>{busy ? labels.copying : labels.copy}
      </button>
    </div>
    <p aria-live="polite" className="mt-1 text-sm">{result === "copied" ? labels.copied : result === "manual" ? labels.manual : ""}</p>
    {result === "manual" && <input readOnly aria-label={labels.copy} value={url} onFocus={(event) => event.target.select()}
      className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 bg-transparent px-3 text-sm dark:border-zinc-700"/>}
  </div>;
}
