import {
  formatSafeCsvRow,
  sanitizeDownloadFileName,
} from "../../../../lib/admin-csv";
import { applyAdminResponseHeaders } from "../../../../lib/admin-proxy-policy";
import {
  guardAdminRoute,
  logAdminRouteError,
} from "../../../../lib/admin-route-guard";
import {
  buildAdminEventWhere,
  findHighFrequencyVisitorIds,
  inferEventProductSlug,
  parseAdminEventFilters,
} from "../../../../lib/admin-event-analytics";
import { prisma } from "../../../../lib/prisma";

const EXPORT_LIMIT = 10_000;
const EXPORT_BATCH_SIZE = 1_000;

const CSV_HEADER = [
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
] as const;

export async function GET(request: Request) {
  const guard = await guardAdminRoute(request, {
    capability: "read",
    routeName: "/admin/events/export",
  });
  if (!guard.ok) return guard.response;

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
  const selectedProduct =
    products.find((product) => product.slug === filters.product) || null;
  const highFrequencyVisitorIds = await findHighFrequencyVisitorIds(filters);
  const where = buildAdminEventWhere(
    filters,
    selectedProduct,
    highFrequencyVisitorIds,
  );

  const productSlugById = new Map(
    products.map((product) => [product.id, product.slug]),
  );
  const productNameBySlug = new Map(
    products.map((product) => [product.slug, product.name]),
  );
  const knownSlugs = new Set(products.map((product) => product.slug));
  const fileName = sanitizeDownloadFileName(
    `geosub-events-${filters.from}-${filters.to}.csv`,
    "geosub-events.csv",
  );
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let exportedRows = 0;
      let truncated = false;
      let cursorId: string | undefined;

      try {
        controller.enqueue(
          encoder.encode(`\uFEFF${formatSafeCsvRow(CSV_HEADER)}`),
        );

        while (exportedRows < EXPORT_LIMIT) {
          const remaining = EXPORT_LIMIT - exportedRows;
          const batchLimit = Math.min(EXPORT_BATCH_SIZE, remaining);
          const batch = await prisma.eventLog.findMany({
            where,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: batchLimit + 1,
            ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
            select: {
              id: true,
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

          const hasMore = batch.length > batchLimit;
          const pageRows = hasMore ? batch.slice(0, batchLimit) : batch;

          if (pageRows.length === 0) {
            break;
          }

          const lines: string[] = [];
          for (const event of pageRows) {
            const slug = inferEventProductSlug(
              event,
              productSlugById,
              knownSlugs,
            );
            lines.push(
              formatSafeCsvRow([
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
              ]),
            );
          }

          controller.enqueue(encoder.encode(`\r\n${lines.join("\r\n")}`));
          exportedRows += pageRows.length;
          cursorId = pageRows[pageRows.length - 1]?.id;

          if (!hasMore) {
            break;
          }

          if (exportedRows >= EXPORT_LIMIT) {
            truncated = true;
            break;
          }
        }

        try {
          await prisma.auditLog.create({
            data: {
              actorId: guard.admin.id,
              action: "export_events_csv",
              targetType: "event_log",
              newValue: {
                from: filters.from,
                to: filters.to,
                kind: filters.kind,
                quality: filters.quality,
                product: filters.product || null,
                device: filters.device || null,
                hasQuery: Boolean(filters.query),
                exportedRows,
                truncated,
              },
              note: `Exported ${exportedRows} admin event rows as CSV.`,
            },
          });
        } catch (auditError) {
          logAdminRouteError("/admin/events/export:audit", auditError, {
            actorId: guard.admin.id,
          });
        }

        controller.close();
      } catch (error) {
        logAdminRouteError("/admin/events/export", error, {
          actorId: guard.admin.id,
        });
        controller.error(error);
      }
    },
  });

  const headers = new Headers({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${fileName}"`,
  });
  applyAdminResponseHeaders(headers);

  return new Response(stream, { headers });
}
