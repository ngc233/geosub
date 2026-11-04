import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { normalizeHealthCommit, normalizeHealthVersion } from "./app-health.ts";

// Called by next.config at build time, never by a health request. Only these
// two validated public identifiers are embedded; no environment is copied.
export function readAppBuildMetadata(appDir: string) {
  const root = resolve(appDir, "..");
  const read = (file: string) => {
    try { return readFileSync(file, "utf8").trim(); } catch { return null; }
  };
  const version = normalizeHealthVersion(read(join(root, "VERSION")));
  const archived = read(join(appDir, "build-commit.txt"));
  let commit = normalizeHealthCommit(archived);

  // An expanded git-archive marker is authoritative. An invalid expanded
  // marker must not fall back to a different checkout's identity.
  if (archived === null || archived === "$Format:%H$") {
    try {
      if (existsSync(join(root, ".git"))) {
        const git = (...args: string[]) => execFileSync("git", ["-C", root, ...args], {
          encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 1000,
        }).trim();
        if (realpathSync(git("rev-parse", "--show-toplevel")) === realpathSync(root)) {
          commit = normalizeHealthCommit(git("rev-parse", "HEAD"));
        }
      }
    } catch { /* Missing Git or unreadable metadata is an unknown identity. */ }
  }
  return { version, commit };
}
