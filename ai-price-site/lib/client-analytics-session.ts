import { hasAnalyticsConsent } from "./analytics-consent";

const SESSION_STORAGE_KEY = "geosub_session_id";
const SESSION_ACTIVITY_STORAGE_KEY = "geosub_session_activity";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

let memorySessionId = "";
let memorySessionActivity = 0;

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getAnalyticsSessionId() {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) {
    return undefined;
  }

  try {
    const now = Date.now();
    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    const lastActivity = Number(
      window.sessionStorage.getItem(SESSION_ACTIVITY_STORAGE_KEY) || 0,
    );

    if (stored && lastActivity > 0 && now - lastActivity <= SESSION_TIMEOUT_MS) {
      memorySessionId = stored;
      memorySessionActivity = now;
      window.sessionStorage.setItem(SESSION_ACTIVITY_STORAGE_KEY, String(now));
      return stored;
    }

    const sessionId = createSessionId();
    memorySessionId = sessionId;
    memorySessionActivity = now;
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    window.sessionStorage.setItem(SESSION_ACTIVITY_STORAGE_KEY, String(now));
    return sessionId;
  } catch {
    const now = Date.now();

    if (
      !memorySessionId
      || !memorySessionActivity
      || now - memorySessionActivity > SESSION_TIMEOUT_MS
    ) {
      memorySessionId = createSessionId();
    }

    memorySessionActivity = now;
    return memorySessionId;
  }
}

export function clearAnalyticsSession() {
  memorySessionId = "";
  memorySessionActivity = 0;

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    window.sessionStorage.removeItem(SESSION_ACTIVITY_STORAGE_KEY);
  } catch {
    // Storage cleanup must never interrupt consent handling.
  }
}
