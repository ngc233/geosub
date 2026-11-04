import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readAppBuildMetadata } from "./app-build-metadata.ts";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
function fixture(t: TestContext) {
  const root = mkdtempSync(join(tmpdir(), "geosub-health-build-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const app = join(root, "ai-price-site");
  mkdirSync(app);
  writeFileSync(join(root, "VERSION"), "2.24.1\n");
  writeFileSync(join(app, "build-commit.txt"), readFileSync(join(repo, "ai-price-site/build-commit.txt")));
  writeFileSync(join(root, ".gitattributes"), readFileSync(join(repo, ".gitattributes")));
  const git = (...args: string[]) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const initialize = () => {
    git("init", "-b", "main"); git("config", "user.name", "Health fixture"); git("config", "user.email", "health@example.invalid");
    git("add", "."); git("commit", "-m", "candidate");
    return git("rev-parse", "HEAD");
  };
  return { root, app, git, initialize };
}

test("checkout metadata matches its actual full HEAD and VERSION", (t) => {
  const f = fixture(t), commit = f.initialize();
  assert.equal(commit.length, 40);
  assert.deepEqual(readAppBuildMetadata(f.app), { version: "2.24.1", commit });
});

test("git archive expands the exact candidate SHA and works without .git", (t) => {
  const f = fixture(t), commit = f.initialize();
  const archive = join(f.root, "exported");
  mkdirSync(archive);
  execFileSync("tar", ["-xf", "-", "-C", archive], { input: execFileSync("git", ["-C", f.root, "archive", commit]) });
  assert.equal(readFileSync(join(archive, "ai-price-site/build-commit.txt"), "utf8").trim(), commit);
  writeFileSync(join(f.root, "VERSION"), "2.24.2\n");
  f.git("add", "VERSION"); f.git("commit", "-m", "later checkout");
  assert.notEqual(f.git("rev-parse", "HEAD"), commit);
  assert.deepEqual(readAppBuildMetadata(join(archive, "ai-price-site")), { version: "2.24.1", commit });
  // An unexpanded nested copy must not accidentally report its parent's HEAD.
  writeFileSync(join(archive, "ai-price-site/build-commit.txt"), "$Format:%H$\n");
  assert.equal(readAppBuildMetadata(join(archive, "ai-price-site")).commit, null);
});

test("missing and malformed metadata remain null without reporting paths or errors", (t) => {
  const f = fixture(t);
  assert.deepEqual(readAppBuildMetadata(f.app), { version: "2.24.1", commit: null });
  f.initialize();
  for (const invalid of ["abcdef0", "g".repeat(40), "a".repeat(41), "postgres://secret@internal/db"]) {
    writeFileSync(join(f.app, "build-commit.txt"), invalid);
    assert.equal(readAppBuildMetadata(f.app).commit, null);
  }
  writeFileSync(join(f.root, "VERSION"), "private-host\nstack trace");
  assert.deepEqual(readAppBuildMetadata(f.app), { version: null, commit: null });
  rmSync(join(f.root, "VERSION"));
  assert.equal(readAppBuildMetadata(f.app).version, null);
  assert.deepEqual(readAppBuildMetadata(join(f.root, "missing", "app")), { version: null, commit: null });
});
