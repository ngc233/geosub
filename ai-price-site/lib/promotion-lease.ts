import type { PublicPromotion } from './first-party-promotion';
export type LeaseEntry = { card: PublicPromotion; deadline: number };
export type LeaseEnvironment = {
 now: () => number;
 visible: () => boolean;
 fetchCard: (signal: AbortSignal) => Promise<PublicPromotion | null>;
 render: (entry: LeaseEntry | null) => void;
 setTimer: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
 clearTimer: (id: ReturnType<typeof setTimeout>) => void;
};
/** Uses monotonic deadlines; late responses cannot extend a lease or revive a hidden page. */
export function createPromotionLease(env: LeaseEnvironment) {
 let stopped = false, serial = 0, generation = -1;
 let expiry: ReturnType<typeof setTimeout> | undefined;
 let timeout: ReturnType<typeof setTimeout> | undefined;
 let controller: AbortController | null = null;
 function clear(id: ReturnType<typeof setTimeout> | undefined) { if (id !== undefined) env.clearTimer(id); }
 function hide() { clear(expiry); expiry = undefined; env.render(null); }
 function invalidate() { ++serial; controller?.abort(); clear(timeout); hide(); }
 async function refresh() {
  if (stopped) return;
  if (!env.visible()) { invalidate(); return; }
  const sequence = ++serial;
  controller?.abort(); clear(timeout);
  const current = new AbortController(); controller = current;
  const started = env.now();
  // Hide even when a broken transport ignores AbortSignal and never settles.
  timeout = env.setTimer(() => { if (sequence === serial) { ++serial; current.abort(); hide(); } }, 3000);
  try {
   const card = await env.fetchCard(current.signal);
   if (stopped || sequence !== serial || !env.visible()) return;
   clear(timeout); hide();
   if (!card || !Number.isSafeInteger(card.generation) || card.generation < generation || !Number.isFinite(card.ttlMs) || card.ttlMs <= 0 || card.ttlMs > 30_000) return;
   generation = card.generation;
   const remaining = card.ttlMs - (env.now() - started);
   if (remaining <= 0) return;
   env.render({card, deadline: env.now() + remaining});
   expiry = env.setTimer(hide, remaining);
  } catch { if (!stopped && sequence === serial) { clear(timeout); hide(); } }
 }
 return { refresh, invalidate, resume: () => { invalidate(); return refresh(); }, stop: () => { stopped = true; invalidate(); } };
}
