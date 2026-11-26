"use client";

import { useEffect, useRef, useState } from "react";
import { msPerWeek, type Currency, type GameResponse, type Platform } from "@/lib/game-offers";

function buildInitialCache(
  initial: GameResponse | null,
  offersByPlatform: Partial<Record<Platform, GameResponse>>,
) {
  const seeded: Record<string, GameResponse> = {};
  for (const [p, entry] of Object.entries(offersByPlatform)) {
    if (entry) {
      seeded[`${p}:${entry.display_currency}`] = entry;
    }
  }
  if (initial) {
    seeded[`${initial.platform}:${initial.display_currency}`] = initial;
  }
  return seeded;
}

export function useGameOffers(
  slug: string,
  platform: Platform,
  apiCurrency: Currency,
  initial: GameResponse | null,
  offersByPlatform: Partial<Record<Platform, GameResponse>>,
) {
  const [cache, setCache] = useState<Record<string, GameResponse>>(() =>
    buildInitialCache(initial, offersByPlatform),
  );

  const activeKey = `${platform}:${apiCurrency}`;
  const currentData = cache[activeKey] ?? null;
  const [now, setNow] = useState(() => (currentData ? Date.parse(currentData.as_of) : 0));
  const [error, setError] = useState(false);
  const cacheRef = useRef<Record<string, GameResponse>>({});

  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  useEffect(() => {
    let live = true;
    let serial = 0;
    let offset = 0;
    let active: AbortController | undefined;
    let wake: ReturnType<typeof setTimeout>;
    let current = cacheRef.current[`${platform}:${apiCurrency}`] ?? null;

    if (current) {
      offset = Date.parse(current.as_of) - Date.now();
    }

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
          `/api/games/${encodeURIComponent(slug)}/offers?` +
            new URLSearchParams({ platform, display_currency: apiCurrency }),
          { cache: "no-store", signal: controller.signal },
        );
        if (!response.ok) throw new Error("offers unavailable");
        const next: GameResponse = await response.json();
        if (!live || id !== serial || next.platform !== platform || next.display_currency !== apiCurrency) {
          return;
        }
        current = next;
        offset = Date.parse(next.as_of) - Date.now();
        setCache((prev) => {
          const updated = { ...prev, [`${platform}:${apiCurrency}`]: next };
          cacheRef.current = updated;
          return updated;
        });
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
  }, [slug, platform, apiCurrency]);

  return {
    data: currentData,
    now,
    error,
  };
}
