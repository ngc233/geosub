const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
require("dotenv").config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({
  adapter,
});

const templates = {
  ZH: {
    HEADER: [
      { label: "首页", href: "/zh/" },
      {
        label: "数字订阅",
        href: "/zh/ai-pricing",
        children: [
          { label: "AI 订阅", href: "/zh/ai-pricing" },
          { label: "流媒体", href: "/zh/streaming-pricing" },
        ],
      },
      { label: "订阅指南", href: "/zh/guides" },
      { label: "数据来源", href: "/zh/data-sources" },
    ],
    FOOTER: [
      {
        label: "价格数据",
        href: "/zh/ai-pricing",
        children: [
          { label: "AI 订阅价格", href: "/zh/ai-pricing" },
          { label: "软件订阅", href: "/zh/software-subscriptions" },
          { label: "游戏 / Steam", href: "/zh/gaming-steam" },
          { label: "礼品卡", href: "/zh/gift-cards" },
          { label: "购买力排行", href: "/zh/ai-rankings" },
        ],
      },
      {
        label: "指南",
        href: "/zh/guides",
        children: [
          { label: "全部指南", href: "/zh/guides" },
          { label: "价格指南", href: "/zh/guides/price-guide" },
          { label: "礼品卡教程", href: "/zh/guides/gift-card-guide" },
          { label: "支付与账号", href: "/zh/guides/payment-account" },
          { label: "工具测评", href: "/zh/guides/tool-review" },
          { label: "方法论", href: "/zh/guides/methodology" },
        ],
      },
      {
        label: "站点",
        href: "/zh/about",
        children: [
          { label: "关于 GeoSub", href: "/zh/about" },
          { label: "数据来源", href: "/zh/data-sources" },
          { label: "方法论", href: "/zh/methodology" },
          { label: "联系我们", href: "/zh/contact" },
        ],
      },
      {
        label: "政策",
        href: "/zh/privacy",
        children: [
          { label: "隐私政策", href: "/zh/privacy" },
          { label: "服务条款", href: "/zh/terms" },
        ],
      },
    ],
  },
  EN: {
    HEADER: [
      { label: "Home", href: "/en/" },
      {
        label: "Digital Subscriptions",
        href: "/en/ai-pricing",
        children: [
          { label: "AI Subscriptions", href: "/en/ai-pricing" },
          { label: "Streaming", href: "/en/streaming-pricing" },
        ],
      },
      { label: "Guides", href: "/en/guides" },
      { label: "Data Sources", href: "/en/data-sources" },
    ],
    FOOTER: [
      {
        label: "Pricing Data",
        href: "/en/ai-pricing",
        children: [
          { label: "AI Pricing", href: "/en/ai-pricing" },
          { label: "Software Subscriptions", href: "/en/software-subscriptions" },
          { label: "Gaming / Steam", href: "/en/gaming-steam" },
          { label: "Gift Cards", href: "/en/gift-cards" },
          { label: "Rankings", href: "/en/ai-rankings" },
        ],
      },
      {
        label: "Guides",
        href: "/en/guides",
        children: [
          { label: "All Guides", href: "/en/guides" },
          { label: "Price Guide", href: "/en/guides/price-guide" },
          { label: "Gift Card Guide", href: "/en/guides/gift-card-guide" },
          { label: "Payment & Account", href: "/en/guides/payment-account" },
          { label: "Tool Reviews", href: "/en/guides/tool-review" },
          { label: "Methodology", href: "/en/guides/methodology" },
        ],
      },
      {
        label: "Site",
        href: "/en/about",
        children: [
          { label: "About GeoSub", href: "/en/about" },
          { label: "Data Sources", href: "/en/data-sources" },
        ],
      },
      {
        label: "Legal",
        href: "/en/privacy",
        children: [
          { label: "Privacy", href: "/en/privacy" },
          { label: "Terms", href: "/en/terms" },
        ],
      },
    ],
  },
};

async function ensureItem({ locale, position, item, parentId, sortOrder }) {
  let current = await prisma.navigationItem.findFirst({
    where: {
      locale,
      position,
      parentId,
      href: item.href,
    },
    select: {
      id: true,
    },
  });

  if (!current) {
    current = await prisma.navigationItem.create({
      data: {
        locale,
        position,
        parentId,
        label: item.label,
        href: item.href,
        external: false,
        status: "PUBLISHED",
        sortOrder,
      },
      select: {
        id: true,
      },
    });
  }

  return current;
}

async function main() {
  for (const [locale, positions] of Object.entries(templates)) {
    for (const [position, groups] of Object.entries(positions)) {
      for (const [groupIndex, group] of groups.entries()) {
        const parent = await ensureItem({
          locale,
          position,
          item: group,
          parentId: null,
          sortOrder: (groupIndex + 1) * 10,
        });

        for (const [childIndex, child] of (group.children || []).entries()) {
          await ensureItem({
            locale,
            position,
            item: child,
            parentId: parent.id,
            sortOrder: (childIndex + 1) * 10,
          });
        }
      }
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Default navigation seeded.");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
