import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing. Please check .env file.");
}

const adminConnectionString =
  process.env.ADMIN_DATABASE_URL?.trim() || connectionString;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  adminPrisma?: PrismaClient;
};

function getBoundedIntegerEnvironmentValue({
  name,
  fallback,
  minimum,
  maximum,
  env = process.env,
}: {
  name: string;
  fallback: number;
  minimum: number;
  maximum: number;
  env?: NodeJS.ProcessEnv;
}) {
  const configured = Number(env[name]);

  if (!Number.isFinite(configured)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(configured), minimum), maximum);
}

export function buildPublicPoolConfig(
  url: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  return {
    connectionString: url,
    application_name: env.GEOSUB_DB_APPLICATION_NAME || "geosub-web",
    max: getBoundedIntegerEnvironmentValue({
      name: "GEOSUB_DB_POOL_MAX",
      fallback: 10,
      minimum: 2,
      maximum: 30,
      env,
    }),
    connectionTimeoutMillis: getBoundedIntegerEnvironmentValue({
      name: "GEOSUB_DB_CONNECTION_TIMEOUT_MS",
      fallback: 5_000,
      minimum: 1_000,
      maximum: 30_000,
      env,
    }),
    idleTimeoutMillis: getBoundedIntegerEnvironmentValue({
      name: "GEOSUB_DB_IDLE_TIMEOUT_MS",
      fallback: 30_000,
      minimum: 5_000,
      maximum: 300_000,
      env,
    }),
    statement_timeout: getBoundedIntegerEnvironmentValue({
      name: "GEOSUB_DB_STATEMENT_TIMEOUT_MS",
      fallback: 15_000,
      minimum: 2_000,
      maximum: 60_000,
      env,
    }),
    keepAlive: true,
  };
}

export function buildAdminPoolConfig(
  url: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  return {
    connectionString: env.ADMIN_DATABASE_URL?.trim() || url,
    application_name: env.GEOSUB_ADMIN_DB_APPLICATION_NAME || "geosub-admin",
    max: getBoundedIntegerEnvironmentValue({
      name: "GEOSUB_ADMIN_DB_POOL_MAX",
      fallback: 4,
      minimum: 1,
      maximum: 15,
      env,
    }),
    connectionTimeoutMillis: getBoundedIntegerEnvironmentValue({
      name: "GEOSUB_ADMIN_DB_CONNECTION_TIMEOUT_MS",
      fallback: 5_000,
      minimum: 1_000,
      maximum: 30_000,
      env,
    }),
    idleTimeoutMillis: getBoundedIntegerEnvironmentValue({
      name: "GEOSUB_ADMIN_DB_IDLE_TIMEOUT_MS",
      fallback: 30_000,
      minimum: 5_000,
      maximum: 300_000,
      env,
    }),
    statement_timeout: getBoundedIntegerEnvironmentValue({
      name: "GEOSUB_ADMIN_DB_STATEMENT_TIMEOUT_MS",
      fallback: 30_000,
      minimum: 2_000,
      maximum: 120_000,
      env,
    }),
    keepAlive: true,
  };
}

function createPrismaClient() {
  const adapter = new PrismaPg(buildPublicPoolConfig(connectionString!), {
    onPoolError(error) {
      console.error(`[database-pool] ${error.message}`);
    },
  });

  return new PrismaClient({ adapter });
}

function createAdminPrismaClient() {
  const adapter = new PrismaPg(buildAdminPoolConfig(adminConnectionString), {
    onPoolError(error) {
      console.error(`[admin-database-pool] ${error.message}`);
    },
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
export const adminPrisma =
  globalForPrisma.adminPrisma ?? createAdminPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.adminPrisma = adminPrisma;
}
