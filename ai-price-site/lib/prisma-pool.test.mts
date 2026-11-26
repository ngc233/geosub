import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadPrismaModule(envOverrides: Record<string, string | undefined> = {}) {
  const code = ts.transpileModule(
    readFileSync(new URL("./prisma.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;

  const adapterConfigs: Array<Record<string, unknown>> = [];
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalAdminUrl = process.env.ADMIN_DATABASE_URL;
  process.env.DATABASE_URL =
    envOverrides.DATABASE_URL ?? "postgresql://localhost:5432/geosub";
  if (envOverrides.ADMIN_DATABASE_URL === undefined) {
    delete process.env.ADMIN_DATABASE_URL;
  } else {
    process.env.ADMIN_DATABASE_URL = envOverrides.ADMIN_DATABASE_URL;
  }

  const fakeGlobal = {} as Record<string, unknown>;
  const mod = {
    exports: {} as {
      prisma: unknown;
      adminPrisma: unknown;
      buildPublicPoolConfig: (
        url: string,
        env?: Record<string, string | undefined>,
      ) => Record<string, unknown>;
      buildAdminPoolConfig: (
        url: string,
        env?: Record<string, string | undefined>,
      ) => Record<string, unknown>;
    },
  };

  try {
    new Function("require", "module", "exports", "globalThis", code)(
      (name: string) => {
        if (name === "@prisma/client") {
          return {
            PrismaClient: class {
              adapter: unknown;
              constructor({ adapter }: { adapter: unknown }) {
                this.adapter = adapter;
              }
            },
          };
        }
        if (name === "@prisma/adapter-pg") {
          return {
            PrismaPg: class {
              config: Record<string, unknown>;
              constructor(config: Record<string, unknown>) {
                this.config = config;
                adapterConfigs.push(config);
              }
            },
          };
        }
        return require(name);
      },
      mod,
      mod.exports,
      fakeGlobal,
    );
  } finally {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalAdminUrl === undefined) delete process.env.ADMIN_DATABASE_URL;
    else process.env.ADMIN_DATABASE_URL = originalAdminUrl;
  }

  return { exports: mod.exports, adapterConfigs };
}

test("public and admin Prisma pools use separate bounded defaults and application names", () => {
  const { exports: prismaMod, adapterConfigs } = loadPrismaModule();

  assert.notStrictEqual(prismaMod.prisma, prismaMod.adminPrisma);
  assert.equal(adapterConfigs.length, 2);

  const publicCfg = prismaMod.buildPublicPoolConfig(
    "postgresql://localhost:5432/geosub",
    {},
  );
  assert.equal(publicCfg.application_name, "geosub-web");
  assert.equal(publicCfg.max, 10);
  assert.equal(publicCfg.statement_timeout, 15_000);

  const adminCfg = prismaMod.buildAdminPoolConfig(
    "postgresql://localhost:5432/geosub",
    {},
  );
  assert.equal(adminCfg.application_name, "geosub-admin");
  assert.equal(adminCfg.max, 4);
  assert.equal(adminCfg.statement_timeout, 30_000);
  assert.equal(
    adminCfg.connectionString,
    "postgresql://localhost:5432/geosub",
  );
});

test("pool configs clamp extreme env values and support ADMIN_DATABASE_URL override", () => {
  const { exports: prismaMod } = loadPrismaModule();

  const clampedPublic = prismaMod.buildPublicPoolConfig(
    "postgresql://localhost:5432/geosub",
    {
      GEOSUB_DB_POOL_MAX: "999",
      GEOSUB_DB_STATEMENT_TIMEOUT_MS: "500",
    },
  );
  assert.equal(clampedPublic.max, 30);
  assert.equal(clampedPublic.statement_timeout, 2_000);

  const customAdmin = prismaMod.buildAdminPoolConfig(
    "postgresql://localhost:5432/geosub",
    {
      ADMIN_DATABASE_URL: "postgresql://localhost:5432/geosub_admin_role",
      GEOSUB_ADMIN_DB_APPLICATION_NAME: "geosub-admin-ops",
      GEOSUB_ADMIN_DB_POOL_MAX: "99",
      GEOSUB_ADMIN_DB_STATEMENT_TIMEOUT_MS: "250000",
    },
  );
  assert.equal(
    customAdmin.connectionString,
    "postgresql://localhost:5432/geosub_admin_role",
  );
  assert.equal(customAdmin.application_name, "geosub-admin-ops");
  assert.equal(customAdmin.max, 15);
  assert.equal(customAdmin.statement_timeout, 120_000);
});

test("heavy admin query, export, and review modules use the isolated adminPrisma pool", () => {
  const heavyAdminFiles = [
    "../app/admin/queries.ts",
    "../app/admin/events/export/route.ts",
    "../app/admin/audit-logs/queries.ts",
    "../app/admin/data-quality/queries.ts",
    "../app/admin/review/queries.ts",
    "./admin-price-review.ts",
  ];

  for (const file of heavyAdminFiles) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(
      source,
      /import\s*\{\s*adminPrisma\b/,
      `${file} must use adminPrisma to stay isolated from public traffic`,
    );
  }
});
