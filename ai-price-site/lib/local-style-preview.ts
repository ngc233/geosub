export const LOCAL_STYLE_PREVIEW_PATH = "/style-preview";

/** Explicit local opt-in; never use forwarded host or a public hostname. */
export function isLocalStylePreviewAllowed(enabled: string | undefined, host: string | null) {
  return enabled === "1" && host !== null
    && /^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i.test(host);
}
