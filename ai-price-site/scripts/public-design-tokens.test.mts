import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { STYLE_FILES, renderTokens, inspectStyles } from "./public-design-tokens.cjs";
import tokens from "../design/design-tokens.json" with { type: "json" };
import compatibility from "../design/public-theme-compatibility.json" with { type: "json" };

const inspect = (css: string, filename = "public-motion.css") => inspectStyles([{ filename, css }]);

test("the shipped four stylesheets pass the same CLI gate in npm test", () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("./public-design-tokens.cjs", import.meta.url)), "--check"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});

test("hover transform and shadow cancellation are rejected, including split files", () => {
  assert.ok(inspect('.gs-public-unified .card:hover { transform:translateY(-2px); } .gs-public-unified .card:hover { transform:none; }').some((issue: string) => issue.includes("resets a hover")));
  assert.ok(inspect('.gs-public-unified .card:hover { box-shadow:var(--gs-shadow-card-hover); } .gs-public-unified .card:hover { box-shadow:none; }').some((issue: string) => issue.includes("resets a hover")));
  const issues = inspectStyles([
    { filename: "public-components.css", css: ".gs-public-unified .card:hover { transform:translateY(-2px); }" },
    { filename: "public-motion.css", css: ".gs-public-unified .card { transform:none; }" },
  ]);
  assert.ok(issues.some((issue: string) => issue.includes("resets a hover")));
});

test("grouped hover selectors and a variable resolving to none cannot hide cancellation", () => {
  const issues = inspect('.gs-public-unified { --gs-no-shadow:none; } .gs-public-unified :is(.card,.tile):hover { box-shadow:var(--gs-no-shadow); }');
  assert.ok(issues.some((issue: string) => issue.includes("resets a hover")));
});

test("reduced-motion reset is allowed only when every media alternative requires reduce", () => {
  const rule = '.gs-public-unified .card:hover { transform:none; }';
  assert.deepEqual(inspect(`@media (prefers-reduced-motion:reduce) { ${rule} }`), []);
  assert.ok(inspect(`@media (prefers-reduced-motion:reduce), (min-width:800px) { ${rule} }`).length);
  assert.ok(inspect(`@media not (prefers-reduced-motion:reduce) { ${rule} }`).length);
});

test("normal hover feedback and token-based declarations pass", () => {
  assert.deepEqual(inspect('.gs-public-unified .card:hover { transform:translateY(-2px); box-shadow:var(--gs-shadow-card-hover); color:var(--gs-text); font-size:var(--gs-body-size); }'), []);
});

test("literal colors, font sizes and un-tokenized shadows fail independently", () => {
  for (const declaration of ["color:#fff", "background:rgb(1 2 3)", "color:oklch(50% 0.2 20)", "color:rebeccapurple", "border:1px solid red", "font-size:14px", "font-size:calc(1rem + 2px)", "box-shadow:0 2px 4px currentColor"]) {
    assert.ok(inspect(`.gs-public-unified .card { ${declaration}; }`).length, declaration);
  }
});

test("token definitions stay scoped; component declarations cannot smuggle a palette", () => {
  assert.deepEqual(inspect('.gs-public-unified { --gs-page:#fff; --gs-body-size:16px; }', "public-tokens.css"), []);
  assert.ok(inspect('.gs-public-unified { --custom:#fff; }', "public-components.css").length);
  assert.ok(inspect('body { color:var(--gs-text); }').length);
  assert.ok(inspect('.gs-public-unified .card { transition:color 120ms; }', "public-components.css").length);
});

test("CLI checks exactly four U1 files, fails on constructed cancellation and succeeds after repair", () => {
  assert.deepEqual([...STYLE_FILES], ["public-tokens.css", "public-base.css", "public-components.css", "public-motion.css"]);
  const root = mkdtempSync(join(tmpdir(), "geosub-u1-css-"));
  try {
    mkdirSync(join(root, "app")); mkdirSync(join(root, "design"));
    writeFileSync(join(root, "design/design-tokens.json"), JSON.stringify(tokens));
    writeFileSync(join(root, "design/public-theme-compatibility.json"), JSON.stringify(compatibility));
    writeFileSync(join(root, "app/public-tokens.css"), renderTokens(tokens, compatibility));
    for (const filename of STYLE_FILES.slice(1)) writeFileSync(join(root, "app", filename), ".gs-public-unified .card { color:var(--gs-text); }\n");
    const motion = join(root, "app/public-motion.css");
    const execute = () => spawnSync(process.execPath, [fileURLToPath(new URL("./public-design-tokens.cjs", import.meta.url)), "--check", "--root", root], { encoding: "utf8" });
    writeFileSync(motion, ".gs-public-unified .card:hover { transform:translateY(-2px); }\n.gs-public-unified .card:hover { transform:none; }");
    const failed = execute();
    assert.equal(failed.status, 1);
    assert.match(failed.stderr, /resets a hover effect/);
    writeFileSync(motion, ".gs-public-unified .card:hover { transform:translateY(-2px); box-shadow:var(--gs-shadow-card-hover); }");
    const passed = execute();
    assert.equal(passed.status, 0, passed.stderr);
    // There are deliberately no PublicControls/StyleReview/Codex component files.
    assert.match(passed.stdout, /four U1 stylesheets/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
