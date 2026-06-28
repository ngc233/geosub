const fs = require("fs");
const path = require("path");

const filePath = path.join(process.cwd(), "components", "admin", "AdminSidebar.tsx");
let content = fs.readFileSync(filePath, "utf8");

content = content.replace(
  `  LogOut,
  Search,`,
  `  LogOut,
  Menu,
  Search,`
);

content = content.replace(
  `  { label: "文章管理", href: "/admin/articles", icon: FileText },
  { label: "SEO 管理", href: "/admin/seo", icon: Search },`,
  `  { label: "文章管理", href: "/admin/articles", icon: FileText },
  { label: "导航菜单", href: "/admin/navigation", icon: Menu },
  { label: "SEO 管理", href: "/admin/seo", icon: Search },`
);

fs.writeFileSync(filePath, content, "utf8");
console.log("AdminSidebar navigation link added.");
