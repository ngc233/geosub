import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

for (const fileName of [".env.local", ".env"]) {
  const path = resolve(process.cwd(), fileName);
  if (existsSync(path)) config({ path, override: false, quiet: true });
}

const [{ buildDailyOperationsBrief }, { getDailyOperationsSummary }, { deliverDailyOperationsBrief }] = await Promise.all([
  import("../lib/daily-operations-brief.ts"),
  import("../lib/admin-daily-operations.ts"),
  import("../lib/operations-notification.ts"),
]);

const operations = await getDailyOperationsSummary();
const brief = buildDailyOperationsBrief(operations);
const result = await deliverDailyOperationsBrief(brief);

console.log(JSON.stringify({
  title: brief.title,
  summary: brief.summary,
  counts: brief.counts,
  delivery: result,
}, null, 2));

if (result.status === "failed") process.exitCode = 1;
