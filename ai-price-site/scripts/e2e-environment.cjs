const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

const appDir = path.resolve(__dirname, "..");
const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

function readEnvironmentFile(fileName) {
  const filePath = path.join(appDir, fileName);
  if (!fs.existsSync(filePath)) return {};
  return dotenv.parse(fs.readFileSync(filePath));
}

function databaseName(databaseUrl) {
  return decodeURIComponent(databaseUrl.pathname.replace(/^\//, ""));
}

function assertSafeE2eDatabase(rawUrl) {
  const databaseUrl = new URL(rawUrl);
  const name = databaseName(databaseUrl);

  if (!localHosts.has(databaseUrl.hostname)) {
    throw new Error(
      `E2E refused non-local database host: ${databaseUrl.hostname}.`,
    );
  }
  if (!/^[a-z0-9_]+_e2e$/i.test(name)) {
    throw new Error(`E2E database name must end in _e2e: ${name}.`);
  }

  return databaseUrl;
}

function deriveLocalE2eUrl(rawUrl) {
  const sourceUrl = new URL(rawUrl);

  if (!localHosts.has(sourceUrl.hostname)) {
    throw new Error(
      `Cannot derive E2E database from non-local host: ${sourceUrl.hostname}.`,
    );
  }

  const sourceName = databaseName(sourceUrl);
  if (!/^[a-z0-9_]+$/i.test(sourceName)) {
    throw new Error(`Cannot derive E2E database from unsafe name: ${sourceName}.`);
  }

  sourceUrl.pathname = `/${sourceName.replace(/_e2e$/i, "")}_e2e`;
  return sourceUrl.toString();
}

function loadSafeE2eEnvironment() {
  const explicitFile = readEnvironmentFile(".env.e2e.local");
  const explicitUrl = process.env.DATABASE_URL || explicitFile.DATABASE_URL;
  let rawUrl = explicitUrl;

  if (!rawUrl) {
    const localEnvironment = {
      ...readEnvironmentFile(".env"),
      ...readEnvironmentFile(".env.local"),
    };
    if (!localEnvironment.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is missing. Create .env.e2e.local from .env.e2e.example.",
      );
    }
    rawUrl = deriveLocalE2eUrl(localEnvironment.DATABASE_URL);
  }

  const databaseUrl = assertSafeE2eDatabase(rawUrl);
  return {
    ...process.env,
    ...explicitFile,
    DATABASE_URL: databaseUrl.toString(),
    GEOSUB_ANALYTICS_CONSENT_REQUIRED: "true",
    GEOSUB_NEXT_DIST_DIR: ".next-e2e",
    PORT: "3100",
    HOSTNAME: "127.0.0.1",
  };
}

module.exports = {
  assertSafeE2eDatabase,
  loadSafeE2eEnvironment,
};
