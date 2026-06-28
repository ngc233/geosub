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
    draft: "border-slate-300 bg-slate-100 text-slate-700",
    review: "border-amber-300 bg-amber-50 text-amber-800",
    published: "border-green-300 bg-green-50 text-green-800",
    archived: "border-slate-300 bg-slate-200 text-slate-700",
    danger: "border-red-300 bg-red-50 text-red-800",
    neutral: "border-slate-300 bg-white text-slate-700",
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
