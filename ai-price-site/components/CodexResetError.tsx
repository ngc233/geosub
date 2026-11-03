"use client";

import { PublicSection } from "./ui/PublicPage";
import { resetCopy } from "../lib/codex-reset-presentation";
import type { ResetLocale } from "../lib/codex-reset";
import { PublicButton, PublicCard } from "./ui/PublicControls";
import styles from "./CodexResetUnified.module.css";

export default function CodexResetError({ locale, retry }: { locale: ResetLocale; retry: () => void }) {
  const copy = resetCopy[locale];
  if (locale === "zh") return <main className={styles.tracker} data-gs-codex="error"><PublicCard className={styles.state}><h1>{copy.error}</h1><p role="alert">{copy.errorDetail}</p><PublicButton variant="secondary" onClick={retry}>{copy.retry}</PublicButton></PublicCard></main>;
  return <div className="mx-auto max-w-5xl px-4 py-8 text-zinc-950 dark:text-zinc-100 sm:px-6">
    <PublicSection className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">{copy.error}</h1>
      <p role="alert" className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{copy.errorDetail}</p>
      <button type="button" onClick={retry}
        className="min-h-11 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium focus-visible:outline-2 dark:border-zinc-700">
        {copy.retry}
      </button>
    </PublicSection>
  </div>;
}
