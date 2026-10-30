"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AdminCapability } from "../../lib/admin-permissions";
import { adminButtonClassName } from "./AdminButton";
import { AdminActionForm, useAdminPermission } from "./AdminPermissions";

function selectedBoxes(form: HTMLFormElement | null, name: string) {
  return [...(form?.elements || [])].filter(
    (el): el is HTMLInputElement => el instanceof HTMLInputElement && el.type === "checkbox" && el.name === name,
  );
}

function clearSelection(form: HTMLFormElement | null, name: string) {
  for (const box of selectedBoxes(form, name)) box.checked = false;
  document.dispatchEvent(new Event("change"));
}

/**
 * Sticky bar that appears once rows are selected. Row checkboxes join the form through
 * their `form` attribute. Submitting always goes through a confirm dialog that states
 * the count and the effect; server actions must still authorize and validate.
 */
export default function AdminBulkActionBar({
  formId,
  name,
  action,
  actionLabel,
  confirmTitle,
  confirmDescription,
  capability = "manage",
  variant = "primary",
  children,
}: {
  formId: string;
  name: string;
  action: (data: FormData) => unknown | Promise<unknown>;
  actionLabel: string;
  confirmTitle: string;
  /** Receives the selected count; describe what will happen, including irreversible effects. */
  confirmDescription: (count: number) => string;
  capability?: AdminCapability;
  variant?: "primary" | "danger" | "warning";
  children?: ReactNode;
}) {
  const allowed = useAdminPermission(capability);
  const [count, setCount] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);

  useEffect(() => {
    const sync = () => setCount(selectedBoxes(formRef.current, name).filter((box) => box.checked).length);
    document.addEventListener("change", sync);
    sync();
    return () => document.removeEventListener("change", sync);
  }, [name]);

  return (
    <AdminActionForm
      ref={formRef}
      id={formId}
      capability={capability}
      action={action}
      onSubmit={(event) => {
        if (confirmedRef.current) {
          confirmedRef.current = false;
          return;
        }
        event.preventDefault();
        if (count > 0) dialogRef.current?.showModal();
      }}
      className={count > 0 ? "sticky bottom-4 z-20 mt-4" : "hidden"}
    >
      {children}
      <div role="region" aria-label="批量操作" className="flex flex-wrap items-center justify-between gap-3 rounded-admin-card border border-admin-border bg-admin-surface px-4 py-3 shadow-lg shadow-admin-shadow">
        <span className="text-sm font-semibold text-admin-text">已选 {count} 项</span>
        <span className="flex gap-2">
          <button
            type="button"
            className={adminButtonClassName({ variant: "ghost", size: "sm" })}
            onClick={() => clearSelection(formRef.current, name)}
          >
            取消选择
          </button>
          <button type="submit" disabled={!allowed || count === 0} className={adminButtonClassName({ variant, size: "sm" })}>
            {actionLabel}
          </button>
        </span>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby={`${formId}-confirm-title`}
        className="m-auto w-[min(92vw,440px)] rounded-admin-card border border-admin-border bg-admin-surface p-6 text-admin-text shadow-2xl backdrop:bg-slate-950/40"
      >
        <h2 id={`${formId}-confirm-title`} className="text-base font-semibold">{confirmTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-admin-text-secondary">{confirmDescription(count)}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" autoFocus className={adminButtonClassName({ variant: "secondary", size: "sm" })} onClick={() => dialogRef.current?.close()}>
            取消
          </button>
          <button
            type="button"
            className={adminButtonClassName({ variant, size: "sm" })}
            onClick={() => {
              dialogRef.current?.close();
              confirmedRef.current = true;
              formRef.current?.requestSubmit();
            }}
          >
            确认{actionLabel}（{count} 项）
          </button>
        </div>
      </dialog>
    </AdminActionForm>
  );
}
