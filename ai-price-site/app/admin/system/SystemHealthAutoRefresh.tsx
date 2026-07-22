"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const REFRESH_INTERVAL_MS = 60_000;
const REFRESH_INTERVAL_SECONDS = REFRESH_INTERVAL_MS / 1_000;

export default function SystemHealthAutoRefresh() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL_SECONDS);

  function refresh() {
    startTransition(() => {
      router.refresh();
      setSecondsLeft(REFRESH_INTERVAL_SECONDS);
    });
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          startTransition(() => router.refresh());
          return REFRESH_INTERVAL_SECONDS;
        }
        return current - 1;
      });
    }, REFRESH_INTERVAL_MS / REFRESH_INTERVAL_SECONDS);

    return () => window.clearInterval(timer);
  }, [router]);

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={isPending}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
      title="立即刷新任务状态"
    >
      <RefreshCw className={isPending ? "animate-spin" : ""} size={15} strokeWidth={2.2} />
      {isPending ? "刷新中" : `${secondsLeft} 秒后刷新`}
    </button>
  );
}
