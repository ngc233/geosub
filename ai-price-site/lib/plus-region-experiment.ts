// Only an eligible Plus navigation publishes a UI assignment. The server renders the control.
export const PLUS_REGION_EXPERIMENT = "zh-plus-region-entry-v8";
export const PLUS_BASELINE_PATH = "/zh/ai-pricing/chatgpt/plus";
export type PlusVariant = "A" | "B";

export function variantForVisitor(visitorId: string | undefined): PlusVariant | null {
  // Both the existing first-party cookie and newly issued IDs are random v4 UUIDs.
  if (!visitorId || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitorId)) return null;
  return parseInt(visitorId[0], 16) < 8 ? "A" : "B";
}

export async function enrollWithPlusVisitorLock(
  locks: Pick<LockManager, "request"> | undefined,
  enroll: (allowAssignment: boolean) => void,
) {
  if (!locks) {
    enroll(false);
    return;
  }
  let started = false;
  try {
    await locks.request("geosub-plus-visitor", () => {
      started = true;
      enroll(true);
    });
  } catch {
    // Keep baseline telemetry on lock denial without racing to create an experiment ID.
    if (!started) enroll(false);
  }
}

let current: PlusVariant | null = null;
const listeners = new Set<() => void>();

export function getPlusVariant() { return current; }

export function subscribePlusVariant(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function setPlusVariant(variant: PlusVariant | null) {
  if (current === variant) return;
  current = variant;
  for (const listener of listeners) listener();
}
