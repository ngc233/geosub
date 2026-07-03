const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
require("dotenv").config();

const supportedLocales = new Set(["ZH", "EN"]);
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({
  adapter,
});

function cleanHref(href) {
  const withoutHash = href.split("#")[0];
  const withoutQuery = withoutHash.split("?")[0];

  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
    return withoutQuery.slice(0, -1);
  }

  return withoutQuery || "/";
}

function routeExists(baseDir, segments) {
  if (!fs.existsSync(baseDir)) return false;

  if (segments.length === 0) {
    return (
      fs.existsSync(path.join(baseDir, "page.tsx")) ||
      fs.existsSync(path.join(baseDir, "route.ts"))
    );
  }

  const [currentSegment, ...restSegments] = segments;
  const exactDir = path.join(baseDir, currentSegment);

  if (fs.existsSync(exactDir) && routeExists(exactDir, restSegments)) {
    return true;
  }

  const dynamicDirs = fs
    .readdirSync(baseDir, {
      withFileTypes: true,
    })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name.startsWith("[") &&
        entry.name.endsWith("]"),
    );

  return dynamicDirs.some((entry) =>
    routeExists(path.join(baseDir, entry.name), restSegments),
  );
}

function shouldPublish(item) {
  if (!supportedLocales.has(item.locale)) {
    return {
      publish: false,
      reason: "unsupported locale",
    };
  }

  if (item.external || item.href.startsWith("https://") || item.href.startsWith("http://")) {
    return {
      publish: true,
      reason: "external link",
    };
  }

  if (!item.href.startsWith("/")) {
    return {
      publish: false,
      reason: "invalid internal href",
    };
  }

  const segments = cleanHref(item.href).split("/").filter(Boolean);
  const localeSegment = segments[0];

  if (!["zh", "en"].includes(localeSegment)) {
    return {
      publish: false,
      reason: "missing locale prefix",
    };
  }

  const exists = routeExists(path.join(process.cwd(), "app"), segments);

  return {
    publish: exists,
    reason: exists ? "route exists" : "route missing",
  };
}

async function main() {
  const items = await prisma.navigationItem.findMany({
    orderBy: [
      { locale: "asc" },
      { position: "asc" },
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
  });
  const changes = [];

  for (const item of items) {
    const result = shouldPublish(item);
    const nextStatus = result.publish ? "PUBLISHED" : "DRAFT";

    if (item.status !== nextStatus) {
      await prisma.navigationItem.update({
        where: {
          id: item.id,
        },
        data: {
          status: nextStatus,
        },
      });

      changes.push({
        label: item.label,
        href: item.href,
        from: item.status,
        to: nextStatus,
        reason: result.reason,
      });
    }
  }

  console.log(`Navigation items checked: ${items.length}`);
  console.log(`Status changes: ${changes.length}`);

  for (const change of changes) {
    console.log(
      `${change.from} -> ${change.to}\t${change.label}\t${change.href}\t${change.reason}`,
    );
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
