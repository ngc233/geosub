import { spawn } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const appRequire = createRequire(path.join(process.cwd(), "package.json"));

/** Browser-only test fixture: real application, existing handwritten data, no DB seeding.
 * Copy the app so next dev cannot rewrite the checkout's protected AGENTS.md or build.
 * The production build/start prohibition on GEOSUB_V3_FIXTURE stays untouched.
 */
export async function startHomepageFixtureServer() {
  const app = process.cwd();
  const { loadSafeE2eEnvironment } = appRequire(path.join(app, "scripts/e2e-environment.cjs"));
  const environment = loadSafeE2eEnvironment(); // Refuses non-loopback / non-_e2e databases.
  const root = mkdtempSync(path.join(tmpdir(), "geosub-currency-e2e-"));
  const copy = path.join(root, "ai-price-site");
  const excluded = /^(?:node_modules|\.next.*|\.env.*|\.git|test-results|playwright-report|coverage|output|logs|tmp)$/;
  try {
    cpSync(app, copy, {
      recursive: true,
      dereference: true,
      filter: source => !excluded.test(path.relative(app, source).split(path.sep)[0]),
    });
    symlinkSync(path.join(app, "node_modules"), path.join(copy, "node_modules"), "dir");
    symlinkSync(path.resolve(app, "../geosub-backend"), path.join(root, "geosub-backend"), "dir");
    cpSync(path.resolve(app, "../VERSION"), path.join(root, "VERSION"));
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
  const socket = createServer();
  await new Promise<void>((resolve, reject) => {
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", resolve);
  });
  const address = socket.address();
  if (!address || typeof address === "string") throw new Error("Missing loopback fixture port");
  const port = address.port;
  await new Promise<void>((resolve, reject) => socket.close(error => error ? reject(error) : resolve()));
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [appRequire.resolve("next/dist/bin/next"), "dev", "--webpack", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: copy,
    env: { ...environment, NODE_ENV: "development", GEOSUB_V3_FIXTURE: "fictional", GEOSUB_NEXT_DIST_DIR: ".next", NEXT_TELEMETRY_DISABLED: "1", NEXT_PUBLIC_SITE_URL: origin },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  const append = (chunk: Buffer) => { log = (log + chunk.toString()).slice(-64_000); };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  const exited = new Promise<void>(resolve => { child.once("exit", () => resolve()); child.once("error", () => resolve()); });
  const stop = async () => {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await Promise.race([exited, delay(5_000)]);
      if (child.exitCode === null) { child.kill("SIGKILL"); await exited; }
    }
    rmSync(root, { recursive: true, force: true });
  };
  try {
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) throw new Error(`Fixture server exited: ${child.exitCode}`);
      try {
        const response = await fetch(`${origin}/zh`, { signal: AbortSignal.timeout(10_000) });
        if (response.ok && (await response.text()).includes("虚构测试数据")) return { origin, stop };
      } catch { /* The real dev application is still compiling. */ }
      await delay(250);
    }
    throw new Error("Fictional homepage was not ready within 120 seconds");
  } catch (error) {
    await stop();
    throw new Error(`${String(error)}\n${log}`);
  }
}
