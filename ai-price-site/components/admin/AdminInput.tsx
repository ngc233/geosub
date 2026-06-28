import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const inputBase =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10";

export function AdminInput({
  label,
  helperText,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
}) {
  return (
    <div>
      {label ? (
        <label className="mb-2 block text-sm font-medium text-slate-700">
          {label}
        </label>
      ) : null}

      <input {...props} className={joinClasses(inputBase, className)} />

      {helperText ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}

export function AdminTextarea({
  label,
  helperText,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  helperText?: string;
}) {
  return (
    <div>
      {label ? (
        <label className="mb-2 block text-sm font-medium text-slate-700">
          {label}
        </label>
      ) : null}

      <textarea
        {...props}
        className={joinClasses(
          inputBase,
          "min-h-32 resize-y leading-6",
          className
        )}
      />

      {helperText ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}
