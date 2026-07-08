import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");

function loadEnvFile(filePath) {
  let text = "";
  try {
    text = readFileSync(filePath, "utf8");
  } catch {
    return;
  }

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(repoRoot, "ai-price-site", ".env.local"));
loadEnvFile(resolve(repoRoot, "ai-price-site", ".env"));

const mode = process.argv.includes("--json") ? "json" : "exec";
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(78);
}

let Client;
try {
  const requireFromSite = createRequire(resolve(repoRoot, "ai-price-site", "package.json"));
  ({ Client } = requireFromSite("pg"));
} catch (error) {
  console.error(`Cannot load pg from ai-price-site dependencies: ${error.message}`);
  process.exit(79);
}

const sql = await new Promise((resolveInput, reject) => {
  let text = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    text += chunk;
  });
  process.stdin.on("end", () => resolveInput(text));
  process.stdin.on("error", reject);
});

const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();
  const result = await client.query(sql);

  if (mode === "json") {
    const finalResult = Array.isArray(result) ? result[result.length - 1] : result;
    const firstRow = finalResult?.rows?.[0];
    if (firstRow) {
      const firstKey = Object.keys(firstRow)[0];
      const value = firstRow[firstKey];
      if (value !== null && value !== undefined) {
        process.stdout.write(typeof value === "string" ? value : JSON.stringify(value));
      }
    }
  }
} catch (error) {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
