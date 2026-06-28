const fs = require("fs");
const path = require("path");

const filePath = path.join(process.cwd(), "components", "ui", "SegmentedControl.tsx");
let content = fs.readFileSync(filePath, "utf8");

content = content.replace(
  `function getToneClasses(tone: "green" | "blue") {
  if (tone === "blue") {
    return {
      hover:
        "hover:bg-blue-50/60 hover:text-zinc-950 dark:hover:bg-blue-500/10 dark:hover:text-white",
      focus:
        "focus-visible:ring-blue-500/30",
    };
  }

  return {
    hover:
      "hover:bg-lime-50/70 hover:text-zinc-950 dark:hover:bg-lime-500/10 dark:hover:text-white",
    focus:
      "focus-visible:ring-lime-500/30",
  };
}`,
  `function getToneClasses(tone: "green" | "blue") {
  if (tone === "blue") {
    return {
      activeText: "text-blue-700 dark:text-blue-300",
      hover:
        "hover:bg-blue-50/70 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300",
      focus:
        "focus-visible:ring-blue-500/30",
      thumb:
        "bg-white shadow-sm shadow-blue-900/[0.10] ring-2 ring-blue-200 dark:bg-zinc-800 dark:ring-blue-500/30",
    };
  }

  return {
    activeText: "text-zinc-950 dark:text-white",
    hover:
      "hover:bg-lime-50/70 hover:text-zinc-950 dark:hover:bg-lime-500/10 dark:hover:text-white",
    focus:
      "focus-visible:ring-lime-500/30",
    thumb:
      "bg-white shadow-sm shadow-zinc-950/[0.08] ring-1 ring-zinc-950/[0.04] dark:bg-zinc-800 dark:ring-white/[0.06]",
  };
}`
);

content = content.replace(
  `active
        ? "text-zinc-950 dark:text-white"
        : "text-zinc-500 dark:text-zinc-400",`,
  `active
        ? toneClasses.activeText
        : "text-zinc-500 dark:text-zinc-400",`
);

content = content.replace(
  `"absolute left-1 top-1 bottom-1 bg-white shadow-sm shadow-zinc-950/[0.08] ring-1 ring-zinc-950/[0.04] transition-transform duration-200 ease-out dark:bg-zinc-800 dark:ring-white/[0.06]",`,
  `"absolute left-1 top-1 bottom-1 transition-transform duration-200 ease-out",
          toneClasses.thumb,`
);

fs.writeFileSync(filePath, content, "utf8");
console.log("SegmentedControl blue tone updated.");
