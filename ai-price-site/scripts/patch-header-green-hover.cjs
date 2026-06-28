const fs = require("fs");
const path = require("path");

const filePath = path.join(process.cwd(), "components", "Header.tsx");
let content = fs.readFileSync(filePath, "utf8");

const replacements = [
  [
    'className="block rounded-2xl px-3 py-3 transition duration-200 ease-out hover:bg-zinc-50 dark:hover:bg-zinc-900"',
    'className="block rounded-2xl px-3 py-3 transition duration-200 ease-out hover:bg-lime-50 dark:hover:bg-lime-500/10"',
  ],
  [
    'className="block rounded-xl px-3 py-2 text-sm font-semibold text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"',
    'className="block rounded-xl px-3 py-2 text-sm font-semibold text-zinc-500 transition duration-200 ease-out hover:bg-lime-50 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-lime-500/10 dark:hover:text-white"',
  ],
];

for (const [from, to] of replacements) {
  if (!content.includes(from)) {
    console.warn("未找到目标片段，可能已经改过：", from);
    continue;
  }

  content = content.replace(from, to);
}

fs.writeFileSync(filePath, content, "utf8");
console.log("Header hover states updated.");
