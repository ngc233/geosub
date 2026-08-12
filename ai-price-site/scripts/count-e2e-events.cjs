#!/usr/bin/env node

const { Client } = require("pg");
const { loadSafeE2eEnvironment } = require("./e2e-environment.cjs");

async function main() {
  const environment = loadSafeE2eEnvironment();
  const client = new Client({ connectionString: environment.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query("SELECT COUNT(*)::int AS count FROM event_logs");
    process.stdout.write(String(result.rows[0].count));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
