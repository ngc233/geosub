import { createHash } from "node:crypto";
import sanitizeHtml from "sanitize-html";
import { CONTENT_PATH, type OverviewContent } from "./managed-content.ts";

export const CONTENT_CANONICAL = `https://geosub.org${CONTENT_PATH}`;
export type ReadbackExpected = {
  title?: string; description?: string; heading?: string;
  version: string; modeGeneration: string;
  content?: OverviewContent | null;
};
export type ReadbackEvidence = {
  checkedAt: string; htmlHash: string; outputHashes: Record<string, string>;
  version: string; modeGeneration: string; cacheStatus: string | null;
};
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const normalize = (text: string) => text.replace(/\s+/gu, " ").trim();

/** Parse actual HTML, never strings embedded inside React/script payloads. */
export function verifyContentHtml(html: string, expected: ReadbackExpected): ReadbackEvidence {
  const values: Record<string, string[]> = {};
  const add = (key: string, value: string) => (values[key] ??= []).push(value);
  let editorialDepth = 0;
  let depth = 0;
  const editorial: string[] = [];
  const sources: string[] = [];
  const questions: string[] = [];
  const answers: string[] = [];
  const structuredFaqs: unknown[] = [];
  sanitizeHtml(html, {
    allowedTags: ["title", "h1", "main", "meta", "link", "span", "strong", "em", "section", "h2", "p", "a", "summary", "script"],
    allowedAttributes: false,
    allowVulnerableTags: true, // Parser only: the sanitized result is never rendered.
    onOpenTag(name, attrs) {
      depth++;
      if (attrs["data-managed-editorial"] === "true") editorialDepth = depth;
      if (attrs["data-managed-source"] === "true" && name === "a") sources.push(attrs.href ?? "");
      if (name === "meta") {
        const key = attrs.name || attrs.property;
        if (["description", "og:description", "twitter:description"].includes(key)) add(key, attrs.content ?? "");
      }
      if (name === "link" && (attrs.rel || "").toLowerCase().split(/\s+/).includes("canonical")) add("canonical", attrs.href ?? "");
      if (name === "main" && Object.hasOwn(attrs, "data-content-version")) {
        add("version", attrs["data-content-version"] ?? "");
        add("modeGeneration", attrs["data-content-mode-generation"] ?? "");
        add("kind", attrs["data-content-kind"] ?? "");
      }
    },
    onCloseTag() {
      if (depth === editorialDepth) editorialDepth = 0;
      depth--;
    },
    exclusiveFilter(frame) {
      if (frame.attribs["data-managed-faq-question"] === "true") questions.push(normalize(frame.text));
      if (frame.attribs["data-managed-faq-answer"] === "true") answers.push(normalize(frame.text));
      if (frame.tag === "script" && frame.attribs.type === "application/ld+json") {
        try {
          const walk = (node: unknown) => {
            if (Array.isArray(node)) { node.forEach(walk); return; }
            if (!node || typeof node !== "object") return;
            const value = node as Record<string, unknown>;
            if (value["@type"] === "FAQPage") structuredFaqs.push(value.mainEntity);
            if (value["@graph"]) walk(value["@graph"]);
          };
          walk(JSON.parse(frame.text));
        } catch { throw new Error("Content readback mismatch: structured data"); }
      }
      if (editorialDepth && (frame.tag === "h2" || frame.tag === "p")) editorial.push(normalize(frame.text));
      if (frame.tag === "title" || frame.tag === "h1") add(frame.tag, normalize(frame.text));
      return false;
    },
  });
  const target: Record<string, string> = {
    title: normalize(expected.title ?? values.title?.[0] ?? ""), h1: normalize(expected.heading ?? values.h1?.[0] ?? ""),
    description: expected.description ?? values.description?.[0] ?? "", "og:description": expected.description ?? values.description?.[0] ?? "",
    "twitter:description": expected.description ?? values.description?.[0] ?? "", canonical: CONTENT_CANONICAL,
    version: expected.version, modeGeneration: expected.modeGeneration,
  };
  if (expected.content === null) {
    target.kind = "fallback";
    if (editorial.length || sources.length || questions.length || answers.length) throw new Error("Content readback mismatch: fallback contains managed content");
    target.faq = JSON.stringify(structuredFaqs);
    values.faq = [target.faq];
  }
  if (expected.content) {
    const expectedEditorial = expected.content.sections.flatMap((section) => [normalize(section.heading), normalize(section.body)]);
    if (JSON.stringify(editorial) !== JSON.stringify(expectedEditorial) || JSON.stringify(sources) !== JSON.stringify(expected.content.sources)) throw new Error("Content readback mismatch: editorial or sources");
    const expectedQuestions = expected.content.faqs.map((faq) => normalize(faq.q));
    const expectedAnswers = expected.content.faqs.map((faq) => normalize(faq.a));
    const expectedStructured = expected.content.faqs.map((faq) => ({"@type":"Question",name:faq.q,acceptedAnswer:{"@type":"Answer",text:faq.a}}));
    if (JSON.stringify(questions) !== JSON.stringify(expectedQuestions) || JSON.stringify(answers) !== JSON.stringify(expectedAnswers) ||
      JSON.stringify(structuredFaqs) !== JSON.stringify(expectedStructured.length ? [expectedStructured] : [])) throw new Error("Content readback mismatch: FAQ");
    target.faq = JSON.stringify(expectedStructured);
    values.faq = [JSON.stringify(expectedStructured)];
    target.editorial = JSON.stringify(expectedEditorial);
    target.sources = JSON.stringify(expected.content.sources);
    values.editorial = [JSON.stringify(editorial)];
    values.sources = [JSON.stringify(sources)];
  }
  const mismatches = Object.keys(target).filter((key) => !target[key] || values[key]?.length !== 1 || values[key][0] !== target[key]);
  if (mismatches.length) throw new Error(`Content readback mismatch: ${mismatches.join(", ")}`);
  return { checkedAt: new Date().toISOString(), htmlHash: hash(html), outputHashes: Object.fromEntries(Object.entries(target).map(([key, value]) => [key, hash(value)])), version: expected.version, modeGeneration: expected.modeGeneration, cacheStatus: null };
}

export type HttpClient = typeof fetch;
async function boundedText(response: Response, limit: number) {
  if (!response.body) throw new Error("Empty response");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) return text + decoder.decode();
      bytes += chunk.value.byteLength;
      if (bytes > limit) throw new Error("Response too large");
      text += decoder.decode(chunk.value, { stream: true });
    }
  } finally { await reader.cancel().catch(() => {}); }
}

/** Configuration belongs to the server, not the admin form. No arbitrary URLs. */
export async function readContentEndpoint(kind: "origin" | "public", originPort: number, expected: ReadbackExpected, http: HttpClient = fetch) {
  if (!Number.isSafeInteger(originPort) || originPort < 1024 || originPort > 65535) throw new Error("Invalid origin port");
  const url = kind === "origin" ? `http://127.0.0.1:${originPort}${CONTENT_PATH}` : CONTENT_CANONICAL;
  try {
    const response = await http(url, {
      redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10_000),
      headers: kind === "origin" ? { Host: "geosub.org", Accept: "text/html" } : { Accept: "text/html" },
    });
    if (response.status !== 200 || !response.headers.get("content-type")?.toLowerCase().includes("text/html")) throw new Error("Invalid HTML response");
    const evidence = verifyContentHtml(await boundedText(response, 3_000_000), expected);
    return { ...evidence, cacheStatus: response.headers.get("cf-cache-status") };
  } catch { throw new Error(`${kind} content readback failed`); }
}

/** Only usable after the single-URL/no-custom-key cache policy has been audited. */
export async function purgeContentUrl(config: { zoneId: string; token: string; cachePolicy: "unverified" | "audited-single-url" }, http: HttpClient = fetch) {
  if (config.cachePolicy !== "audited-single-url" || !/^[a-f0-9]{32}$/i.test(config.zoneId) || !config.token || /[\r\n]/.test(config.token)) throw new Error("Content purge configuration is not ready");
  try {
    const response = await http(`https://api.cloudflare.com/client/v4/zones/${config.zoneId}/purge_cache`, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ files: [CONTENT_CANONICAL] }),
    });
    if (response.status !== 200) throw new Error("Purge rejected");
    const result = JSON.parse(await boundedText(response, 64_000));
    if (result.success !== true) throw new Error("Purge rejected");
    return { acceptedAt: new Date().toISOString(), url: CONTENT_CANONICAL };
  } catch { throw new Error("Content CDN purge failed"); }
}

export type DistributionChecks = {
  /** Must check durable attempt identity, lease owner and fence immediately. */
  assertCurrent: () => Promise<void>;
  invalidateOrigin: () => Promise<void>;
  origin: () => Promise<ReadbackEvidence>;
  purge: () => Promise<{ acceptedAt: string; url: string }>;
  public: () => Promise<ReadbackEvidence>;
};
export type DistributionResult = {
  status: "verified" | "failed" | "superseded";
  stage: "admission" | "invalidate" | "origin" | "purge" | "public" | "complete";
  origin?: ReadbackEvidence; public?: ReadbackEvidence;
  purge?: { acceptedAt: string; url: string };
};
/** The caller must persist this evidence under the same lease/fence transaction.
 * A returned verified result alone is not a committed publish receipt.
 */
export async function verifyContentDistribution(checks: DistributionChecks): Promise<DistributionResult> {
  const result: DistributionResult = { status: "failed", stage: "admission" };
  const current = async () => {
    try { await checks.assertCurrent(); return true; }
    catch { result.status = "superseded"; return false; }
  };
  try {
    if (!await current()) return result;
    result.stage = "invalidate";
    await checks.invalidateOrigin();
    if (!await current()) return result;
    result.stage = "origin";
    result.origin = await checks.origin();
    if (!await current()) return result;
    result.stage = "purge";
    result.purge = await checks.purge();
    if (result.purge.url !== CONTENT_CANONICAL) throw new Error("Unexpected purge scope");
    if (!await current()) return result;
    result.stage = "public";
    result.public = await checks.public();
    if (result.origin.version !== result.public.version || result.origin.modeGeneration !== result.public.modeGeneration || Object.entries(result.origin.outputHashes).some(([key, value]) => result.public?.outputHashes[key] !== value)) throw new Error("Readback evidence differs");
    if (!await current()) return result;
    return { ...result, status: "verified", stage: "complete" };
  } catch { return result; }
}
