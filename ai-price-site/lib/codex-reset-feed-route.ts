import "server-only";
import { readCodexResetFeed } from "./codex-reset-store";
import { resetFeedResponse } from "./codex-reset-rss";
import { resetSiteOrigin } from "./codex-reset-presentation";
import type { ResetLocale } from "./codex-reset";

export async function handleCodexResetFeed(request: Request, locale: ResetLocale) {
  try {
    return resetFeedResponse(request, await readCodexResetFeed(), locale, resetSiteOrigin());
  } catch {
    // An upstream failure is not an empty feed and must not evict a reader's last good records.
    return new Response("Feed temporarily unavailable. Please retry later.", { status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "60", "X-Robots-Tag": "noindex" } });
  }
}
