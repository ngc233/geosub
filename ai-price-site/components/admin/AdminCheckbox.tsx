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
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-4 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-900">
      <input
        {...props}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 focus:ring-blue-600/20 dark:border-slate-700 dark:text-blue-300"
      />

      <span>
        <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
          {label}
        </span>

        {description ? (
          <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
