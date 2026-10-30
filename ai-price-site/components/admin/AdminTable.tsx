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
    <div className="overflow-hidden rounded-admin-card border border-admin-border bg-admin-surface shadow-admin-card">
      {title || description ? (
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-admin-border px-6 py-5">
          <div>
            {title ? <h2 className="text-base font-semibold text-admin-text">{title}</h2> : null}
            {description ? (
              <p className="mt-1 text-sm leading-6 text-admin-text-muted">{description}</p>
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
    <table className={`min-w-full divide-y divide-admin-border text-sm ${className}`}>
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
    <thead className="bg-admin-surface-head text-left text-xs font-medium tracking-wide text-admin-text-muted">
      {children}
    </thead>
  );
}

export function AdminTableBody({
  children,
}: {
  children: ReactNode;
}) {
  return <tbody className="divide-y divide-admin-border bg-admin-surface">{children}</tbody>;
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
  return <tr className="transition hover:bg-admin-row-hover">{children}</tr>;
}
