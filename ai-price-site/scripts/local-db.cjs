#!/usr/bin/env node

const path = require("path");
const { spawnSync } = require("child_process");

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
  if (output) {
    console.error(output);
  }
}

function ensureDockerCompose() {
  const result = run("docker-compose", ["--version"], { capture: true });
  if (result.status === 0) {
    console.log(`OK    Docker Compose: ${result.stdout.trim()}`);
    return true;
  }

  printCommandFailure("找不到 docker-compose", result);
  console.error("请先安装 Docker Desktop，或确认 docker-compose 已加入 PATH。");
  return false;
}

function ensureDockerDaemon() {
  const result = run("docker", ["ps"], { capture: true });
  if (result.status === 0) {
    console.log("OK    Docker daemon 已运行");
    return true;
  }

  const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
  console.error("FAIL  Docker daemon 未运行");
  if (/config\.json/i.test(output) && /access is denied/i.test(output)) {
    console.error("WARN  Docker 配置文件读取受限，但当前主要问题是 Docker Desktop 没有启动。");
  } else if (!/docker_engine|daemon|connect/i.test(output)) {
    console.error(output.trim());
  }
  console.error("请先启动 Docker Desktop，再重试 npm run db:up。");
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

  console.log("启动本地 PostgreSQL：geosub-postgres");
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

  console.log("OK    可以运行 npm run db:up 启动本地数据库。");
}

const command = process.argv[2] || "doctor";

if (command === "up") {
  startPostgres();
} else if (command === "status") {
  showStatus();
} else if (command === "doctor") {
  showDoctor();
} else {
  console.error(`未知命令：${command}`);
  console.error("可用命令：up, status, doctor");
  process.exitCode = 1;
}
