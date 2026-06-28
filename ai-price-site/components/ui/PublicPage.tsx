import type { ReactNode } from "react";

type Tone = "neutral" | "green" | "red" | "amber";

function toneTextClass(tone: Tone) {
  if (tone === "green") return "text-lime-700 dark:text-lime-300";
  if (tone === "red") return "text-rose-600 dark:text-rose-300";
  if (tone === "amber") return "text-amber-700 dark:text-amber-300";
  return "text-zinc-950 dark:text-white";
}

export function PublicSection({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

export function PublicSectionHeader({
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800 md:flex-row md:items-end md:justify-between md:px-6">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold leading-tight text-zinc-950 dark:text-white">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

export function MetricStrip({
  children,
  columns = 4,
}: {
  children: ReactNode;
  columns?: 3 | 4;
}) {
  const columnsClass = columns === 3 ? "md:grid-cols-3" : "md:grid-cols-4";

  return (
    <div
      className={[
        "grid border-t border-zinc-100 px-5 py-1 dark:border-zinc-800 md:divide-x md:divide-zinc-100 md:px-0 dark:md:divide-zinc-800",
        columnsClass,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function MetricItem({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="py-3 md:px-5">
      <div className="text-xs text-zinc-400">{label}</div>
      <div
        className={[
          "mt-1 text-lg font-semibold leading-tight tabular-nums",
          toneTextClass(tone),
        ].join(" ")}
      >
        {value}
      </div>
      {helper ? <div className="mt-1 text-xs text-zinc-400">{helper}</div> : null}
    </div>
  );
}

export function DataNote({ children }: { children: ReactNode }) {
  return (
    <div className="border-t border-zinc-100 px-5 py-4 text-xs leading-5 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 md:px-6">
      {children}
    </div>
  );
}
