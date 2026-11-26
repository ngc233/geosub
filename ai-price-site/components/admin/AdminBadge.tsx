type AdminBadgeVariant =
  | "draft"
  | "review"
  | "published"
  | "archived"
  | "success"
  | "warning"
  | "info"
  | "danger"
  | "neutral";

const dotColor: Record<AdminBadgeVariant, string> = {
  published: "bg-admin-success",
  success: "bg-admin-success",
  review: "bg-admin-warning",
  warning: "bg-admin-warning",
  info: "bg-admin-accent",
  danger: "bg-admin-danger",
  draft: "bg-admin-text-faint",
  archived: "bg-admin-text-faint",
  neutral: "bg-admin-text-faint",
};

const pillStyle: Record<AdminBadgeVariant, string> = {
  published: "border-admin-border bg-admin-surface text-admin-text-body",
  success: "border-admin-success/30 bg-admin-success-soft text-admin-success",
  review: "border-admin-warning/30 bg-admin-warning-soft text-admin-warning",
  warning: "border-admin-warning/30 bg-admin-warning-soft text-admin-warning",
  info: "border-admin-accent/30 bg-admin-accent-soft text-admin-accent",
  danger: "border-admin-danger/30 bg-admin-danger-soft text-admin-danger",
  draft: "border-admin-border bg-admin-surface-subtle text-admin-text-muted",
  archived: "border-admin-border bg-admin-surface-subtle text-admin-text-muted",
  neutral: "border-admin-border bg-admin-surface-subtle text-admin-text-secondary",
};

export function AdminBadge({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: AdminBadgeVariant;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 ${pillStyle[variant]}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dotColor[variant]}`} />
      {children}
    </span>
  );
}

export function statusBadgeVariant(status: string): AdminBadgeVariant {
  if (status === "PUBLISHED") return "published";
  if (status === "REVIEW") return "review";
  if (status === "ARCHIVED") return "archived";
  if (status === "DRAFT") return "draft";
  return "neutral";
}
