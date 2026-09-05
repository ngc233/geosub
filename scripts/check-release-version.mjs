#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";

// Dependency-free: this gate runs before npm ci and before stopping production.
function parseVersion(value) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(value);
  if (!match || match[4]?.split(".").some((part) => /^0\d+$/.test(part))) {
    throw new Error(`Invalid release version: ${value}`);
  }
  return { core: match.slice(1, 4).map(BigInt), pre: match[4]?.split(".") };
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let i = 0; i < 3; i++) {
    if (a.core[i] !== b.core[i]) return a.core[i] > b.core[i] ? 1 : -1;
  }
  if (!a.pre || !b.pre) return a.pre ? -1 : b.pre ? 1 : 0;
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    const x = a.pre[i];
    const y = b.pre[i];
    if (x === y) continue;
    if (x === undefined || y === undefined) return x === undefined ? -1 : 1;
    const nx = /^\d+$/.test(x);
    const ny = /^\d+$/.test(y);
    if (nx && ny) return BigInt(x) > BigInt(y) ? 1 : -1;
    if (nx !== ny) return nx ? -1 : 1;
    return x > y ? 1 : -1;
  }
  return 0;
}

try {
  const { values } = parseArgs({ options: {
    root: { type: "string", default: process.cwd() },
    ref: { type: "string" },
    current: { type: "string" },
    "baseline-ref": { type: "string" },
    git: { type: "string", default: "git" },
  } });
  if (values.current && values["baseline-ref"]) throw new Error("Use only one release baseline.");
  const root = resolve(values.root);
  const read = (file, ref = values.ref) => ref
    ? execFileSync(values.git, ["-c", `safe.directory=${root}`, "-C", root, "show", `${ref}:${file}`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
    : readFileSync(resolve(root, file), "utf8");
  const version = read("VERSION").trim();
  parseVersion(version);
  for (const directory of ["ai-price-site", "geosub-backend"]) {
    for (const file of ["package.json", "package-lock.json"]) {
      const path = `${directory}/${file}`;
      const data = JSON.parse(read(path));
      if (data.version !== version || (file === "package-lock.json" && data.packages?.[""]?.version !== version)) {
        throw new Error(`Version mismatch in ${path}; expected ${version}, including lockfile root package.`);
      }
    }
  }
  let previous;
  if (values.current) {
    const matches = [...readFileSync(values.current, "utf8").matchAll(/^GEOSUB_VERSION=([^\r\n]+)\r?$/gm)];
    if (matches.length !== 1) throw new Error("Missing or ambiguous GEOSUB_VERSION in successful release record.");
    previous = matches[0][1];
  } else if (values["baseline-ref"]) {
    previous = read("VERSION", values["baseline-ref"]).trim();
  }
  if (previous !== undefined && compareVersions(version, previous) <= 0) {
    throw new Error(`Release version must increase: candidate=${version}, previous=${previous}. Bump VERSION and both package/lock files; use rollback.sh for rollback.`);
  }
  console.log(previous === undefined
    ? `Version synchronized: ${version} (no deployment baseline checked)`
    : `Release version verified: ${previous} -> ${version}`);
} catch (error) {
  console.error(`BLOCKED: ${error.message}`);
  process.exitCode = 1;
}
