import assert from "node:assert/strict";
import test from "node:test";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const annotation = items => ({ title: "In-App Purchases", items });
const modern = (name, price) => ({ $kind: "textPair", leadingText: name, trailingText: price });
const purchases = [
  modern("Captions Basic - monthly", "$13.49"), modern("Captions Basic - monthly", "$12.99"),
  modern("Captions Basic - weekly", "$7.99"), modern("Captions Basic - monthly", "$13.49"),
  { $kind: "button", action: { title: "Learn More" } },
];
const expected = purchases.slice(0, 4).map(item => [item.leadingText, item.trailingText]);
const payload = { data: [{ data: { shelfMapping: { information: { items: [annotation(purchases)] } } } }] };
const jsonScript = value => '<script type="application/json" id="serialized-server-data">' + JSON.stringify(value) + '</script>';
const cases = [
  { name: "legacy static DOM extraction unchanged", html: '<div class="text-pair"><span>Legacy monthly</span><span>$5.00</span></div>',
    domPairs: [["Legacy monthly", "$5.00"]], expected: [["Legacy monthly", "$5.00"]] },
  { name: "modern structured pairs preserve distinct prices, periods, order and duplicates", html: jsonScript(payload), expected },
  { name: "legacy embedded textPairs", html: jsonScript(annotation([{ textPairs: [["Pro monthly", "$29.00"]] }])),
    expected: [["Pro monthly", "$29.00"]] },
  { name: "unrelated annotations ignored", html: jsonScript({ title: "Ratings", items: purchases }), expected: [] },
  { name: "invalid modern pairs ignored", html: jsonScript(annotation([
    modern("", "$10"), modern("Basic monthly", ""), modern("Basic monthly", 10),
    { $kind: "button", leadingText: "Learn More", trailingText: "$20" },
  ])), expected: [] },
  { name: "non JSON scripts ignored", html: '<script>execute(' + JSON.stringify(payload) + ')</script>', expected: [] },
  { name: "malformed JSON ignored", html: '<script type="application/json">{"title":"In-App Purchases",oops}</script>', expected: [] },
  { name: "HTML comments cannot supply structured evidence", html: '<!--' + jsonScript(payload) + '-->', expected: [] },
  { name: "modern and legacy pairs coexist", html: jsonScript(annotation([
    modern("Monthly Subscription Lite", "AED 69.99"), { textPairs: [["Pollo Lite - Monthly Plan", "AED 59.99"]] },
  ])), expected: [["Monthly Subscription Lite", "AED 69.99"], ["Pollo Lite - Monthly Plan", "AED 59.99"]] },
  { name: "malformed structured JSON cannot fall back to a partial price fragment",
    html: '<script type="application/json">{"title":"In-App Purchases","broken":oops,"textPairs":[["Fake monthly","$1"]]}</script>', expected: [] },
  { name: "empty purchase section cannot borrow another annotation price", html: jsonScript({
    sections: [annotation([]), { title: "Unrelated", items: [{ textPairs: [["Fake monthly", "$1"]] }] }],
  }), expected: [] },
  { name: "metadata without in-app purchase identity cannot supply a price", html: jsonScript({ items: purchases }), expected: [] },
];

test("static App Store parser accepts modern purchase metadata and preserves unresolved variants", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "geosub-iap-metadata-"));
  try {
    const input = path.join(root, "cases.json");
    await writeFile(input, JSON.stringify(cases));
    const result = spawnSync(process.platform === "win32" ? "powershell.exe" : "pwsh", [
      "-NoProfile", "-NonInteractive", "-File", fileURLToPath(new URL("../tests/app-store-purchase-metadata.ps1", import.meta.url)),
      "-CasesPath", input,
    ], { encoding: "utf8", timeout: 20_000 });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /modern structured pairs preserve/);
    assert.match(result.stdout, /legacy embedded textPairs/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

const renderer = await readFile(new URL("./render-app-store-prices.mjs", import.meta.url), "utf8");
const start = renderer.indexOf("  const pageEvidence = await page.evaluate(() => {");
const end = renderer.indexOf("\n  const items = pageEvidence.items;", start);
assert.ok(start >= 0 && end > start);
const callback = renderer.slice(start, end).replace("  const pageEvidence = await page.evaluate(", "(").trim();

// Run the real renderer callback on a synthetic document; no browser, HTTP or account.
function renderFixture(html, domPairs = []) {
  const scripts = [...html.replace(/<!--[\s\S]*?-->/g, "").matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(match => !/\bsrc\s*=/.test(match[1])).map(match => ({ textContent: match[2] }));
  const document = {
    body: { innerText: "In-App Purchases" },
    querySelectorAll: selector => selector === ".text-pair" ? domPairs.map(pair => ({
      querySelectorAll: () => pair.map(textContent => ({ textContent })),
    })) : scripts,
  };
  return vm.runInNewContext(callback.slice(0, -1) + "()", { document }, { timeout: 1000 });
}
for (const fixture of cases) test("rendered App Store callback: " + fixture.name, () => {
  const result = renderFixture(fixture.html, fixture.domPairs);
  assert.deepEqual(JSON.parse(JSON.stringify(result.items.map(item => [item.name, item.priceText]))), fixture.expected);
});
test("rendered legacy DOM extraction stays preferred and unchanged", () => {
  const result = renderFixture(jsonScript(payload), [["Legacy monthly", "$5.00"]]);
  assert.deepEqual(JSON.parse(JSON.stringify(result.items)), [{ name: "Legacy monthly", priceText: "$5.00" }]);
  assert.equal(result.parserSource, "text-pair-dom");
});
