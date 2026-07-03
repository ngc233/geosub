"use client";

import { useEffect, useRef, useState } from "react";

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
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input type="hidden" name={name} value={currentValue} />

      <button
        type="button"
        onClick={() => setOpen((state) => !state)}
        className={[
          "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition",
          "border-slate-300 bg-white text-slate-950 shadow-sm",
          "hover:border-slate-400",
          "focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/10",
        ].join(" ")}
      >
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{selected?.label}</span>
          {selected?.description ? (
            <span className="mt-1 truncate text-xs text-slate-500">
              {selected.description}
            </span>
          ) : null}
        </span>

        <svg
          className={[
            "ml-3 h-4 w-4 shrink-0 text-slate-400 transition",
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
        <p className="mt-2 text-xs leading-5 text-slate-500">{helperText}</p>
      ) : null}

      {open ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl ring-1 ring-slate-950/5">
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
                  }}
                  className={[
                    "flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm transition",
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-950",
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
                          active ? "text-blue-500" : "text-slate-500",
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
