export { PLUS_BASELINE_PATH } from "./plus-region-experiment";

/** First observations for a single consented navigation to the Chinese Plus page. */

type Lookup = "search" | "filter" | "detail" | "compare" | "browse";
type Fields = Record<string, string | number | boolean | null>;
type Emit = (key: string, fields: Fields, eventId: string) => void;

function initialForegroundMs() {
  // Chromium records visibility transitions from navigation, including time before hydration.
  const states = performance.getEntriesByType("visibility-state");
  if (!states.length) return 0;
  const now = performance.now();
  return states.reduce((total, entry, index) =>
    total + (entry.name === "visible" ? (states[index + 1]?.startTime ?? now) - entry.startTime : 0), 0);
}

export function startPlusBaseline(emit: Emit, initialDocument: boolean) {
  const controller = new AbortController();
  const options = { capture: true, signal: controller.signal };
  const viewId = crypto.randomUUID();
  let savedMs = initialDocument ? initialForegroundMs() : 0;
  let visibleAt: number | null = document.hidden ? null : performance.now();
  let closed = false;
  let timer = 0;
  let searchTimer = 0;
  let composing = false;
  let compositionInput: HTMLInputElement | null = null;
  let gestureUntil = 0;
  let hasScroll = false;
  let hasClick = false;
  let hasSearch = false;
  let hasActiveLookup = false;
  let tenSeconds = false;
  let sawTable = false;
  let toolbarSince: number | undefined;
  let browseOrigin: Set<string> | null = null;
  let intent: Lookup | null = null;
  let actionButton: HTMLElement | null = null;
  let sequence = 0;
  const first = new Set<string>();
  const dwell = new Map<Element, number>();
  const activeMs = () => Math.round(savedMs + (visibleAt === null ? 0 : performance.now() - visibleAt));

  function report(key: string, extra: Fields = {}) {
    const id = crypto.randomUUID();
    emit(key, { schema_version: 1, view_id: viewId, event_id: id, seq: ++sequence,
      active_ms: activeMs(), client_utc: new Date().toISOString(), ...extra }, id);
  }
  function once(key: string, extra: Fields) {
    if (first.has(key)) return;
    first.add(key);
    report(key, extra);
  }
  function snapshot(reason: string, final = false) {
    const engaged = hasScroll || hasClick || hasSearch || hasActiveLookup;
    const short = activeMs() < 10_000 && !engaged;
    report("region_visit_state", { reason, final, manual_scroll: hasScroll,
      substantive_click: hasClick, used_search: hasSearch, active_lookup: hasActiveLookup,
      short_bounce: short && !final ? null : short });
  }
  function seen(element: Element) {
    const rect = element.getBoundingClientRect();
    const width = Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0));
    const height = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
    return rect.width > 0 && rect.height > 0 && width * height >= rect.width * rect.height / 2;
  }
  const toolbar = () => document.querySelector<HTMLElement>("[data-lookup-count]");
  const rowSelector = "[data-region-price-row]";
  function resultCount() { return Number(toolbar()?.dataset.lookupCount || 0); }
  function setIntent(method: Lookup | null, button: HTMLElement | null = null) {
    intent = method;
    actionButton = button;
    dwell.clear();
  }
  function success(method: Lookup) {
    const fields = { method, result_count: resultCount() };
    once("region_lookup_success", fields);
    if (method !== "browse") {
      hasActiveLookup = true;
      once("region_active_lookup_success", fields);
    } else {
      once("region_browse_view", fields);
    }
    setIntent(null);
  }
  function inspect() {
    window.clearTimeout(timer);
    if (closed || visibleAt === null) return;
    const now = performance.now();
    let next = Infinity;
    if (!tenSeconds) {
      const delay = 10_000 - activeMs();
      if (delay > 0) next = delay;
      else { tenSeconds = true; snapshot("ten_seconds"); }
    }
    const bar = toolbar();
    if (!sawTable) {
      if (bar && seen(bar)) {
        toolbarSince ??= now;
        const delay = 1000 - (now - toolbarSince);
        if (delay > 0) next = Math.min(next, delay);
        else { sawTable = true; once("region_table_view", { target: "toolbar" }); }
      } else toolbarSince = undefined;
    }
    if (intent && bar && resultCount() > 0) {
      const method = intent;
      if (method === "detail" || method === "compare") {
        const expanded = actionButton?.getAttribute(method === "detail" ? "aria-expanded" : "aria-pressed") === "true";
        const price = actionButton?.closest(rowSelector)?.querySelector("[data-region-price-converted]");
        if (expanded && price && seen(price)) success(method);
      } else {
        const elements = Array.from(bar.parentElement?.querySelectorAll<HTMLElement>(rowSelector) || []);
        for (const elem of dwell.keys()) if (!elem.isConnected) dwell.delete(elem);
        for (const row of elements) {
          if (!seen(row) || (method === "browse" && browseOrigin?.has(row.dataset.regionPriceRow || ""))) {
            dwell.delete(row); continue;
          }
          const since = dwell.get(row) ?? now;
          dwell.set(row, since);
          const delay = 2000 - (now - since);
          if (delay <= 0) { success(method); break; }
          next = Math.min(next, delay);
        }
      }
    }
    if (Number.isFinite(next)) timer = window.setTimeout(inspect, Math.max(1, Math.ceil(next)));
  }
  let frame = 0;
  function schedule() {
    if (!frame && !closed) frame = requestAnimationFrame(() => { frame = 0; inspect(); });
  }
  function input(event: Event) {
    const node = event.target;
    if (!(node instanceof HTMLInputElement) || !node.matches("[data-region-query]")) return;
    // Some IMEs finish with a synthetic compositionend after native, trusted input.
    const finishesUserComposition = event.type === "compositionend" && composing && compositionInput === node;
    if (!event.isTrusted && !finishesUserComposition) return;
    if (event.type === "compositionstart") {
      composing = true;
      compositionInput = null;
      clearTimeout(searchTimer);
      setIntent(null);
      return;
    }
    if (event.type === "compositionend") {
      composing = false;
      compositionInput = null;
    }
    // A final input with isComposing=true may follow compositionend in Chromium.
    if (event.type === "input" && (composing || (event instanceof InputEvent && event.isComposing))) {
      if (composing) compositionInput = node;
      return;
    }
    clearTimeout(searchTimer);
    setIntent(null);
    if (event.type !== "compositionend" && !node.value.trim()) return;
    if (!hasSearch && node.value.trim()) {
      hasSearch = true;
      snapshot("first_input");
    }
    searchTimer = window.setTimeout(() => {
      if (!node.isConnected || !node.value.trim() || closed) return;
      hasSearch = true;
      once("region_search_use", { result_count: resultCount() });
      setIntent("search"); schedule();
    }, event.type === "compositionend" ? 0 : 300);
  }
  function click(event: MouseEvent) {
    if (!event.isTrusted || !(event.target instanceof Element)) return;
    const control = event.target.closest<HTMLElement>("button,a,input,select,summary,[role=button]");
    const entry = control?.closest<HTMLElement>("[data-region-entry]");
    if (entry) {
      // An entry jump is diagnostic only, including a keyboard-activated smooth scroll.
      gestureUntil = 0;
      browseOrigin = null;
      setIntent(null);
      report("region_entry_click", { target: entry.dataset.regionEntry || "" });
      return;
    }
    if (!control || control.closest("a[href^='#']") || control.matches("[data-region-query]")) return;
    if (!hasClick) {
      hasClick = true;
      snapshot("first_click");
    }
    const method = control.dataset.regionAction;
    if (method === "clear") { clearTimeout(searchTimer); setIntent(null); }
    if (method === "filter" || method === "compare" || method === "detail") {
      clearTimeout(searchTimer);
      const alreadyActive = control.getAttribute(method === "detail" ? "aria-expanded" : "aria-pressed") === "true";
      setIntent(alreadyActive ? null : method, control);
    }
    schedule();
  }
  function gesture(event: Event) {
    if (!event.isTrusted) return;
    if (event instanceof KeyboardEvent &&
        (!["ArrowDown","ArrowUp","PageDown","PageUp","Home","End"," "].includes(event.key) ||
        (event.target instanceof Element && event.target.closest("input,textarea,select,[contenteditable=true],[data-region-entry]")))) return;
    gestureUntil = performance.now() + 800;
    if (sawTable && !first.has("region_browse_view") && !browseOrigin) {
      browseOrigin = new Set(Array.from(document.querySelectorAll<HTMLElement>(rowSelector))
        .filter(seen).map(el => el.dataset.regionPriceRow || ""));
    }
  }
  function scroll(event: Event) {
    if (event.isTrusted && performance.now() < gestureUntil) {
      if (!hasScroll) {
        hasScroll = true;
        snapshot("first_scroll");
      }
      if (!intent && browseOrigin && !first.has("region_browse_view")) setIntent("browse");
    }
    schedule();
  }
  function pause() {
    if (visibleAt !== null) { savedMs = activeMs(); visibleAt = null; }
    dwell.clear(); toolbarSince = undefined;
    clearTimeout(timer);
  }
  function visibility() {
    if (document.hidden) { pause(); snapshot("hidden"); }
    else { visibleAt ??= performance.now(); schedule(); }
  }
  function close(reason: string, record: boolean) {
    if (closed) return;
    closed = true;
    pause();
    if (record) snapshot(reason, true);
    clearTimeout(searchTimer);
    cancelAnimationFrame(frame);
    observer.disconnect();
    controller.abort();
  }
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true,
    attributeFilter: ["data-lookup-count","aria-expanded","aria-pressed","hidden","class"] });
  document.addEventListener("visibilitychange", visibility, options);
  window.addEventListener("pagehide", e => {
    if (e.persisted) { pause(); snapshot("bfcache"); } else close("pagehide", true);
  }, options);
  window.addEventListener("pageshow", () => { if (!document.hidden) { visibleAt ??= performance.now(); schedule(); } }, options);
  for (const type of ["input","compositionstart","compositionend"]) document.addEventListener(type, input, options);
  document.addEventListener("click", click, options);
  for (const type of ["wheel","touchmove","keydown"]) document.addEventListener(type, gesture, { ...options, passive: true });
  document.addEventListener("scroll", scroll, { ...options, passive: true });
  window.addEventListener("resize", schedule, options);
  report("page_view", { eligible_at_entry: true,
    clock_origin: initialDocument && performance.getEntriesByType("visibility-state").length ? "navigation_visibility" : "observed_entry" });
  inspect();
  return (record: boolean) => close("route_exit", record);
}
