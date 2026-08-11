import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing. Please check .env file.");
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function getBoundedIntegerEnvironmentValue({
  name,
  fallback,
  minimum,
  maximum,
}: {
  name: string;
  fallback: number;
  minimum: number;
  maximum: number;
}) {
  const configured = Number(process.env[name]);

  if (!Number.isFinite(configured)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(configured), minimum), maximum);
}

function createPrismaClient() {
  const adapter = new PrismaPg(
    {
      connectionString,
      application_name: process.env.GEOSUB_DB_APPLICATION_NAME || "geosub-web",
      max: getBoundedIntegerEnvironmentValue({
        name: "GEOSUB_DB_POOL_MAX",
        fallback: 10,
        minimum: 2,
        maximum: 30,
      }),
      connectionTimeoutMillis: getBoundedIntegerEnvironmentValue({
        name: "GEOSUB_DB_CONNECTION_TIMEOUT_MS",
        fallback: 5_000,
        minimum: 1_000,
        maximum: 30_000,
      }),
      idleTimeoutMillis: getBoundedIntegerEnvironmentValue({
        name: "GEOSUB_DB_IDLE_TIMEOUT_MS",
        fallback: 30_000,
        minimum: 5_000,
        maximum: 300_000,
      }),
      keepAlive: true,
    },
    {
      onPoolError(error) {
        console.error(`[database-pool] ${error.message}`);
      },
    },
  );

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
