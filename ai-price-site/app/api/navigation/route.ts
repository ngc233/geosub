import { NextResponse } from "next/server";
import { getSiteNavigation } from "../../../lib/site-navigation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") || "zh";

  const items = await getSiteNavigation(locale);

  return NextResponse.json({
    items,
  });
}