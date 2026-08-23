import assert from "node:assert/strict";
import test from "node:test";
import {
  buildIndexNowPayload,
  getIndexNowConfig,
  isValidIndexNowKey,
  prepareIndexNowUrls,
  submitIndexNow,
} from "./indexnow.ts";

const environment = {
  INDEXNOW_KEY: "ABCDEF12-34567890",
  NEXT_PUBLIC_SITE_URL: "https://geosub.org",
};

test("validates the documented IndexNow key format", () => {
  assert.equal(isValidIndexNowKey("ABCDEF12-34567890"), true);
  assert.equal(isValidIndexNowKey("short"), false);
  assert.equal(isValidIndexNowKey("invalid_key"), false);
});

test("builds a same-host payload without exposing configuration surprises", () => {
  const config = getIndexNowConfig(environment);
  const payload = buildIndexNowPayload(
    ["/zh/ai-pricing/chatgpt/plus", "/zh/ai-pricing/chatgpt/plus#prices"],
    config,
  );

  assert.equal(payload.host, "geosub.org");
  assert.equal(payload.keyLocation, "https://geosub.org/indexnow-key.txt");
  assert.deepEqual(payload.urlList, [
    "https://geosub.org/zh/ai-pricing/chatgpt/plus",
  ]);
});

test("rejects URLs from another host", () => {
  const config = getIndexNowConfig(environment);
  assert.throws(
    () => prepareIndexNowUrls(["https://example.com/page"], config),
    /off-site URL/,
  );
});

test("submits the documented JSON request", async () => {
  const config = getIndexNowConfig(environment);
  let requestBody = "";
  const mockFetch: typeof fetch = async (_input, init) => {
    requestBody = String(init?.body || "");
    return new Response(null, { status: 202 });
  };

  const result = await submitIndexNow(
    ["/en/ai-pricing/chatgpt/pro-5x"],
    config,
    mockFetch,
  );

  assert.deepEqual(result, {
    accepted: true,
    status: 202,
    submittedUrlCount: 1,
  });
  assert.equal(
    JSON.parse(requestBody).urlList[0],
    "https://geosub.org/en/ai-pricing/chatgpt/pro-5x",
  );
});
