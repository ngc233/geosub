import { NextResponse } from "next/server";
import { getSiteNavigation } from "../../../lib/site-navigation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") || "zh";
  const position = url.searchParams.get("position") || "header";

  const items = await getSiteNavigation({
    locale,
    position,
  });

  return NextResponse.json({
    items,
    locale,
    position,
  });
}
