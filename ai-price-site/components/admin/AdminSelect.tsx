"use client";
import { adminControlClassName } from "./admin-control";

import { useEffect, useRef, useState, useId } from "react";

type AdminSelectOption = {
  value: string;
  label: string;
  description?: string;
};

type AdminSelectProps = {
  name: string;
  label: string;
  value?: string;
  options: AdminSelectOption[];
  helperText?: string;
};

export default function AdminSelect({
  name,
  label,
  value,
  options,
  helperText,
}: AdminSelectProps) {
  const initialValue = value || options[0]?.value || "";
  const [currentValue, setCurrentValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const controlId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const selected =
    options.find((option) => option.value === currentValue) || options[0];

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current) return;

      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (wrapperRef.current?.contains(document.activeElement)) triggerRef.current?.focus();
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <label htmlFor={controlId} className="mb-2 block text-sm font-medium text-admin-text-body dark:text-admin-text-body">
        {label}
      </label>

      <input type="hidden" name={name} value={currentValue} />

      <button
        id={controlId}
        ref={triggerRef}
        aria-expanded={open}
        aria-controls={`${controlId}-options`}
        type="button"
        onClick={() => setOpen((state) => !state)}
        className={`${adminControlClassName} flex min-h-11 w-full items-center justify-between py-2 text-left`}
      >
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{selected?.label}</span>
          {selected?.description ? (
            <span className="mt-1 truncate text-xs text-admin-text-muted dark:text-admin-text-muted">
              {selected.description}
            </span>
          ) : null}
        </span>

        <svg
          className={[
            "ml-3 h-4 w-4 shrink-0 text-admin-text-faint transition",
            open ? "rotate-180 text-blue-600" : "",
          ].join(" ")}
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {helperText ? (
        <p className="mt-2 text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">{helperText}</p>
      ) : null}

      {open ? (
        <div id={`${controlId}-options`} className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg
          border border-admin-border bg-admin-surface p-1 shadow-xl ring-1 ring-slate-950/5
          dark:bg-admin-surface dark:border-admin-border">
          <div className="admin-scrollbar max-h-[360px] overflow-y-auto">
            {options.map((option) => {
              const active = option.value === currentValue;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setCurrentValue(option.value);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className={[
                    "flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm transition",
                    active
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "text-admin-text-body hover:bg-admin-surface-subtle hover:text-admin-text dark:text-admin-text-body dark:hover:bg-admin-chip dark:hover:text-admin-text",
                  ].join(" ")}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {option.label}
                    </span>
                    {option.description ? (
                      <span
                        className={[
                          "mt-1 block truncate text-xs",
                          active ? "text-blue-500 dark:text-blue-300" : "text-admin-text-muted dark:text-admin-text-muted",
                        ].join(" ")}
                      >
                        {option.description}
                      </span>
                    ) : null}
                  </span>

                  {active ? (
                    <svg
                      className="ml-3 h-4 w-4 shrink-0 text-blue-600"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M4.5 10.5L8 14L15.5 6"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
