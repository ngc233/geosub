import {readFileSync} from "node:fs";
import {pathToFileURL} from "node:url";
import {checkStoreUrl, parseGameStorePage} from "./lib/game-store-offers.mjs";

export async function collectGameOffer(target, {request = fetch, timeoutMs = 20000} = {}) {
  const signal = AbortSignal.timeout(timeoutMs);
  const limit = 6 * 1024 * 1024;
  let url = target.store_url;
  try {
    for (let hop = 0; hop <= 4; hop++) {
      checkStoreUrl(url, target);
      const response = await request(url, {signal, redirect:"manual", headers:{Accept:"text/html"}});
      if ([301,302,303,307,308].includes(response.status)) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location) throw new Error("Missing redirect location");
        url = new URL(location, url).href;
        continue;
      }
      if (!response.ok || !response.headers.get("content-type")?.toLowerCase().includes("text/html")) {
        await response.body?.cancel();
        throw new Error("Unexpected HTTP response " + response.status);
      }
      const chunks = [];
      let bytes = 0;
      for await (const chunk of response.body) {
        bytes += chunk.length;
        if (bytes > limit) throw new Error("Store page exceeds size limit");
        chunks.push(chunk);
      }
      const final = new URL(url);
      return parseGameStorePage(target, final.origin + final.pathname, Buffer.concat(chunks).toString("utf8"));
    }
    throw new Error("Redirect limit exceeded");
  } catch (error) {
    let finalUrl;
    try { const final = new URL(url); finalUrl = final.origin + final.pathname; } catch { finalUrl = null; }
    return {observed_at:new Date().toISOString(), parser_version:target.platform + "-v1", final_url:finalUrl,
      failure_reason:error.reason || (signal.aborted ? "timeout" : "fetch_error"),
      detail:error.reason ? error.message : "Could not retrieve official product page"};
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const target = JSON.parse(readFileSync(0, "utf8").replace(/^\uFEFF/, ""));
  const result = await collectGameOffer(target);
  console.log(JSON.stringify(result));
}
