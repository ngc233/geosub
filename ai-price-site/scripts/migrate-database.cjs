const path = require("node:path");
const { spawnSync } = require("node:child_process");

const appDir = path.resolve(__dirname, "..");

function run(label, command, args) {
  console.log(`\n${label}`);
  const result = spawnSync(command, args, {
    cwd: appDir,
    encoding: "utf8",
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    const detail = result.error ? ` ${result.error.message}` : "";
    throw new Error(
      `${label} failed with exit code ${result.status ?? "unknown"}.${detail}`,
    );
  }
}

function main() {
  run("Applying canonical SQL migrations", process.execPath, [
    path.join(__dirname, "apply-local-sql.cjs"),
    "--mode",
    "core",
  ]);

  const prismaCli = require.resolve("prisma/build/index.js", { paths: [appDir] });
  run("Applying Prisma migrations", process.execPath, [prismaCli, "migrate", "deploy"]);
  run("Auditing the complete migration state", process.execPath, [
    path.join(__dirname, "check-migrations.cjs"),
  ]);

  console.log("\nGeoSub database migration completed successfully.");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
