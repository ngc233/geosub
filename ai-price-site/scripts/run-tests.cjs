#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const appDir = path.resolve(__dirname, "..");
const ignoredDirectories = new Set([".git", ".next", "node_modules"]);

function findTests(directory) {
  const tests = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;

    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      tests.push(...findTests(absolute));
    } else if (entry.isFile() && entry.name.endsWith(".test.mts")) {
      tests.push(path.relative(appDir, absolute));
    }
  }

  return tests;
}

const tests = findTests(appDir).sort((left, right) =>
  left.localeCompare(right, "en"),
);

if (tests.length === 0) {
  console.error("No .test.mts files were discovered.");
  process.exit(1);
}

console.log(`Discovered ${tests.length} test files.`);
const result = spawnSync(
  process.execPath,
  [
    "--experimental-strip-types",
    "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
    "--test",
    ...tests,
  ],
  {
    cwd: appDir,
    stdio: "inherit",
    shell: false,
  },
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
