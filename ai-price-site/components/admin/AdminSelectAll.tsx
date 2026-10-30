"use client";

import { useEffect, useRef } from "react";

function rowBoxes(formId: string, name: string) {
  return [...document.querySelectorAll<HTMLInputElement>(`input[type=checkbox][form="${CSS.escape(formId)}"][name="${CSS.escape(name)}"]`)];
}

/** Header checkbox for the rows on the current page; mirrors partial selection. */
export default function AdminSelectAll({ formId, name }: { formId: string; name: string }) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sync = () => {
      const box = ref.current;
      if (!box) return;
      const boxes = rowBoxes(formId, name);
      const checked = boxes.filter((item) => item.checked).length;
      box.checked = boxes.length > 0 && checked === boxes.length;
      box.indeterminate = checked > 0 && checked < boxes.length;
    };
    document.addEventListener("change", sync);
    sync();
    return () => document.removeEventListener("change", sync);
  }, [formId, name]);

  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label="选择本页全部行"
      className="h-4 w-4 accent-blue-700"
      onChange={(event) => {
        for (const box of rowBoxes(formId, name)) box.checked = event.currentTarget.checked;
        document.dispatchEvent(new Event("change"));
      }}
    />
  );
}
