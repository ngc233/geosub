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
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 transition hover:border-slate-300 hover:bg-slate-50">
      <input
        {...props}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 focus:ring-blue-600/20"
      />

      <span>
        <span className="block text-sm font-semibold text-slate-800">
          {label}
        </span>

        {description ? (
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
