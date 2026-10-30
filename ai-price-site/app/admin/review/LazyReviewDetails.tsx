"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import AdminLink from "@/components/admin/AdminLink";

type Props = {
  id: string;
  loadHref: string;
  loaded: boolean;
  initiallyOpen: boolean;
  summary: ReactNode;
  children: ReactNode;
};

export default function LazyReviewDetails({
  id,
  loadHref,
  loaded,
  initiallyOpen,
  summary,
  children,
}: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(initiallyOpen);
  const [pending, startTransition] = useTransition();

  function loadDetails() {
    startTransition(() => router.replace(loadHref, { scroll: false }));
  }

  return (
    <details
      id={id}
      open={expanded}
      className="group scroll-mt-24"
      onToggle={(event) => {
        if (event.target !== event.currentTarget) return;
        const open = event.currentTarget.open;
        setExpanded(open);
        if (open && !loaded && !pending) loadDetails();
      }}
    >
      {summary}
      {expanded ? (
        loaded ? (
          children
        ) : (
          <div
            className="px-4 pb-4 text-sm text-admin-text-muted"
            aria-live="polite"
            aria-busy={pending}
          >
            <p>{pending ? "正在加载当前产品的异常详情…" : "详情尚未加载。"}</p>
            <AdminLink
              href={loadHref}
              prefetch={false}
              scroll={false}
              className="inline-flex min-h-11 items-center text-admin-accent"
            >
              加载异常详情
            </AdminLink>
          </div>
        )
      ) : null}
    </details>
  );
}
