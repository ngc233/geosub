// Per-process single flight and short failure cooldown. Successful values are
// still owned by Next's one-hour cache; failures are never cached as successes.
export class HomepageChangesCoolingDown extends Error {
  constructor() { super("Homepage changes retry deferred"); this.name = "HomepageChangesCoolingDown"; }
}
export function createHomepageChangesGuard<T>(read: () => Promise<T>, onFailure: (error: unknown) => void,
  clock = () => Date.now(), cooldownMs = 30_000) {
  let inFlight: Promise<T> | undefined;
  let retryAt = 0;
  return function guardedRead(): Promise<T> {
    if (inFlight) return inFlight;
    if (clock() < retryAt) return Promise.reject(new HomepageChangesCoolingDown());
    inFlight = Promise.resolve().then(read).catch(error => {
      retryAt = clock() + cooldownMs;
      onFailure(error);
      throw error;
    }).finally(() => { inFlight = undefined; });
    return inFlight;
  };
}
function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}
export function homepageChangesErrorCategory(error: unknown) {
  const code = object(error).code;
  const meta = object(object(error).meta);
  const cause = object(object(meta.driverAdapterError).cause);
  if (code === "P2028" || code === "57014" || meta.code === "57014" || cause.originalCode === "57014"
    || error instanceof Error && error.name === "HomepageHistoryTimeout") return "timeout";
  return "read-error";
}
