import AdminLink from "@/components/admin/AdminLink";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type AdminButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "ghost";

type AdminButtonSize = "sm" | "md";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function adminButtonClassName({
  variant = "primary",
  size = "md",
  className = "",
}: {
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  className?: string;
}) {
  const base =
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium transition-colors shadow-none focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60";

  const sizes = {
    sm: "h-9 px-3 text-xs",
    md: "h-11 px-4 text-sm",
  };

  const variants = {
    primary:
      "border border-transparent bg-admin-primary !text-white hover:bg-admin-primary-hover focus:ring-admin-accent/30",
    secondary:
      [
        "border border-admin-border-strong bg-admin-surface text-admin-text-body hover:bg-admin-surface-subtle",
        "hover:text-admin-text focus:ring-admin-accent/30 shadow-admin-shadow",
        "dark:hover:text-white dark:focus:ring-blue-400/60"
      ].join(" "),
    success:
      "border border-green-700 bg-[#15803D] !text-white hover:bg-[#166534] focus:ring-green-600 shadow-green-900/10 dark:focus:ring-green-400/60",
    warning:
      "border border-amber-700 bg-[#B45309] !text-white hover:bg-[#92400E] focus:ring-amber-600 shadow-amber-900/10 dark:focus:ring-amber-400/60",
    danger:
      "border border-red-700 bg-[#B91C1C] !text-white hover:bg-[#991B1B] focus:ring-red-600 shadow-red-900/10 dark:focus:ring-red-400/60",
    ghost:
      [
        "border border-transparent bg-transparent text-admin-text-secondary shadow-none hover:bg-admin-chip",
        "hover:text-admin-text focus:ring-admin-accent/30 dark:hover:text-white dark:focus:ring-blue-400/60"
      ].join(" "),
  };

  return joinClasses(base, sizes[size], variants[variant], className);
}

export function AdminButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
}) {
  return (
    <button
      {...props}
      className={adminButtonClassName({ variant, size, className })}
    />
  );
}

export function AdminLinkButton({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
  title,
  ariaLabel,
}: {
  href: string;
  children: ReactNode;
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  className?: string;
  title?: string;
  ariaLabel?: string;
}) {
  return (
    <AdminLink
      href={href}
      className={adminButtonClassName({ variant, size, className })}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </AdminLink>
  );
}
