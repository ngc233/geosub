const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
require("dotenv").config();

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const desired = {
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

async function ensureParent({ locale, position, item, sortOrder }) {
  const existing = await prisma.navigationItem.findMany({
    where: {
      locale,
      position,
      parentId: null,
      href: item.href,
    },
    orderBy: [{ createdAt: "asc" }],
  });
  let parent = existing[0];

  if (!parent) {
    parent = await prisma.navigationItem.create({
      data: {
        locale,
        position,
        parentId: null,
        label: item.label,
        href: item.href,
        external: false,
        status: "PUBLISHED",
        sortOrder,
      },
    });
  } else {
    parent = await prisma.navigationItem.update({
      where: { id: parent.id },
      data: {
        label: item.label,
        external: false,
        status: "PUBLISHED",
        sortOrder,
      },
    });
  }

  for (const duplicate of existing.slice(1)) {
    await prisma.navigationItem.update({
      where: { id: duplicate.id },
      data: { status: "DRAFT" },
    });
  }

  return parent;
}

async function ensureChild({ locale, position, parentId, item, sortOrder }) {
  const existing = await prisma.navigationItem.findMany({
    where: {
      locale,
      position,
      parentId,
      href: item.href,
    },
    orderBy: [{ createdAt: "asc" }],
  });
  const child = existing[0];

  if (!child) {
    await prisma.navigationItem.create({
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
    });
  } else {
    await prisma.navigationItem.update({
      where: { id: child.id },
      data: {
        label: item.label,
        external: false,
        status: "PUBLISHED",
        sortOrder,
      },
    });
  }

  for (const duplicate of existing.slice(1)) {
    await prisma.navigationItem.update({
      where: { id: duplicate.id },
      data: { status: "DRAFT" },
    });
  }
}

async function reconcileBucket(locale, position, groups) {
  const desiredParentHrefs = new Set(groups.map((item) => item.href));
  const desiredChildPairs = new Set();

  for (const [groupIndex, group] of groups.entries()) {
    const parent = await ensureParent({
      locale,
      position,
      item: group,
      sortOrder: (groupIndex + 1) * 10,
    });

    for (const [childIndex, child] of (group.children || []).entries()) {
      desiredChildPairs.add(`${parent.id}:${child.href}`);
      await ensureChild({
        locale,
        position,
        parentId: parent.id,
        item: child,
        sortOrder: (childIndex + 1) * 10,
      });
    }
  }

  const allItems = await prisma.navigationItem.findMany({
    where: { locale, position },
  });

  for (const item of allItems) {
    const shouldStayPublished = item.parentId
      ? desiredChildPairs.has(`${item.parentId}:${item.href}`)
      : desiredParentHrefs.has(item.href);

    if (!shouldStayPublished && item.status !== "DRAFT") {
      await prisma.navigationItem.update({
        where: { id: item.id },
        data: { status: "DRAFT" },
      });
    }
  }
}

async function main() {
  for (const [locale, buckets] of Object.entries(desired)) {
    for (const [position, groups] of Object.entries(buckets)) {
      await reconcileBucket(locale, position, groups);
    }
  }

  await prisma.navigationItem.updateMany({
    where: {
      locale: {
        notIn: ["ZH", "EN"],
      },
      status: {
        not: "DRAFT",
      },
    },
    data: {
      status: "DRAFT",
    },
  });

  const published = await prisma.navigationItem.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ locale: "asc" }, { position: "asc" }, { sortOrder: "asc" }],
    select: {
      locale: true,
      position: true,
      parentId: true,
      label: true,
      href: true,
    },
  });

  console.log(`Published navigation items: ${published.length}`);
  for (const item of published) {
    console.log(
      `${item.locale}\t${item.position}\t${item.parentId ? "child" : "parent"}\t${item.label}\t${item.href}`,
    );
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
