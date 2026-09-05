import { secretsMatch } from "./secure-secret.ts";

export const GROWTH_INTELLIGENCE_API_ENABLED_ENV =
  "GEOSUB_GROWTH_INTELLIGENCE_API_ENABLED";
export const GROWTH_INTELLIGENCE_API_CONSUMERS_ENV =
  "GEOSUB_GROWTH_INTELLIGENCE_API_CONSUMERS";

export const GROWTH_INTELLIGENCE_SCOPES = [
  "growth:read",
  "reports:read",
] as const;

export type GrowthIntelligenceScope =
  (typeof GROWTH_INTELLIGENCE_SCOPES)[number];

export type GrowthIntelligenceConsumer = {
  id: string;
  token: string;
  scopes: GrowthIntelligenceScope[];
  disabled: boolean;
  notAfter: Date | null;
};

export type GrowthIntelligenceAuthorization =
  | { ok: true; consumer: Omit<GrowthIntelligenceConsumer, "token"> }
  | {
      ok: false;
      status: 401 | 403 | 404 | 503;
      code: "disabled" | "misconfigured" | "unauthorized" | "forbidden";
    };

const CONSUMER_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{1,63}$/;
const MAX_CONSUMERS = 16;
const MAX_CONFIG_BYTES = 32 * 1024;
const MIN_TOKEN_LENGTH = 32;
const MAX_TOKEN_LENGTH = 512;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseNotAfter(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error("Invalid notAfter value.");
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("Invalid notAfter value.");
  return parsed;
}

function parseScopes(value: unknown): GrowthIntelligenceScope[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("At least one growth API scope is required.");
  }

  const scopes = Array.from(new Set(value));
  if (
    scopes.some(
      (scope) =>
        typeof scope !== "string" ||
        !GROWTH_INTELLIGENCE_SCOPES.includes(scope as GrowthIntelligenceScope),
    )
  ) {
    throw new Error("Unsupported growth API scope.");
  }

  return scopes as GrowthIntelligenceScope[];
}

export function parseGrowthIntelligenceConsumers(
  value: string | null | undefined,
): GrowthIntelligenceConsumer[] {
  if (!value || Buffer.byteLength(value, "utf8") > MAX_CONFIG_BYTES) {
    throw new Error("Growth API consumer configuration is missing or too large.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Growth API consumer configuration is not valid JSON.");
  }

  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > MAX_CONSUMERS) {
    throw new Error("Growth API consumer count is invalid.");
  }

  const consumers = parsed.map((item): GrowthIntelligenceConsumer => {
    if (!isRecord(item)) throw new Error("Growth API consumer is invalid.");

    const id = typeof item.id === "string" ? item.id.trim() : "";
    const token = typeof item.token === "string" ? item.token.trim() : "";
    if (!CONSUMER_ID_PATTERN.test(id)) throw new Error("Consumer ID is invalid.");
    if (token.length < MIN_TOKEN_LENGTH || token.length > MAX_TOKEN_LENGTH) {
      throw new Error("Consumer token length is invalid.");
    }

    return {
      id,
      token,
      scopes: parseScopes(item.scopes),
      disabled: item.disabled === true,
      notAfter: parseNotAfter(item.notAfter),
    };
  });

  if (new Set(consumers.map((consumer) => consumer.id)).size !== consumers.length) {
    throw new Error("Growth API consumer IDs must be unique.");
  }

  return consumers;
}

function parseBearerCredential(value: string | null | undefined) {
  const match = value?.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) return null;

  const credential = match[1];
  const separator = credential.indexOf(".");
  if (separator < 2 || separator === credential.length - 1) return null;

  return {
    id: credential.slice(0, separator),
    token: credential.slice(separator + 1),
  };
}

export function authorizeGrowthIntelligenceRequest({
  authorization,
  requiredScope,
  enabled,
  consumerConfig,
  now = new Date(),
}: {
  authorization: string | null | undefined;
  requiredScope: GrowthIntelligenceScope;
  enabled: string | null | undefined;
  consumerConfig: string | null | undefined;
  now?: Date;
}): GrowthIntelligenceAuthorization {
  if (enabled !== "true") {
    return { ok: false, status: 404, code: "disabled" };
  }

  let consumers: GrowthIntelligenceConsumer[];
  try {
    consumers = parseGrowthIntelligenceConsumers(consumerConfig);
  } catch {
    return { ok: false, status: 503, code: "misconfigured" };
  }

  const credential = parseBearerCredential(authorization);
  if (!credential) {
    return { ok: false, status: 401, code: "unauthorized" };
  }

  const consumer = consumers.find((item) => item.id === credential.id);
  if (
    !consumer ||
    consumer.disabled ||
    (consumer.notAfter !== null && consumer.notAfter.getTime() <= now.getTime()) ||
    !secretsMatch(credential.token, consumer.token)
  ) {
    return { ok: false, status: 401, code: "unauthorized" };
  }

  if (!consumer.scopes.includes(requiredScope)) {
    return { ok: false, status: 403, code: "forbidden" };
  }

  return {
    ok: true,
    consumer: {
      id: consumer.id,
      scopes: consumer.scopes,
      disabled: false,
      notAfter: consumer.notAfter,
    },
  };
}
