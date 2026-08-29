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
    draft: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
    review: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    published: "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/60 dark:text-green-300",
    archived: "border-slate-300 bg-slate-200 text-slate-700 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100",
    danger: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300",
    neutral: "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
  };

  return (
    <span
      className={joinClasses(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
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
