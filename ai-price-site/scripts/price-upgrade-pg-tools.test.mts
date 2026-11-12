import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const { selectPgTools } = createRequire(import.meta.url)("./price-upgrade-pg-tools.cjs");
const env = { PGHOST: "127.0.0.1", PGPORT: "5432", PGUSER: "fixture", PGPASSWORD: "synthetic-only", PGDATABASE: "geosub_price_version_test_ci_upgrade_e2e" };
const directory = "/tmp/synthetic-upgrade";
function probe(native: number, installed: number, container: number) {
  return (command: string, args: string[]) => {
    const tool = command === "docker" ? args.at(-2) : command.split("/").at(-1);
    const version = command === "docker" ? container : command.startsWith("/") ? installed : native;
    return { status: version ? 0 : 1, stdout: version ? `${tool} (PostgreSQL) ${version}.6\n` : "" };
  };
}

test("same-major native archive clients are used unchanged", () => {
  const tools = selectPgTools("160015", env, directory, { spawnSync: probe(16, 0, 0) });
  assert.equal(tools.mode, "native");
  assert.deepEqual(tools.invocation("pg_restore", ["--exit-on-error", "file.dump"]), { command: "pg_restore", args: ["--exit-on-error", "file.dump"] });
});

test("default PG18 is rejected; installed PG16 takes precedence over a container", () => {
  const tools = selectPgTools("160015", env, directory, { spawnSync: probe(18, 16, 0) });
  assert.equal(tools.invocation("pg_dump", []).command, "/usr/lib/postgresql/16/bin/pg_dump");
});

test("Linux PG18 runner uses only verified cached PG16 tools, preserving strict restore arguments", () => {
  const tools = selectPgTools("160015", env, directory, { platform: "linux", spawnSync: probe(18, 0, 16) });
  assert.equal(tools.mode, "container");
  const args = ["--no-owner", "--exit-on-error", "--dbname", "geosub_price_version_test_ci_restore_e2e", `${directory}/file.dump`];
  const call = tools.invocation("pg_restore", args);
  assert.equal(call.command, "docker");
  assert.deepEqual(call.args.slice(-args.length), args);
  assert(call.args.includes("postgres:16-alpine"));
  assert(call.args.includes("--pull=never"));
  assert(call.args.includes(`type=bind,src=${directory},dst=${directory}`));
  assert(call.args.includes("PGPASSWORD"));
  assert(!call.args.join(" ").includes(env.PGPASSWORD));
  assert.throws(() => tools.invocation("psql", []), /Unsupported/);
});

test("missing, mixed or incorrect tool versions fail closed", () => {
  for (const platform of ["linux", "darwin"]) {
    assert.throws(() => selectPgTools(160015, env, directory, { platform, spawnSync: probe(18, 0, 18) }), /refusing cross-major/);
  }
  assert.throws(() => selectPgTools(160015, env, directory, { platform: "linux", spawnSync: (command: string) => {
    if (command === "docker") return { status: 1 };
    const tool = command.split("/").at(-1);
    return { status: 0, stdout: `${tool} (PostgreSQL) ${tool === "pg_dump" ? 16 : 18}.1` };
  } }), /refusing cross-major/);
});

test("tool selection cannot target production or an unrelated database", () => {
  for (const patch of [{ PGHOST: "db.example.com" }, { PGDATABASE: "geosub_app" }]) {
    assert.throws(() => selectPgTools(160015, { ...env, ...patch }, directory), /local price-version test/);
  }
  assert.throws(() => selectPgTools("invalid", env, directory), /local price-version test/);
});
