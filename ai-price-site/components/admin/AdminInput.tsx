import { adminControlClassName } from "./admin-control";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const inputBase = `${adminControlClassName} w-full`;

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
    <label className="block">
      {label ? (
        <span className="mb-2 block text-sm font-medium text-admin-text-body">
          {label}
        </span>
      ) : null}

      <input {...props} className={joinClasses(inputBase, "h-11", className)} />

      {helperText ? (
        <p className="mt-2 text-xs leading-5 text-admin-text-muted">{helperText}</p>
      ) : null}
    </label>
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
    <label className="block">
      {label ? (
        <span className="mb-2 block text-sm font-medium text-admin-text-body">
          {label}
        </span>
      ) : null}

      <textarea
        {...props}
        className={joinClasses(
          inputBase,
          "min-h-32 resize-y py-3 leading-6",
          className
        )}
      />

      {helperText ? (
        <p className="mt-2 text-xs leading-5 text-admin-text-muted">{helperText}</p>
      ) : null}
    </label>
  );
}
