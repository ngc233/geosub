#!/usr/bin/env node

const path = require("node:path");
const { spawnSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(rootDir, "..");
const composeFile = path.join(repoDir, "geosub-backend", "docker-compose.yml");
const envFile = path.join(repoDir, "geosub-backend", ".env");

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    shell: false,
  });
}

function printCommandFailure(title, result) {
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  console.error(`FAIL  ${title}`);
  if (output) console.error(output);
}

function ensureDockerCompose() {
  const result = run("docker-compose", ["--version"], { capture: true });
  if (result.status === 0) {
    console.log(`OK    Docker Compose: ${result.stdout.trim()}`);
    return true;
  }
  printCommandFailure("Docker Compose is unavailable", result);
  console.error("Install Docker Desktop or add docker-compose to PATH.");
  return false;
}

function ensureDockerDaemon() {
  const result = run("docker", ["ps"], { capture: true });
  if (result.status === 0) {
    console.log("OK    Docker daemon is running.");
    return true;
  }
  printCommandFailure("Docker daemon is unavailable", result);
  console.error("Start Docker Desktop, then retry npm run db:up.");
  return false;
}

function composeArgs(extraArgs) {
  return ["--env-file", envFile, "-f", composeFile, ...extraArgs];
}

function startPostgres() {
  if (!ensureDockerCompose() || !ensureDockerDaemon()) {
    process.exitCode = 1;
    return;
  }
  console.log("Starting local PostgreSQL: geosub-postgres");
  const result = run("docker-compose", composeArgs(["up", "-d", "postgres"]));
  process.exitCode = result.status ?? 1;
}

function showStatus() {
  if (!ensureDockerDaemon()) {
    process.exitCode = 1;
    return;
  }
  const result = run("docker", [
    "ps",
    "--filter",
    "name=geosub-postgres",
    "--format",
    "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}",
  ]);
  process.exitCode = result.status ?? 1;
}

function showDoctor() {
  const composeOk = ensureDockerCompose();
  const daemonOk = ensureDockerDaemon();
  if (!composeOk || !daemonOk) {
    process.exitCode = 1;
    return;
  }
  console.log("OK    Local database tools are ready. Run npm run db:up to start PostgreSQL.");
}

const command = process.argv[2] || "doctor";
if (command === "up") startPostgres();
else if (command === "status") showStatus();
else if (command === "doctor") showDoctor();
else {
  console.error(`Unknown command: ${command}`);
  console.error("Available commands: up, status, doctor");
  process.exitCode = 1;
}
