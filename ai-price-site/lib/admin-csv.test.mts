import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import {
  formatSafeCsvCell,
  formatSafeCsvRow,
  neutralizeCsvFormula,
  sanitizeDownloadFileName,
} from "./admin-csv.ts";
import * as proxyPolicy from "./admin-proxy-policy.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");

test("neutralizeCsvFormula prefixes spreadsheet formula triggers including leading whitespace", () => {
  assert.equal(neutralizeCsvFormula("=CMD|' /C calc'!A0"), "'=CMD|' /C calc'!A0");
  assert.equal(neutralizeCsvFormula("+2+3"), "'+2+3");
  assert.equal(neutralizeCsvFormula("-10+cmd"), "'-10+cmd");
  assert.equal(neutralizeCsvFormula("@SUM(1+1)"), "'@SUM(1+1)");
  assert.equal(neutralizeCsvFormula("\t=1+1"), "'\t=1+1");
  assert.equal(neutralizeCsvFormula("\r=1+1"), "'\r=1+1");
  assert.equal(neutralizeCsvFormula("  =HYPERLINK(\"https://evil\")"), "'  =HYPERLINK(\"https://evil\")");
  assert.equal(neutralizeCsvFormula("ChatGPT Plus"), "ChatGPT Plus");
  assert.equal(neutralizeCsvFormula("2026-11-26T10:00:00.000Z"), "2026-11-26T10:00:00.000Z");
  assert.equal(neutralizeCsvFormula(""), "");
});

test("formatSafeCsvCell escapes quotes, commas, newlines, and formula payloads", () => {
  assert.equal(
    formatSafeCsvCell('=HYPERLINK("https://evil.example","Click")'),
    `"'=HYPERLINK(""https://evil.example"",""Click"")"`,
  );
  assert.equal(formatSafeCsvCell("hello, world"), '"hello, world"');
  assert.equal(formatSafeCsvCell("line1\nline2"), '"line1\nline2"');
  assert.equal(formatSafeCsvCell(null), "");
  assert.equal(
    formatSafeCsvRow(["普通标题", "=1+1", "a,b"]),
    '普通标题,\'=1+1,"a,b"',
  );
});

test("sanitizeDownloadFileName strips header injection characters", () => {
  assert.equal(
    sanitizeDownloadFileName('geosub-events-2026-11-01-2026-11-26.csv'),
    "geosub-events-2026-11-01-2026-11-26.csv",
  );
  assert.equal(
    sanitizeDownloadFileName('bad"\r\nX-Injected: 1.csv'),
    "bad-X-Injected-1.csv",
  );
  assert.equal(sanitizeDownloadFileName("///", "fallback.csv"), "fallback.csv");
});

test("events export streams batched cursor rows, neutralizes formulas, sets headers, and audits export", async () => {
  const code = ts.transpileModule(
    readFileSync(
      new URL("../app/admin/events/export/route.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;

  const findManyCalls: Array<Record<string, unknown>> = [];
  const audits: Array<Record<string, unknown>> = [];
  const allEvents = [
    {
      id: "evt-1",
      eventKey: "page_view",
      eventName: "Page View",
      pagePath: "/zh/ai-pricing/chatgpt",
      pageTitle: '=CMD|" /C calc"!A0',
      referrer: "@evil-referrer",
      locale: "zh",
      anonymousId: "1234567890abcdef",
      productId: "prod-1",
      buttonKey: null,
      placement: null,
      source: "direct",
      deviceType: "desktop",
      createdAt: new Date("2026-11-25T10:00:00.000Z"),
    },
    {
      id: "evt-2",
      eventKey: "click_official",
      eventName: "Click Official",
      pagePath: "/en/ai-pricing/chatgpt",
      pageTitle: "ChatGPT Pricing, Global",
      referrer: "https://google.com",
      locale: "en",
      anonymousId: "abcdef1234567890",
      productId: "prod-1",
      buttonKey: "official",
      placement: "hero",
      source: "google",
      deviceType: "mobile",
      createdAt: new Date("2026-11-25T09:00:00.000Z"),
    },
  ];

  const prismaStub = {
    product: {
      findMany: async () => [{ id: "prod-1", slug: "chatgpt", name: "ChatGPT" }],
    },
    eventLog: {
      findMany: async (args: Record<string, unknown>) => {
        findManyCalls.push(args);
        if (findManyCalls.length === 1) {
          return allEvents;
        }
        return [];
      },
    },
    auditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        audits.push(data);
      },
    },
  };

  const mod = { exports: {} as { GET: (req: Request) => Promise<Response> } };
  new Function("require", "module", "exports", code)(
    (name: string) => {
      if (name.endsWith("admin-csv")) {
        return { formatSafeCsvRow, sanitizeDownloadFileName };
      }
      if (name.endsWith("admin-proxy-policy")) return proxyPolicy;
      if (name.endsWith("admin-route-guard")) {
        return {
          guardAdminRoute: async () => ({
            ok: true,
            admin: { id: "admin-1", role: "OWNER" },
          }),
          logAdminRouteError: () => "req-1",
        };
      }
      if (name.endsWith("admin-event-analytics")) {
        return {
          parseAdminEventFilters: () => ({
            from: "2026-11-01",
            to: "2026-11-26",
            kind: "all",
            quality: "all",
            product: "",
            device: "",
            query: "",
          }),
          findHighFrequencyVisitorIds: async () => [],
          buildAdminEventWhere: () => ({}),
          inferEventProductSlug: () => "chatgpt",
        };
      }
      if (name.endsWith("prisma")) return { prisma: prismaStub };
      return require(name);
    },
    mod,
    mod.exports,
  );

  const response = await mod.exports.GET(
    new Request("https://geosub.org/admin/events/export?from=2026-11-01&to=2026-11-26"),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/csv; charset=utf-8");
  assert.match(response.headers.get("cache-control") || "", /private, no-store/);
  assert.match(response.headers.get("x-robots-tag") || "", /noindex/);

  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.deepEqual(Array.from(bytes.slice(0, 3)), [0xef, 0xbb, 0xbf]);
  const csvText = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
  assert.ok(csvText.startsWith("\uFEFFcreated_at_utc,"));
  assert.match(csvText, /"'=CMD\|"" \/C calc""!A0"/);
  assert.match(csvText, /'@evil-referrer/);
  assert.match(csvText, /"ChatGPT Pricing, Global"/);
  assert.equal(audits.length, 1);
  assert.equal(audits[0].actorId, "admin-1");
  assert.equal(audits[0].action, "export_events_csv");
  assert.equal(
    (audits[0].newValue as { exportedRows: number; truncated: boolean })
      .exportedRows,
    2,
  );
  assert.equal(
    (audits[0].newValue as { exportedRows: number; truncated: boolean })
      .truncated,
    false,
  );
});
