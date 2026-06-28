import type { ReactNode } from "react";

export function AdminTableShell({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
      {title || description ? (
        <div className="border-b border-slate-200 px-6 py-5">
          {title ? <h2 className="font-bold text-slate-950">{title}</h2> : null}
          {description ? (
            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function AdminTable({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <table className="min-w-full divide-y divide-slate-200 text-sm">
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
    <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
      {children}
    </thead>
  );
}

export function AdminTableBody({
  children,
}: {
  children: ReactNode;
}) {
  return <tbody className="divide-y divide-slate-200 bg-white">{children}</tbody>;
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

  return <th className={`px-6 py-4 ${alignClass}`}>{children}</th>;
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
  return <tr className="transition hover:bg-slate-50">{children}</tr>;
}
