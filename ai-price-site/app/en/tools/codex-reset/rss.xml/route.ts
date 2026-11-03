import { handleCodexResetFeed } from "../../../../../lib/codex-reset-feed-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleCodexResetFeed(request, "en");
}
