import type { ReactNode } from "react";

type AdminAlertVariant = "info" | "success" | "warning" | "danger";

const variantStyles = {
  info: {
    box: "border-blue-200 bg-blue-50",
    icon: "bg-blue-600 text-white",
    title: "text-blue-950",
    text: "text-blue-900/80",
    mark: "i",
  },
  success: {
    box: "border-green-200 bg-green-50",
    icon: "bg-green-600 text-white",
    title: "text-green-950",
    text: "text-green-900/80",
    mark: "✓",
  },
  warning: {
    box: "border-amber-200 bg-amber-50",
    icon: "bg-amber-600 text-white",
    title: "text-amber-950",
    text: "text-amber-900/80",
    mark: "!",
  },
  danger: {
    box: "border-red-200 bg-red-50",
    icon: "bg-red-600 text-white",
    title: "text-red-950",
    text: "text-red-900/80",
    mark: "!",
  },
};

export default function AdminAlert({
  title,
  children,
  variant = "info",
}: {
  title: string;
  children: ReactNode;
  variant?: AdminAlertVariant;
}) {
  const style = variantStyles[variant];

  return (
    <div className={`rounded-3xl border p-6 ${style.box}`}>
      <div className="flex items-start gap-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${style.icon}`}>
          {style.mark}
        </div>

        <div>
          <h2 className={`font-bold ${style.title}`}>{title}</h2>
          <div className={`mt-2 text-sm leading-7 ${style.text}`}>{children}</div>
        </div>
      </div>
    </div>
  );
}
