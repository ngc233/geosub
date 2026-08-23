const INDEXNOW_DEFAULT_ENDPOINT = "https://api.indexnow.org/indexnow";
const INDEXNOW_KEY_PATTERN = /^[A-Za-z0-9-]{8,128}$/;
const INDEXNOW_MAX_URLS = 10_000;

export type IndexNowConfig = {
  endpoint: string;
  host: string;
  key: string;
  keyLocation: string;
  siteOrigin: string;
};

export type IndexNowSubmitResult = {
  accepted: boolean;
  status: number;
  submittedUrlCount: number;
};

export function isValidIndexNowKey(
  value: string | undefined | null,
): value is string {
  return Boolean(value && INDEXNOW_KEY_PATTERN.test(value));
}

function normalizeSiteOrigin(value: string | undefined) {
  const url = new URL(value || "https://geosub.org");
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use http or https.");
  }
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function getIndexNowConfig(
  environment: Record<string, string | undefined> = process.env,
): IndexNowConfig {
  const key = environment.INDEXNOW_KEY?.trim();
  if (!isValidIndexNowKey(key)) {
    throw new Error(
      "INDEXNOW_KEY must contain 8-128 letters, numbers, or dashes.",
    );
  }

  const siteOrigin = normalizeSiteOrigin(environment.NEXT_PUBLIC_SITE_URL);
  const siteUrl = new URL(siteOrigin);
  const endpoint = new URL(
    environment.INDEXNOW_ENDPOINT || INDEXNOW_DEFAULT_ENDPOINT,
  ).toString();
  const keyLocation = new URL(
    environment.INDEXNOW_KEY_LOCATION || "/indexnow-key.txt",
    siteOrigin,
  ).toString();

  if (new URL(keyLocation).hostname !== siteUrl.hostname) {
    throw new Error("INDEXNOW_KEY_LOCATION must be hosted on the site hostname.");
  }

  return {
    endpoint,
    host: siteUrl.hostname,
    key,
    keyLocation,
    siteOrigin,
  };
}

export function prepareIndexNowUrls(
  values: readonly string[],
  config: Pick<IndexNowConfig, "host" | "siteOrigin">,
) {
  const normalizedUrls = values.map((value) => {
    const url = new URL(value, config.siteOrigin);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error(`IndexNow URL must use http or https: ${url}`);
    }
    if (url.hostname !== config.host) {
      throw new Error(`Refusing to submit an off-site URL: ${url}`);
    }
    url.hash = "";
    return url.toString();
  });
  const urls = [...new Set(normalizedUrls)];
  if (urls.length === 0) throw new Error("At least one URL is required.");
  if (urls.length > INDEXNOW_MAX_URLS) {
    throw new Error(`IndexNow accepts at most ${INDEXNOW_MAX_URLS} URLs per request.`);
  }
  return urls;
}

export function buildIndexNowPayload(
  values: readonly string[],
  config: IndexNowConfig,
) {
  return {
    host: config.host,
    key: config.key,
    keyLocation: config.keyLocation,
    urlList: prepareIndexNowUrls(values, config),
  };
}

export async function submitIndexNow(
  values: readonly string[],
  config: IndexNowConfig,
  fetchImplementation: typeof fetch = fetch,
): Promise<IndexNowSubmitResult> {
  const payload = buildIndexNowPayload(values, config);
  const response = await fetchImplementation(config.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const responseText = (await response.text()).slice(0, 500);
    throw new Error(
      `IndexNow submission failed with HTTP ${response.status}${responseText ? `: ${responseText}` : ""}`,
    );
  }

  return {
    accepted: true,
    status: response.status,
    submittedUrlCount: payload.urlList.length,
  };
}
