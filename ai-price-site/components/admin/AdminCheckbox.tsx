import type { InputHTMLAttributes, ReactNode } from "react";

export function AdminCheckbox({
  label,
  description,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-admin-border
      bg-admin-surface px-4 py-4 transition hover:border-admin-border-strong hover:bg-admin-surface-subtle
      dark:border-admin-border-strong dark:bg-admin-surface dark:hover:border-admin-border-strong
      dark:hover:bg-admin-surface">
      <input
        {...props}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-admin-border-strong text-blue-600 accent-blue-600 focus:ring-blue-600/20 dark:border-admin-border-strong dark:text-blue-300"
      />

      <span>
        <span className="block text-sm font-semibold text-admin-text dark:text-admin-text-body">
          {label}
        </span>

        {description ? (
          <span className="mt-1 block text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
