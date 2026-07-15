const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..", "..");

const textExtensions = new Set([
  ".cjs",
  ".css",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".prisma",
  ".sql",
  ".ts",
  ".tsx",
]);

const ignoredPaths = [
  /(^|\/)\.next\//,
  /(^|\/)node_modules\//,
  /(^|\/)package-lock\.json$/,
];

const mojibakeTokens = [
  "鍙",
  "绋",
  "寰",
  "鏄",
  "浠",
  "鐨",
  "閲",
  "骞",
  "瀹",
  "杩",
  "椤",
  "鏁",
  "灏",
  "姝",
  "鎵",
  "蹇",
  "銆",
  "锛",
  "妯",
  "瀵",
  "涓",
];

function gitLines(args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean);
}

function listSourceFiles() {
  const trackedFiles = gitLines(["ls-files"]);
  const untrackedFiles = execFileSync(
    "git",
    ["ls-files", "--others", "--exclude-standard"],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  )
    .split(/\r?\n/)
    .filter(Boolean);

  return [...new Set([...trackedFiles, ...untrackedFiles])];
}

function shouldScan(file) {
  const normalized = file.replace(/\\/g, "/");
  if (ignoredPaths.some((pattern) => pattern.test(normalized))) {
    return false;
  }
  return textExtensions.has(path.extname(normalized));
}

function suspiciousTokenCount(line) {
  return mojibakeTokens.reduce((count, token) => {
    return line.includes(token) ? count + 1 : count;
  }, 0);
}

const findings = [];

for (const file of listSourceFiles().filter(shouldScan)) {
  const absolutePath = path.join(repoRoot, file);
  const content = fs.readFileSync(absolutePath, "utf8");
  content.split(/\r?\n/).forEach((line, index) => {
    if (line.includes("\uFFFD")) {
      findings.push({
        file,
        line: index + 1,
        reason: "replacement character",
        text: line.trim().slice(0, 180),
      });
      return;
    }

    if (suspiciousTokenCount(line) >= 2) {
      findings.push({
        file,
        line: index + 1,
        reason: "possible mojibake",
        text: line.trim().slice(0, 180),
      });
    }
  });
}

if (findings.length > 0) {
  console.error("Source encoding check failed. Possible mojibake found:");
  for (const finding of findings.slice(0, 40)) {
    console.error(
      `- ${finding.file}:${finding.line} (${finding.reason}) ${finding.text}`
    );
  }
  if (findings.length > 40) {
    console.error(`...and ${findings.length - 40} more.`);
  }
  process.exit(1);
}

console.log("Source encoding check passed.");
