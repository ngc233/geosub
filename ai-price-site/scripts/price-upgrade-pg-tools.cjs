const path = require("node:path");
const { spawnSync } = require("node:child_process");

// Test-only: never restore a dump with a newer client than the local test server.
// CI already pulls postgres:16-alpine for its database service. Reuse its tools
// when the runner's default PostgreSQL client drifts; do not edit dump SQL.
function selectPgTools(serverVersionNum, env, directory, options = {}) {
  const execute = options.spawnSync || spawnSync;
  const platform = options.platform || process.platform;
  const major = Math.floor(Number(serverVersionNum) / 10000);
  if (!Number.isInteger(major) || major < 10 || major > 99 ||
      !["localhost", "127.0.0.1"].includes(env.PGHOST) ||
      !/^geosub_price_version_test_[a-z0-9_]+_e2e$/.test(env.PGDATABASE || "")) {
    throw Error("PostgreSQL tools require a local price-version test database");
  }
  const matches = (command, prefix, tool) => {
    const result = execute(command, [...prefix, "--version"], { env, encoding: "utf8", timeout: 30000 });
    const version = String(result.stdout || "").match(new RegExp(`^${tool} \\(PostgreSQL\\) (\\d+)\\.`));
    return result.status === 0 && Number(version?.[1]) === major;
  };
  for (const bin of ["", `/usr/lib/postgresql/${major}/bin`]) {
    const commands = Object.fromEntries(["pg_dump", "pg_restore"].map(tool => [tool, bin ? path.join(bin, tool) : tool]));
    if (Object.entries(commands).every(([tool, command]) => matches(command, [], tool))) {
      return { major, mode: "native", invocation: (tool, args) => {
        if (!commands[tool]) throw Error("Unsupported PostgreSQL archive tool");
        return { command: commands[tool], args };
      } };
    }
  }
  const image = `postgres:${major}-alpine`;
  if (platform !== "linux" || !["pg_dump", "pg_restore"].every(tool =>
    matches("docker", ["run", "--rm", "--pull=never", "--network", "none", image, tool], tool))) {
    throw Error(`Matching PostgreSQL ${major} pg_dump/pg_restore unavailable; refusing cross-major restore`);
  }
  return { major, mode: "container", invocation: (tool, args) => {
    if (!["pg_dump", "pg_restore"].includes(tool)) throw Error("Unsupported PostgreSQL archive tool");
    return { command: "docker", args: [
      "run", "--rm", "--pull=never", "--network", "host",
      "--mount", `type=bind,src=${directory},dst=${directory}`,
      ...["PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE"].flatMap(key => ["--env", key]),
      image, tool, ...args,
    ] };
  } };
}

module.exports = { selectPgTools };
