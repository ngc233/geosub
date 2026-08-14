import {
  normalizeProductLogoSlug,
  readStoredProductLogo,
} from "../../../../lib/product-logo-storage";
import { getCurrentAdmin } from "../../../../lib/admin-auth";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

function notFoundResponse() {
  return new Response("Logo not found", {
    status: 404,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const admin = await getCurrentAdmin();
  if (!admin) return notFoundResponse();

  const { slug: requestedSlug } = await context.params;
  const slug = normalizeProductLogoSlug(requestedSlug);

  if (!slug || slug !== requestedSlug) {
    return notFoundResponse();
  }

  const logo = await readStoredProductLogo(slug);
  if (!logo) return notFoundResponse();

  const body = logo.data.buffer.slice(
    logo.data.byteOffset,
    logo.data.byteOffset + logo.data.byteLength,
  ) as ArrayBuffer;

  return new Response(body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${logo.fileName}"`,
      "Content-Length": String(logo.data.byteLength),
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Type": logo.contentType,
      ETag: `"${logo.checksum}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
