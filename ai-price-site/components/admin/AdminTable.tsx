import type { ReactNode } from "react";

export function AdminTableShell({
  title,
  description,
  action,
  children,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
      {title || description ? (
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div>
            {title ? <h2 className="font-bold text-slate-950 dark:text-slate-50">{title}</h2> : null}
            {description ? (
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}

      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function AdminTable({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <table className={`min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800 ${className}`}>
      {children}
    </table>
  );
}

export function AdminTableHead({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
      {children}
    </thead>
  );
}

export function AdminTableBody({
  children,
}: {
  children: ReactNode;
}) {
  return <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">{children}</tbody>;
}

export function AdminTh({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
}) {
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  return <th className={`whitespace-nowrap px-6 py-4 ${alignClass}`}>{children}</th>;
}

export function AdminTd({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
}) {
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  return <td className={`px-6 py-5 align-middle ${alignClass}`}>{children}</td>;
}

export function AdminTr({
  children,
}: {
  children: ReactNode;
}) {
  return <tr className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60">{children}</tr>;
}
