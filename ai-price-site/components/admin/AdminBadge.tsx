type AdminBadgeVariant =
  | "draft"
  | "review"
  | "published"
  | "archived"
  | "danger"
  | "neutral";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function AdminBadge({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: AdminBadgeVariant;
}) {
  const variants = {
    draft: "bg-admin-chip text-admin-text-secondary",
    review: "bg-admin-warning-soft text-admin-warning",
    published: "bg-admin-success-soft text-admin-success",
    archived: "bg-admin-chip text-admin-text-muted",
    danger: "bg-admin-danger-soft text-admin-danger",
    neutral: "bg-admin-chip text-admin-text-secondary",
  };

  return (
    <span
      className={joinClasses(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium leading-4",
        variants[variant]
      )}
    >
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
