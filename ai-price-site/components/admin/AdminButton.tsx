import Link from "next/link";
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
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold transition shadow-sm focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60";

  const sizes = {
    sm: "h-9 px-3 text-xs",
    md: "h-10 px-4 text-sm",
  };

  const variants = {
    primary:
      "border border-blue-700 bg-[#1D4ED8] !text-white hover:bg-[#1E40AF] focus:ring-blue-600/15 shadow-blue-900/10",
    secondary:
      "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 focus:ring-slate-500/10 shadow-slate-200/60",
    success:
      "border border-green-700 bg-[#15803D] !text-white hover:bg-[#166534] focus:ring-green-600/15 shadow-green-900/10",
    warning:
      "border border-amber-700 bg-[#B45309] !text-white hover:bg-[#92400E] focus:ring-amber-600/15 shadow-amber-900/10",
    danger:
      "border border-red-700 bg-[#B91C1C] !text-white hover:bg-[#991B1B] focus:ring-red-600/15 shadow-red-900/10",
    ghost:
      "border border-transparent bg-transparent text-slate-600 shadow-none hover:bg-slate-100 hover:text-slate-950 focus:ring-slate-500/10",
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
    <Link
      href={href}
      className={adminButtonClassName({ variant, size, className })}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}
