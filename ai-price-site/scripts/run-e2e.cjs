#!/usr/bin/env node

const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");
const { loadSafeE2eEnvironment } = require("./e2e-environment.cjs");

const appDir = path.resolve(__dirname, "..");
const playwrightCli = require.resolve("@playwright/test/cli", { paths: [appDir] });
const nextCli = require.resolve("next/dist/bin/next", { paths: [appDir] });

function run(label, command, args, environment) {
  console.log(`\n${label}`);
  const result = spawnSync(command, args, {
    cwd: appDir,
    env: environment,
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    const detail = result.error ? ` ${result.error.message}` : "";
    throw new Error(
      `${label} failed with exit code ${result.status ?? "unknown"}.${detail}`,
    );
  }
}

function startServer(environment) {
  console.log("\nStarting isolated E2E server");
  return spawn(
    process.execPath,
    [nextCli, "start", "--hostname", "127.0.0.1", "--port", "3100"],
    {
      cwd: appDir,
      env: environment,
      stdio: "inherit",
      shell: false,
    },
  );
}

async function waitForServer(server) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`E2E server exited early with code ${server.exitCode}.`);
    }
    try {
      const response = await fetch("http://127.0.0.1:3100/admin-login");
      if (response.ok) {
        return;
      }
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("E2E server did not become ready within 120 seconds.");
}

function stopServer(server) {
  if (!server || server.exitCode !== null) {
    return;
  }
  console.log("\nStopping isolated E2E server");
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
      shell: false,
    });
    return;
  }
  server.kill("SIGTERM");
}

async function ensureDatabase(environment) {
  const targetUrl = new URL(environment.DATABASE_URL);
  const targetName = decodeURIComponent(targetUrl.pathname.slice(1));
  const adminUrl = new URL(targetUrl);
  adminUrl.pathname = "/postgres";
  const client = new Client({ connectionString: adminUrl.toString() });

  await client.connect();
  try {
    const existing = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [targetName],
    );
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE "${targetName}"`);
      console.log(`Created isolated E2E database: ${targetName}`);
    }
  } finally {
    await client.end();
  }
}

async function main() {
  const environment = loadSafeE2eEnvironment();
  await ensureDatabase(environment);
  run(
    "Preparing isolated E2E schema",
    process.execPath,
    [path.join(__dirname, "migrate-database.cjs")],
    environment,
  );
  run(
    "Seeding isolated E2E fixtures",
    process.execPath,
    [path.join(__dirname, "seed-e2e.cjs")],
    environment,
  );
  fs.rmSync(path.join(appDir, environment.GEOSUB_NEXT_DIST_DIR), {
    force: true,
    recursive: true,
  });
  run("Building isolated E2E application", process.execPath, [nextCli, "build"], environment);
  const server = startServer(environment);
  try {
    await waitForServer(server);
    run("Running Playwright E2E", process.execPath, [playwrightCli, "test"], environment);
  } finally {
    stopServer(server);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
