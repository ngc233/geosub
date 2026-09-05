import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import test, { type TestContext } from "node:test";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const checker = join(repo, "scripts/check-release-version.mjs");
const upgrade = join(repo, "geosub-backend/deploy/linux-arm64/upgrade.sh");

function fixture(t: TestContext) {
  const root = mkdtempSync(join(tmpdir(), "geosub-release-version-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const writeVersion = (version: string) => {
    writeFileSync(join(root, "VERSION"), `${version}\n`);
    for (const directory of ["ai-price-site", "geosub-backend"]) {
      mkdirSync(join(root, directory), { recursive: true });
      writeFileSync(join(root, directory, "package.json"), JSON.stringify({ version }));
      writeFileSync(join(root, directory, "package-lock.json"), JSON.stringify({ version, packages: { "": { version } } }));
    }
  };
  const current = join(root, "current.env");
  const baseline = (version: string) => writeFileSync(current, `GEOSUB_VERSION=${version}\nGEOSUB_COMMIT=abc1234\n`);
  const run = (...args: string[]) => spawnSync(process.execPath, [checker, "--root", root, ...args], { encoding: "utf8" });
  const git = (...args: string[]) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  writeVersion("2.10.0");
  baseline("2.9.0");
  return { root, current, writeVersion, baseline, run, git };
}

test("a synchronized 2.9.0 runtime release cannot reuse the deployed 2.9.0 version", (t) => {
  const f = fixture(t);
  f.writeVersion("2.9.0");
  const result = f.run("--current", f.current);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Release version must increase/);
});

test("release ordering uses numeric SemVer, including prerelease precedence", (t) => {
  const f = fixture(t);
  for (const [previous, next, status] of [
    ["2.9.0", "2.10.0", 0], ["2.10.0", "2.9.9", 1],
    ["2.10.0-rc.2", "2.10.0-rc.10", 0], ["2.10.0-rc.10", "2.10.0", 0],
    ["2.10.0", "2.10.0-rc.1", 1], ["2.10.0-1", "2.10.0-alpha", 0],
    ["2.9.0", "2.10.0-01", 1], ["unknown", "2.10.0", 1],
  ] as const) {
    f.baseline(previous);
    f.writeVersion(next);
    assert.equal(f.run("--current", f.current).status, status, `${previous} -> ${next}`);
  }
});

test("each package and both lockfile version fields must match VERSION", (t) => {
  const f = fixture(t);
  for (const directory of ["ai-price-site", "geosub-backend"]) {
    for (const file of ["package.json", "package-lock.json"]) {
      for (const field of file === "package.json" ? ["version"] : ["version", "root"]) {
        f.writeVersion("2.10.0");
        const path = join(f.root, directory, file);
        const data = JSON.parse(readFileSync(path, "utf8"));
        if (field === "root") data.packages[""].version = "2.9.0";
        else data.version = "2.9.0";
        writeFileSync(path, JSON.stringify(data));
        const result = f.run();
        assert.equal(result.status, 1);
        assert.match(result.stderr, /Version mismatch/);
      }
    }
  }
});

test("ordinary synchronized development checks need no deployment baseline", (t) => {
  const f = fixture(t);
  f.writeVersion("2.9.0");
  assert.equal(f.run().status, 0);
});

test("missing or ambiguous successful deployment evidence fails closed", (t) => {
  const f = fixture(t);
  for (const content of ["", "GEOSUB_COMMIT=abc1234\n", "GEOSUB_VERSION=2.8.0\nGEOSUB_VERSION=2.9.0\n"]) {
    writeFileSync(f.current, content);
    assert.equal(f.run("--current", f.current).status, 1);
  }
  rmSync(f.current);
  assert.equal(f.run("--current", f.current).status, 1);
});

test("candidate Git blobs are checked instead of the running checkout version", (t) => {
  const f = fixture(t);
  f.git("init", "-b", "main");
  f.git("config", "user.name", "Release fixture");
  f.git("config", "user.email", "release@example.invalid");
  f.writeVersion("2.9.0");
  f.git("add", ".");
  f.git("commit", "-m", "previous");
  const previous = f.git("rev-parse", "HEAD");
  f.writeVersion("2.10.0");
  assert.equal(f.run("--ref", previous, "--current", f.current).status, 1);
  assert.equal(f.run("--baseline-ref", previous).status, 0);
  f.git("add", ".");
  f.git("commit", "-m", "candidate");
  const candidate = f.git("rev-parse", "HEAD");
  f.git("checkout", previous);
  assert.equal(f.run("--ref", candidate, "--current", f.current).status, 0);
});

test("actual upgrade rejects a repeated version before any service or backup operation", (t) => {
  const f = fixture(t);
  const bin = join(f.root, "bin");
  mkdirSync(bin);
  const marker = join(f.root, "runtime-touched");
  for (const [name, body] of Object.entries({
    id: "echo 0", sudo: 'shift 2; exec "$@"',
    systemctl: `touch '${marker}'; exit 99`, install: `touch '${marker}'; exit 99`,
  })) writeFileSync(join(bin, name), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
  mkdirSync(join(f.root, "scripts"));
  writeFileSync(join(f.root, "scripts/check-release-version.mjs"), readFileSync(checker));
  f.writeVersion("2.9.0");
  f.git("init", "-b", "main");
  f.git("config", "user.name", "Release fixture");
  f.git("config", "user.email", "release@example.invalid");
  f.git("add", ".");
  f.git("commit", "-m", "candidate");
  const remote = mkdtempSync(join(tmpdir(), "geosub-release-remote-"));
  t.after(() => rmSync(remote, { recursive: true, force: true }));
  execFileSync("git", ["init", "--bare", remote], { stdio: "ignore" });
  f.git("remote", "add", "origin", remote);
  f.git("push", "origin", "HEAD:main");
  for (const skipPull of ["true", "false"]) {
    const result = spawnSync("bash", [upgrade], { encoding: "utf8", env: {
    ...process.env, PATH: `${bin}:${dirname(process.execPath)}:${process.env.PATH}`,
    GEOSUB_ENV_FILE: join(f.root, "absent.env"), GEOSUB_REPO_DIR: f.root,
    GEOSUB_BACKEND_DIR: join(f.root, "geosub-backend"), GEOSUB_FRONTEND_DIR: join(f.root, "ai-price-site"),
    GEOSUB_RELEASE_DIR: f.root, GEOSUB_SKIP_GIT_PULL: skipPull, GEOSUB_GIT_BRANCH: "main",
    } });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /Release version must increase/);
    assert.throws(() => readFileSync(marker), { code: "ENOENT" });
  }
});
