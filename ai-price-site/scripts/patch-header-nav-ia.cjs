const fs = require("fs");
const path = require("path");

const filePath = path.join(process.cwd(), "components", "Header.tsx");
let content = fs.readFileSync(filePath, "utf8");

const oldBlock = `  {
    name: "礼品卡",
    href: "/gift-cards/",
    match: ["/gift-cards"],
  },
  {
    name: "VPN 对比",
    href: "/vpn/",
    match: ["/vpn"],
  },
  {
    name: "AI 工具",
    href: "/ai-rankings/",
    match: ["/ai-rankings"],
  },`;

const newBlock = `  {
    name: "软件订阅",
    href: "/software-subscriptions/",
    match: ["/software-subscriptions"],
  },
  {
    name: "游戏 / Steam",
    href: "/gaming-steam/",
    match: ["/gaming-steam"],
  },
  {
    name: "礼品卡",
    href: "/gift-cards/",
    match: ["/gift-cards"],
  },
  {
    name: "AI 工具",
    href: "/ai-rankings/",
    match: ["/ai-rankings"],
  },`;

if (!content.includes(oldBlock)) {
  console.error("没有找到原始菜单片段。为避免误改，脚本停止。");
  process.exit(1);
}

content = content.replace(oldBlock, newBlock);

fs.writeFileSync(filePath, content, "utf8");
console.log("Header nav updated: removed VPN, added Software and Gaming / Steam.");
