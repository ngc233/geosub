const fs = require("fs");
const path = require("path");

const filePath = path.join(process.cwd(), "app", "admin", "page.tsx");
let content = fs.readFileSync(filePath, "utf8");

const oldBlock = `    {
      label: "文章",
      value: data.articles,
      helper: "内容系统文章",
      href: "/admin/articles",
    },
    {
      label: "广告位",
      value: data.adSlots,
      helper: "商业化展示位",
      href: "/admin/commercial",
    },`;

const newBlock = `    {
      label: "文章",
      value: data.articles,
      helper: "内容系统文章",
      href: "/admin/articles",
    },
    {
      label: "导航菜单",
      value: "管理",
      helper: "Header、Footer 与子菜单",
      href: "/admin/navigation",
    },
    {
      label: "广告位",
      value: data.adSlots,
      helper: "商业化展示位",
      href: "/admin/commercial",
    },`;

if (!content.includes(oldBlock)) {
  console.error("没有找到 assetStats 里的文章 / 广告位片段。为避免误改，脚本停止。");
  process.exit(1);
}

content = content.replace(oldBlock, newBlock);

content = content.replace(
  `description="数字服务、套餐、地区价格、文章和商业化配置的基础规模。"`,
  `description="数字服务、套餐、地区价格、文章、导航和商业化配置的基础规模。"`
);

content = content.replace(
  `趋势图已改为读取 daily_stats，并支持 7 天到 24 个月。下一步应该把正式前台里的官方入口、Affiliate、广告位和关键 CTA 按钮改成 TrackedLink / TrackedButton。`,
  `导航菜单已经接入后台只读预览。下一步建议先做导航启用 / 停用、排序、编辑名称和链接，再继续接正式前台埋点。`
);

fs.writeFileSync(filePath, content, "utf8");
console.log("Admin dashboard navigation card added.");
