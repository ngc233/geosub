const fs = require("fs");
const path = require("path");

const filePath = path.join(process.cwd(), "app", "admin", "page.tsx");
let content = fs.readFileSync(filePath, "utf8");

if (!content.includes('import SegmentedControl from "../../components/ui/SegmentedControl";')) {
  content = content.replace(
    'import AdminAlert from "../../components/admin/AdminAlert";',
    'import AdminAlert from "../../components/admin/AdminAlert";\nimport SegmentedControl from "../../components/ui/SegmentedControl";'
  );
}

const oldBlock = `        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-100 p-1">
          {ranges.map((item) => (
            <Link
              key={item.value}
              href={\`/admin?range=\${item.value}\`}
              className={[
                "rounded-xl px-3 py-1.5 text-xs font-bold transition",
                item.value === range
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-900",
              ].join(" ")}
            >
              {item.label}
            </Link>
          ))}

          <span className="rounded-xl px-3 py-1.5 text-xs font-bold text-slate-400">
            自定义
          </span>
        </div>`;

const newBlock = `        <SegmentedControl
          ariaLabel="Dashboard 时间范围"
          value={String(range)}
          tone="blue"
          size="sm"
          items={[
            ...ranges.map((item) => ({
              label: item.label,
              value: String(item.value),
              href: \`/admin?range=\${item.value}\`,
            })),
            {
              label: "自定义",
              value: "custom",
              disabled: true,
            },
          ]}
        />`;

if (!content.includes(oldBlock)) {
  console.error("没有找到旧的 Dashboard 时间切换代码块。为避免误改，脚本已停止。");
  process.exit(1);
}

content = content.replace(oldBlock, newBlock);

fs.writeFileSync(filePath, content, "utf8");

console.log("Dashboard range switch updated to SegmentedControl.");
