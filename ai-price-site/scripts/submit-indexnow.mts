import "dotenv/config";
import {
  buildIndexNowPayload,
  getIndexNowConfig,
  submitIndexNow,
} from "../lib/indexnow.ts";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const urls = args.filter((arg) => arg !== "--dry-run");

if (urls.length === 0) {
  throw new Error(
    "Provide one or more GeoSub URLs or paths. Example: npm run seo:indexnow -- --dry-run /zh/ai-pricing/chatgpt/plus",
  );
}

const config = getIndexNowConfig();
const payload = buildIndexNowPayload(urls, config);

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        endpoint: config.endpoint,
        host: payload.host,
        keyLocation: payload.keyLocation,
        urlList: payload.urlList,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const result = await submitIndexNow(urls, config);
console.log(
  JSON.stringify(
    {
      accepted: result.accepted,
      status: result.status,
      submittedUrlCount: result.submittedUrlCount,
    },
    null,
    2,
  ),
);
