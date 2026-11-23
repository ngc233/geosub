"use client";
import { useEffect, useRef, useState } from "react";
import { msPerWeek, type GameResponse, type Selection } from "@/lib/game-offers";

export function useGameOffers(selection: Selection, initial: GameResponse | null) {
  const { platform, currency } = selection;
  const [data, setData] = useState(initial);
  const [now, setNow] = useState(initial ? Date.parse(initial.as_of) : 0);
  const [error, setError] = useState(false);
  const initialRef = useRef(initial);
  useEffect(() => {
    let live = true,
      serial = 0,
      offset = 0;
    let active: AbortController | undefined;
    let wake: ReturnType<typeof setTimeout>;
    let current = initialRef.current;
    if (current?.platform !== platform || current.display_currency !== currency) current = null;
    function tick() {
      const at = Date.now() + offset;
      setNow(at);
      clearTimeout(wake);
      const times = current
        ? [...current.full_games, ...current.upgrades]
            .flatMap((row) => [row.valid_until, row.price?.member_ends_at])
            .filter((s): s is string => Boolean(s))
            .map(Date.parse)
        : [];
      if (current?.fx_as_of) times.push(Date.parse(current.fx_as_of) + msPerWeek);
      const delay = Math.min(60_000, ...times.filter((t) => t > at).map((t) => t - at));
      wake = setTimeout(() => {
        tick();
        void refresh();
      }, delay + 5);
    }
    async function refresh() {
      const id = ++serial;
      active?.abort();
      const controller = new AbortController();
      active = controller;
      const timeout = setTimeout(() => controller.abort(), 12_000);
      try {
        const response = await fetch(
          "/api/games/gta-6/offers?" + new URLSearchParams({ platform, display_currency: currency }),
          { cache: "no-store", signal: controller.signal },
        );
        if (!response.ok) throw new Error("offers unavailable");
        const next: GameResponse = await response.json();
        if (!live || id !== serial || next.platform !== platform || next.display_currency !== currency)
          return;
        current = next;
        offset = Date.parse(next.as_of) - Date.now();
        setData(next);
        setError(false);
        tick();
      } catch {
        if (live && id === serial) setError(true);
      } finally {
        clearTimeout(timeout);
      }
    }
    function resume() {
      if (document.visibilityState !== "hidden") {
        tick();
        void refresh();
      }
    }
    tick();
    void refresh();
    window.addEventListener("online", resume);
    window.addEventListener("pageshow", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      live = false;
      active?.abort();
      clearTimeout(wake);
      window.removeEventListener("online", resume);
      window.removeEventListener("pageshow", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [platform, currency]);
  return {
    data: data?.platform === platform && data.display_currency === currency ? data : null,
    now,
    error,
  };
}
