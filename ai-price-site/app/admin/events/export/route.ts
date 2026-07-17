import { requireAdmin } from "../../../../lib/admin-auth";
import {
  buildAdminEventWhere,
  findHighFrequencyVisitorIds,
  inferEventProductSlug,
  parseAdminEventFilters,
} from "../../../../lib/admin-event-analytics";
import { prisma } from "../../../../lib/prisma";

const EXPORT_LIMIT = 10_000;

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET(request: Request) {
  await requireAdmin();

  const url = new URL(request.url);
  const filters = parseAdminEventFilters({
    from: url.searchParams.get("from") || undefined,
    to: url.searchParams.get("to") || undefined,
    type: url.searchParams.get("type") || undefined,
    quality: url.searchParams.get("quality") || undefined,
    product: url.searchParams.get("product") || undefined,
    device: url.searchParams.get("device") || undefined,
    q: url.searchParams.get("q") || undefined,
  });

  const products = await prisma.product.findMany({
    select: { id: true, slug: true, name: true },
  });
  const selectedProduct = products.find((product) => product.slug === filters.product) || null;
  const highFrequencyVisitorIds = await findHighFrequencyVisitorIds(filters);
  const events = await prisma.eventLog.findMany({
    where: buildAdminEventWhere(
      filters,
      selectedProduct,
      highFrequencyVisitorIds,
    ),
    orderBy: { createdAt: "desc" },
    take: EXPORT_LIMIT,
    select: {
      eventKey: true,
      eventName: true,
      pagePath: true,
      pageTitle: true,
      referrer: true,
      locale: true,
      anonymousId: true,
      productId: true,
      buttonKey: true,
      placement: true,
      source: true,
      deviceType: true,
      createdAt: true,
    },
  });

  const productSlugById = new Map(products.map((product) => [product.id, product.slug]));
  const productNameBySlug = new Map(products.map((product) => [product.slug, product.name]));
  const knownSlugs = new Set(products.map((product) => product.slug));
  const header = [
    "created_at_utc",
    "event_key",
    "event_name",
    "product",
    "product_slug",
    "page_path",
    "page_title",
    "button_key",
    "placement",
    "source",
    "device",
    "locale",
    "visitor_short_id",
    "referrer",
  ];
  const lines = [header.join(",")];

  for (const event of events) {
    const slug = inferEventProductSlug(event, productSlugById, knownSlugs);
    lines.push([
      event.createdAt.toISOString(),
      event.eventKey,
      event.eventName,
      slug ? productNameBySlug.get(slug) : "",
      slug,
      event.pagePath,
      event.pageTitle,
      event.buttonKey,
      event.placement,
      event.source,
      event.deviceType,
      event.locale,
      event.anonymousId?.slice(0, 8),
      event.referrer,
    ].map(csvCell).join(","));
  }

  const fileName = `geosub-events-${filters.from}-${filters.to}.csv`;

  return new Response(`\uFEFF${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
