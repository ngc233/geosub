"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { PublicPromotion } from "../lib/first-party-promotion";
import PromotionCard from "./PromotionCard";
import { createPromotionLease } from "../lib/promotion-lease";
export default function HomePromotion() {
  const pathname = usePathname();
  const [entry, setEntry] = useState<{ card: PublicPromotion; deadline: number } | null>(null);
  useEffect(() => {
    if (pathname !== "/zh") return;
    const lease = createPromotionLease({
      now: () => performance.now(),
      visible: () => document.visibilityState === "visible",
      fetchCard: async (signal) => {
        const response = await fetch("/api/promotions/home?path=%2Fzh", { cache: "no-store", credentials: "omit", signal });
        if (!response.ok) throw Error("Unavailable");
        return (await response.json() as { card: PublicPromotion | null }).card;
      },
      render: setEntry,
      setTimer: (callback, ms) => setTimeout(callback, ms),
      clearTimer: (id) => clearTimeout(id),
    });
    const resume = () => { void lease.resume(); };
    const hide = () => lease.invalidate();
    void lease.refresh();
    const timer = setInterval(() => void lease.refresh(), 20_000);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pageshow", resume);
    window.addEventListener("pagehide", hide);
    window.addEventListener("offline", hide);
    window.addEventListener("online", resume);
    return () => { lease.stop(); clearInterval(timer); document.removeEventListener("visibilitychange", resume); window.removeEventListener("pageshow", resume); window.removeEventListener("pagehide", hide); window.removeEventListener("offline", hide); window.removeEventListener("online", resume); };
  }, [pathname]);
  if (pathname !== "/zh" || !entry) return null;
  return <div className="px-4 py-6 sm:px-6 lg:px-8"><PromotionCard content={entry.card} href={entry.card.destination} onActivate={(event) => { if (performance.now() >= entry.deadline || document.visibilityState !== "visible") { event.preventDefault(); setEntry(null); } }} /></div>;
}
