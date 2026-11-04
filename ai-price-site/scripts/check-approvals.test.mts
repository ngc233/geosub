import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test, { type TestContext } from "node:test";
import { checkApprovals, checkRepository, paragraphs } from "../../scripts/check-approvals.mjs";

const DATA = "docs/DATA_POLICY.md";
const SEO = "docs/SEO_POLICY.md";
const REGISTER = "docs/APPROVALS.md";
const SCRIPT = fileURLToPath(new URL("../../scripts/check-approvals.mjs", import.meta.url));
const header = "| 编号 | 日期 | 原话 | 范围 | 不包括 | 关联 PR | 追认状态 | 关联提交 |\n| --- | --- | --- | --- | --- | --- | --- | --- |";
const row = (id = "APR-H-0001", scope = "仅指定试点") =>
  `| ${id} | 2026-10-25 | 历史记录，原话缺失 | ${scope} | 其他范围 | 未找到 | 待追认 | 未找到 |`;
const registry = (...rows: string[]) => `${header}\n${rows.join("\n")}\n`;
const docs = (data = "普通说明。", seo = "普通说明。") => ({ [DATA]: data, [SEO]: seo });
const check = (data: string, register: string | null = null) => checkApprovals(docs(data), register);

function fixture(t: TestContext, data = "普通说明。", seo = "普通说明。", register: string | null = null) {
  const root = mkdtempSync(join(tmpdir(), "geosub-approvals-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (path: string, text: string) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); };
  write(DATA, data); write(SEO, seo);
  if (register !== null) write(REGISTER, register);
  return { root, write, cli: (...args: string[]) => spawnSync(process.execPath, [SCRIPT, "--root", root, ...args], { encoding: "utf8", cwd: tmpdir() }) };
}

test("all four keywords, including English case variants, require a marker", () => {
  for (const word of ["批准", "授权", "approved", "APPROVED", "aUtHoRiZeD", "authorized"]) {
    const findings = check(`说明 ${word} 此项。`);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].code, "missing-marker");
    assert.equal(findings[0].file, DATA);
    assert.equal(findings[0].line, 1);
  }
});

test("negative wording still matches keywords and needs a boundary marker", () => {
  assert.equal(check("Unapproved and unauthorized actions are forbidden.")[0].code, "missing-marker");
  assert.deepEqual(check("Unapproved and unauthorized actions are forbidden. [BND]"), []);
  assert.equal(check("本次不授权部署。")[0].code, "missing-marker");
  assert.deepEqual(check("本次不授权部署。[BND]"), []);
});

test("REQ and BND do not require or create historical records", () => {
  assert.deepEqual(check("未来必须批准。[REQ]\n\n不得扩大授权。[BND]"), []);
  assert.deepEqual(check("没有关键词。"), []);
});

test("classification markers are exact and cannot be numbered, escaped or lowercase", () => {
  for (const marker of ["[req]", "[bnd]", "[REQ-0001]", "[BND-0001]", "REQ", "\\[REQ]", "[REQ]extra"]) {
    assert.equal(check(`需要批准。${marker}`)[0].code, "missing-marker", marker);
  }
});

test("a pending historical record resolves without pretending it is ratified", () => {
  assert.deepEqual(check("用户批准指定试点。APR-H-0001", registry(row())), []);
  assert.deepEqual(check("User authorized a pilot. [APR-H-0001]", registry(row())), []);
  assert.deepEqual(check("批准此项。`APR-H-0001`", registry(row("`APR-H-0001`"))), []);
});

test("every historical ID needs a corresponding record, including alongside REQ", () => {
  assert.equal(check("批准。APR-H-0001")[0].code, "unregistered-id");
  const findings = check("批准。APR-H-0001 APR-H-0002 [REQ]", registry(row()));
  assert.equal(findings.length, 1);
  assert.equal(findings[0].code, "unregistered-id");
  assert.match(findings[0].message, /APR-H-0002/);
});

test("malformed and generic APR IDs cannot stand in for historical IDs", () => {
  for (const id of ["APR-0001", "APR-H-0000", "APR-H-1", "APR-H-0001extra", "APR-H-0001-extra"]) {
    const findings = check(`批准。${id}`, registry(row()));
    assert.ok(findings.some(f => f.code === "missing-marker"), id);
    assert.ok(findings.some(f => f.code === "invalid-id"), id);
  }
  assert.equal(check("批准。apr-h-0001", registry(row()))[0].code, "missing-marker");
});

test("paragraph line wrapping permits a same-paragraph reference", () => {
  assert.deepEqual(check("用户批准\n指定范围。\nAPR-H-0001", registry(row())), []);
  assert.equal(check("用户批准。\n\nAPR-H-0001", registry(row()))[0].code, "missing-marker");
});

test("adjacent list items cannot borrow each other's marker", () => {
  const findings = check("- 未来批准。[REQ]\n- 本次授权。\n  仅限当前范围。");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].line, 2);
  assert.equal(findings[0].code, "missing-marker");
  assert.deepEqual(check("1. 未来批准。\n   [REQ]\n2. 不扩大授权。[BND]"), []);
});

test("table rows are independent, including tables without edge pipes", () => {
  for (const text of [
    "| 规则 | 标记 |\n| --- | --- |\n| 批准事项 | [REQ] |\n| 授权事项 | 无 |",
    "规则 | 标记\n--- | ---\n批准事项 | [REQ]\n授权事项 | 无",
  ]) {
    const findings = check(text);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].line, 4);
  }
});

test("headings and fenced/indented examples do not generate approval findings", () => {
  assert.deepEqual(check([
    "# 批准说明", "", "授权标题", "====", "", "```text", "approved example", "```", "",
    "~~~~", "authorized example", "~~~", "批准仍在代码块", "~~~~", "", "    批准代码示例", "",
    "普通正文。",
  ].join("\n")), []);
});

test("a heading or code example cannot lend a marker to following prose", () => {
  assert.equal(check("# [REQ]\n需要批准。")[0].line, 2);
  assert.equal(check("```\n[REQ]\n```\n需要批准。")[0].line, 4);
});

test("HTML comments cannot hide a missing marker and CRLF locations remain accurate", () => {
  const findings = check("# 标题\r\n\r\n用户批准。<!-- APR-H-0001 -->\r\n\r\n<!--\r\nauthorized\r\n-->\r\n", registry(row()));
  assert.equal(findings.length, 1);
  assert.equal(findings[0].line, 3);
  assert.equal(findings[0].code, "missing-marker");
});

test("blockquoted prose is checked and reports original line numbers", () => {
  assert.deepEqual(paragraphs("> 授权记录。\n> 继续说明。\n\n> 未来批准。[REQ]"), [
    { line: 1, text: "授权记录。\n继续说明。" }, { line: 4, text: "未来批准。[REQ]" },
  ]);
  assert.equal(check("> 授权记录。")[0].code, "missing-marker");
});

test("a separate blockquote cannot lend its marker to ordinary prose", () => {
  const findings = check("需要批准。\n> [REQ]");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].line, 1);
  assert.equal(findings[0].code, "missing-marker");
});

test("only the registry ID column establishes a historical reference", () => {
  const findings = check("批准。APR-H-0001", registry(row("APR-H-0002", "提到 APR-H-0001 并非其记录")));
  assert.equal(findings.length, 1);
  assert.equal(findings[0].code, "unregistered-id");
});

test("prose, comments and fenced registry examples cannot create records", () => {
  for (const text of ["APR-H-0001", `<!--\n${registry(row())}-->`, `\`\`\`md\n${registry(row())}\`\`\``]) {
    const findings = check("批准。APR-H-0001", text);
    assert.ok(findings.some(f => f.code === "invalid-register"));
    assert.ok(findings.some(f => f.code === "unregistered-id"));
  }
});

test("registry parsing preserves escaped pipes and permits an empty valid table", () => {
  assert.deepEqual(check("批准。APR-H-0001", registry(row("APR-H-0001", "A\\|B 范围"))), []);
  assert.deepEqual(check("未来批准。[REQ]", registry()), []);
});

test("duplicate, incomplete and nonhistorical records are reported", () => {
  assert.ok(check("批准。APR-H-0001", registry(row(), row())).some(f => f.code === "duplicate-id"));
  for (const record of [row().replace("待追认", ""), row("[REQ]"), row("[BND]"), row("APR-0001"), "| APR-H-0001 | 2026-10-25 | 少字段 |"] ) {
    const findings = check("批准。APR-H-0001", registry(record));
    assert.ok(findings.some(f => f.code === "invalid-record"));
    assert.ok(findings.some(f => f.code === "unregistered-id"));
  }
});

test("missing ratification or commit columns make the register invalid", () => {
  const findings = check("批准。APR-H-0001", "| 编号 | 日期 | 原话 | 范围 | 不包括 | 关联 PR |\n| --- | --- | --- | --- | --- | --- |\n| APR-H-0001 | 日期 | 原话 | 范围 | 排除 | PR |");
  assert.ok(findings.some(f => f.code === "invalid-register"));
  assert.ok(findings.some(f => f.code === "unregistered-id"));
});

test("repository scan is restricted to the two policy files", t => {
  const f = fixture(t, "未来批准。[REQ]", "不扩大授权。[BND]");
  for (const path of ["AGENTS.md", "docs/WORKFLOW.md", "docs/OTHER.md", "src/ordinary.ts"]) f.write(path, "approved and authorized without markers");
  assert.deepEqual(checkRepository(f.root), []);
  f.write(SEO, "AUTHORIZED without a marker");
  const findings = checkRepository(f.root);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].file, SEO);
});

test("CLI warn reports findings but succeeds; error and default mode fail", t => {
  const f = fixture(t, "未标注批准。", "未标注授权。");
  const warn = f.cli("--mode=warn");
  assert.equal(warn.status, 0);
  assert.match(warn.stdout, /WARNING docs\/DATA_POLICY.md:1 \[missing-marker\]/);
  assert.match(warn.stdout, /2 issue\(s\); mode=warn/);
  for (const args of [["--mode=error"], []]) {
    const result = f.cli(...args);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /ERROR docs\/SEO_POLICY.md:1/);
  }
});

test("CLI succeeds for valid references and markers in either mode", t => {
  const f = fixture(t, "批准。APR-H-0001", "未来批准。[REQ]\n\n不扩大授权。[BND]", registry(row()));
  for (const mode of ["warn", "error"]) {
    const result = f.cli("--mode", mode);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /0 issue\(s\)/);
  }
});

test("CLI warning mode still reports missing and malformed historical records", t => {
  const f = fixture(t, "批准。APR-H-0001");
  assert.match(f.cli("--mode=warn").stdout, /unregistered-id/);
  assert.equal(f.cli("--mode=error").status, 1);
  f.write(REGISTER, "broken table");
  const result = f.cli("--mode=warn");
  assert.equal(result.status, 0);
  assert.match(result.stdout, /invalid-register/);
});

test("missing or unreadable policy files are operational errors even in warn mode", t => {
  const f = fixture(t);
  rmSync(join(f.root, SEO));
  assert.equal(f.cli("--mode=warn").status, 2);
  assert.match(f.cli("--mode=warn").stdout, /无法读取 docs\/SEO_POLICY.md/);
  mkdirSync(join(f.root, SEO));
  assert.equal(f.cli("--mode=warn").status, 2);
});

test("CLI rejects unknown, duplicate, missing and invalid arguments", t => {
  const f = fixture(t);
  for (const args of [["--mode=ignore"], ["--mode"], ["--mode=warn", "--mode=error"], ["--other=value"], ["--root=elsewhere"]]) {
    assert.equal(f.cli(...args).status, 2, JSON.stringify(args));
  }
});
