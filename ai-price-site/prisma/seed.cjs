require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { randomBytes, scryptSync } = require("node:crypto");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Please check .env file.");
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return "scrypt:" + salt + ":" + hash;
}

async function upsertSetting(settingKey, groupName, label, valueText, isPublic = false, note = null) {
  return prisma.siteSetting.upsert({
    where: { settingKey },
    update: { groupName, label, valueText, isPublic, note },
    create: { settingKey, groupName, label, valueText, isPublic, note },
  });
}

async function upsertTrackingEvent(eventKey, eventName, description) {
  return prisma.trackingEvent.upsert({
    where: { eventKey },
    update: { eventName, description, enabled: true },
    create: { eventKey, eventName, description, enabled: true },
  });
}

async function upsertAdSlot(slotKey, name, position, pageType, provider, priority) {
  return prisma.adSlot.upsert({
    where: { slotKey },
    update: {
      name,
      position,
      pageType,
      provider,
      priority,
      status: "PUBLISHED",
      showOnMobile: true,
      showOnDesktop: true,
    },
    create: {
      slotKey,
      name,
      position,
      pageType,
      provider,
      priority,
      status: "PUBLISHED",
      showOnMobile: true,
      showOnDesktop: true,
    },
  });
}

async function main() {
  console.log("Start seeding GeoSub app database...");

  const adminEmail = "admin@geosub.local";
  const adminPassword = "GeosubAdmin_2026!";

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {
      name: "GeoSub Admin",
      role: "OWNER",
      status: "ACTIVE",
    },
    create: {
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      name: "GeoSub Admin",
      role: "OWNER",
      status: "ACTIVE",
    },
  });

  console.log("Admin user ready: " + adminEmail);
  console.log("Initial password: " + adminPassword);

  await upsertSetting("site_name", "general", "Site Name", "GeoSub", true);
  await upsertSetting("site_description", "general", "Site Description", "Global digital subscription and game price database", true);
  await upsertSetting("default_locale", "general", "Default Locale", "zh", true);
  await upsertSetting("gtm_id", "analytics", "Google Tag Manager ID", "", false);
  await upsertSetting("ga4_id", "analytics", "Google Analytics 4 ID", "", false);
  await upsertSetting("adsense_client_id", "ads", "Google AdSense Client ID", "", false);
  await upsertSetting("compliance_note", "content", "Compliance Note", "This page is for price research and regional price comparison only.", true);

  const countries = [
    ["US", "United States", "United States", "USD", "North America", true, 10],
    ["CA", "Canada", "Canada", "CAD", "North America", false, 20],
    ["MX", "Mexico", "Mexico", "MXN", "North America", false, 30],
    ["GB", "United Kingdom", "United Kingdom", "GBP", "Europe", false, 40],
    ["DE", "Germany", "Germany", "EUR", "Europe", false, 50],
    ["FR", "France", "France", "EUR", "Europe", false, 60],
    ["ES", "Spain", "Spain", "EUR", "Europe", false, 70],
    ["IT", "Italy", "Italy", "EUR", "Europe", false, 80],
    ["NL", "Netherlands", "Netherlands", "EUR", "Europe", false, 90],
    ["DK", "Denmark", "Denmark", "DKK", "Europe", false, 100],
    ["SE", "Sweden", "Sweden", "SEK", "Europe", false, 110],
    ["NO", "Norway", "Norway", "NOK", "Europe", false, 120],
    ["CH", "Switzerland", "Switzerland", "CHF", "Europe", false, 130],
    ["PL", "Poland", "Poland", "PLN", "Europe", false, 140],
    ["TR", "Turkey", "Turkey", "TRY", "Europe / Asia", false, 150],
    ["JP", "Japan", "Japan", "JPY", "Asia", false, 160],
    ["KR", "South Korea", "South Korea", "KRW", "Asia", false, 170],
    ["SG", "Singapore", "Singapore", "SGD", "Asia", false, 180],
    ["HK", "Hong Kong", "Hong Kong", "HKD", "Asia", false, 190],
    ["TW", "Taiwan", "Taiwan", "TWD", "Asia", false, 200],
    ["IN", "India", "India", "INR", "Asia", false, 210],
    ["PH", "Philippines", "Philippines", "PHP", "Asia", false, 220],
    ["TH", "Thailand", "Thailand", "THB", "Asia", false, 230],
    ["MY", "Malaysia", "Malaysia", "MYR", "Asia", false, 240],
    ["ID", "Indonesia", "Indonesia", "IDR", "Asia", false, 250],
    ["VN", "Vietnam", "Vietnam", "VND", "Asia", false, 260],
    ["AU", "Australia", "Australia", "AUD", "Oceania", false, 270],
    ["NZ", "New Zealand", "New Zealand", "NZD", "Oceania", false, 280],
    ["BR", "Brazil", "Brazil", "BRL", "South America", false, 290],
    ["AR", "Argentina", "Argentina", "ARS", "South America", false, 300],
    ["CL", "Chile", "Chile", "CLP", "South America", false, 310],
    ["CO", "Colombia", "Colombia", "COP", "South America", false, 320],
    ["ZA", "South Africa", "South Africa", "ZAR", "Africa", false, 330],
    ["AE", "United Arab Emirates", "United Arab Emirates", "AED", "Middle East", false, 340],
  ];

  const countryMap = {};

  for (const item of countries) {
    const [code, nameZh, nameEn, currency, region, isReference, sortOrder] = item;

    const country = await prisma.country.upsert({
      where: { code },
      update: {
        nameZh,
        nameEn,
        currency,
        region,
        isReference,
        isSupported: true,
        sortOrder,
      },
      create: {
        code,
        nameZh,
        nameEn,
        currency,
        region,
        isReference,
        isSupported: true,
        sortOrder,
      },
    });

    countryMap[code] = country;
  }

  const chatgpt = await prisma.product.upsert({
    where: { slug: "chatgpt" },
    update: {
      name: "ChatGPT",
      category: "AI",
      provider: "OpenAI",
      logoUrl: "/logos/chatgpt.svg",
      description: "OpenAI AI assistant subscription product.",
      officialUrl: "https://chatgpt.com/",
      status: "PUBLISHED",
      featured: true,
      sortOrder: 10,
    },
    create: {
      slug: "chatgpt",
      name: "ChatGPT",
      category: "AI",
      provider: "OpenAI",
      logoUrl: "/logos/chatgpt.svg",
      description: "OpenAI AI assistant subscription product.",
      officialUrl: "https://chatgpt.com/",
      status: "PUBLISHED",
      featured: true,
      sortOrder: 10,
    },
  });

  const plusPlan = await prisma.plan.upsert({
    where: {
      productId_slug: {
        productId: chatgpt.id,
        slug: "plus",
      },
    },
    update: {
      name: "Plus",
      billingCycle: "MONTHLY",
      description: "ChatGPT Plus monthly plan.",
      status: "PUBLISHED",
      sortOrder: 10,
    },
    create: {
      productId: chatgpt.id,
      slug: "plus",
      name: "Plus",
      billingCycle: "MONTHLY",
      description: "ChatGPT Plus monthly plan.",
      status: "PUBLISHED",
      sortOrder: 10,
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: {
      productId_slug: {
        productId: chatgpt.id,
        slug: "pro",
      },
    },
    update: {
      name: "Pro",
      billingCycle: "MONTHLY",
      description: "ChatGPT Pro monthly plan.",
      status: "PUBLISHED",
      sortOrder: 20,
    },
    create: {
      productId: chatgpt.id,
      slug: "pro",
      name: "Pro",
      billingCycle: "MONTHLY",
      description: "ChatGPT Pro monthly plan.",
      status: "PUBLISHED",
      sortOrder: 20,
    },
  });

  const officialSource = await prisma.priceSource.upsert({
    where: { sourceKey: "openai-official-pricing" },
    update: {
      name: "OpenAI Official Pricing",
      sourceLevel: "A",
      type: "OFFICIAL_PAGE",
      provider: "OpenAI",
      baseUrl: "https://openai.com/",
      reliabilityScore: 90,
      status: "ACTIVE",
      note: "Official source placeholder for initial seed data.",
    },
    create: {
      sourceKey: "openai-official-pricing",
      name: "OpenAI Official Pricing",
      sourceLevel: "A",
      type: "OFFICIAL_PAGE",
      provider: "OpenAI",
      baseUrl: "https://openai.com/",
      reliabilityScore: 90,
      status: "ACTIVE",
      note: "Official source placeholder for initial seed data.",
    },
  });

  const plusPrices = [
    ["US", "20.00", "USD", "20.00"],
    ["PH", "1100.00", "PHP", "18.80"],
    ["JP", "3000.00", "JPY", "19.10"],
    ["IN", "1999.00", "INR", "24.00"],
    ["GB", "20.00", "GBP", "25.30"],
    ["DE", "22.99", "EUR", "24.80"],
    ["DK", "179.00", "DKK", "25.60"],
    ["CA", "29.00", "CAD", "21.20"],
    ["AU", "32.99", "AUD", "21.80"],
    ["SG", "29.99", "SGD", "22.10"],
  ];

  for (const item of plusPrices) {
    const [countryCode, localPrice, currency, priceUsd] = item;
    const diff = ((Number(priceUsd) - 20) / 20) * 100;

    await prisma.regionPrice.upsert({
      where: {
        planId_countryId_billingPlatform_priceType: {
          planId: plusPlan.id,
          countryId: countryMap[countryCode].id,
          billingPlatform: "WEB",
          priceType: "LIST_PRICE",
        },
      },
      update: {
        productId: chatgpt.id,
        localPrice,
        currency,
        priceUsd,
        usBasePrice: "20.00",
        diffVsUsPercent: diff.toFixed(2),
        primarySourceId: officialSource.id,
        confidenceScore: 80,
        dataQuality: "VERIFIED",
        status: "PUBLISHED",
        lastCheckedAt: new Date(),
        publishedAt: new Date(),
        sourceSummary: "Initial seed data.",
      },
      create: {
        productId: chatgpt.id,
        planId: plusPlan.id,
        countryId: countryMap[countryCode].id,
        localPrice,
        currency,
        priceUsd,
        usBasePrice: "20.00",
        diffVsUsPercent: diff.toFixed(2),
        billingPlatform: "WEB",
        priceType: "LIST_PRICE",
        primarySourceId: officialSource.id,
        confidenceScore: 80,
        dataQuality: "VERIFIED",
        status: "PUBLISHED",
        lastCheckedAt: new Date(),
        publishedAt: new Date(),
        sourceSummary: "Initial seed data.",
      },
    });
  }

  const proPrices = [
    ["US", "200.00", "USD", "200.00"],
    ["JP", "30000.00", "JPY", "191.00"],
    ["GB", "200.00", "GBP", "253.00"],
  ];

  for (const item of proPrices) {
    const [countryCode, localPrice, currency, priceUsd] = item;
    const diff = ((Number(priceUsd) - 200) / 200) * 100;

    await prisma.regionPrice.upsert({
      where: {
        planId_countryId_billingPlatform_priceType: {
          planId: proPlan.id,
          countryId: countryMap[countryCode].id,
          billingPlatform: "WEB",
          priceType: "LIST_PRICE",
        },
      },
      update: {
        productId: chatgpt.id,
        localPrice,
        currency,
        priceUsd,
        usBasePrice: "200.00",
        diffVsUsPercent: diff.toFixed(2),
        primarySourceId: officialSource.id,
        confidenceScore: 75,
        dataQuality: "VERIFIED",
        status: "PUBLISHED",
        lastCheckedAt: new Date(),
        publishedAt: new Date(),
        sourceSummary: "Initial seed data.",
      },
      create: {
        productId: chatgpt.id,
        planId: proPlan.id,
        countryId: countryMap[countryCode].id,
        localPrice,
        currency,
        priceUsd,
        usBasePrice: "200.00",
        diffVsUsPercent: diff.toFixed(2),
        billingPlatform: "WEB",
        priceType: "LIST_PRICE",
        primarySourceId: officialSource.id,
        confidenceScore: 75,
        dataQuality: "VERIFIED",
        status: "PUBLISHED",
        lastCheckedAt: new Date(),
        publishedAt: new Date(),
        sourceSummary: "Initial seed data.",
      },
    });
  }

  await prisma.seoMeta.deleteMany({
    where: {
      productId: chatgpt.id,
      locale: "ZH",
    },
  });

  await prisma.seoMeta.create({
    data: {
      productId: chatgpt.id,
      locale: "ZH",
      title: "ChatGPT Plus Global Price Comparison | GeoSub",
      description: "Compare ChatGPT Plus prices across countries and regions.",
      h1: "ChatGPT Plus Global Price Comparison",
      canonicalUrl: "/zh/ai-pricing/chatgpt/",
      schemaType: "FAQ_PAGE",
      status: "PUBLISHED",
    },
  });

  await prisma.faq.deleteMany({
    where: {
      productId: chatgpt.id,
      locale: "ZH",
    },
  });

  await prisma.faq.createMany({
    data: [
      {
        productId: chatgpt.id,
        locale: "ZH",
        question: "Why do subscription prices differ by country?",
        answer: "Subscription services may use regional pricing based on purchasing power, taxes, platform fees, and local market strategy.",
        sortOrder: 10,
        status: "PUBLISHED",
      },
      {
        productId: chatgpt.id,
        locale: "ZH",
        question: "Is GeoSub price data real time?",
        answer: "GeoSub stores source, update time, and confidence score. Published pages should only show reviewed or published data.",
        sortOrder: 20,
        status: "PUBLISHED",
      },
      {
        productId: chatgpt.id,
        locale: "ZH",
        question: "Is this purchase advice?",
        answer: "No. GeoSub is for price research and regional comparison only.",
        sortOrder: 30,
        status: "PUBLISHED",
      },
    ],
  });

  await prisma.affiliateLink.deleteMany({
    where: {
      productId: chatgpt.id,
      locale: "ZH",
    },
  });

  await prisma.affiliateLink.create({
    data: {
      productId: chatgpt.id,
      category: "OFFICIAL",
      title: "ChatGPT Official Website",
      description: "Visit the official ChatGPT website for current plan details.",
      buttonText: "Visit Official Site",
      url: "https://chatgpt.com/",
      placement: "product_after_summary",
      locale: "ZH",
      priority: 10,
      status: "PUBLISHED",
    },
  });

  const categories = [
    ["guides", "Guides", "Guides and tutorials.", 10],
    ["price-analysis", "Price Analysis", "Subscription price analysis.", 20],
    ["rankings", "Rankings", "Product and price rankings.", 30],
    ["comparison", "Comparison", "Product comparison articles.", 40],
    ["methodology", "Methodology", "Data source and methodology notes.", 50],
  ];

  const categoryMap = {};

  for (const item of categories) {
    const [slug, name, description, sortOrder] = item;

    const category = await prisma.articleCategory.upsert({
      where: {
        slug_locale: {
          slug,
          locale: "ZH",
        },
      },
      update: {
        name,
        description,
        status: "PUBLISHED",
        sortOrder,
      },
      create: {
        slug,
        locale: "ZH",
        name,
        description,
        status: "PUBLISHED",
        sortOrder,
      },
    });

    categoryMap[slug] = category;
  }

  await prisma.article.upsert({
    where: {
      slug_locale: {
        slug: "why-subscription-prices-differ-by-country",
        locale: "ZH",
      },
    },
    update: {
      title: "Why subscription prices differ by country",
      excerpt: "A short explanation of regional subscription pricing.",
      articleType: "GUIDE",
      categoryId: categoryMap["price-analysis"].id,
      bodyMarkdown: "Subscription services may use different prices in different countries due to taxes, purchasing power, currency, payment channels, and local market strategy.",
      status: "PUBLISHED",
      publishedAt: new Date(),
      seoTitle: "Why subscription prices differ by country | GeoSub",
      seoDescription: "Understand the main reasons behind global subscription price differences.",
      structuredDataType: "ARTICLE",
      noindex: false,
      nofollow: false,
    },
    create: {
      slug: "why-subscription-prices-differ-by-country",
      locale: "ZH",
      title: "Why subscription prices differ by country",
      excerpt: "A short explanation of regional subscription pricing.",
      articleType: "GUIDE",
      categoryId: categoryMap["price-analysis"].id,
      bodyMarkdown: "Subscription services may use different prices in different countries due to taxes, purchasing power, currency, payment channels, and local market strategy.",
      status: "PUBLISHED",
      publishedAt: new Date(),
      seoTitle: "Why subscription prices differ by country | GeoSub",
      seoDescription: "Understand the main reasons behind global subscription price differences.",
      structuredDataType: "ARTICLE",
      noindex: false,
      nofollow: false,
    },
  });

  await prisma.navigationItem.deleteMany({
    where: {
      locale: "ZH",
      position: "HEADER",
    },
  });

  await prisma.navigationItem.createMany({
    data: [
      { locale: "ZH", label: "Home", href: "/zh/", position: "HEADER", status: "PUBLISHED", sortOrder: 10 },
      { locale: "ZH", label: "AI Pricing", href: "/zh/ai-pricing/", position: "HEADER", status: "PUBLISHED", sortOrder: 20 },
      { locale: "ZH", label: "Gift Cards", href: "/zh/gift-cards/", position: "HEADER", status: "PUBLISHED", sortOrder: 30 },
      { locale: "ZH", label: "VPN", href: "/zh/vpn/", position: "HEADER", status: "PUBLISHED", sortOrder: 40 },
      { locale: "ZH", label: "AI Rankings", href: "/zh/ai-rankings/", position: "HEADER", status: "PUBLISHED", sortOrder: 50 },
      { locale: "ZH", label: "Guides", href: "/zh/guides/", position: "HEADER", status: "PUBLISHED", sortOrder: 60 },
    ],
  });

  await upsertAdSlot("product_after_map", "Product page after map", "product_after_map", "PRODUCT", "ADSENSE", 10);
  await upsertAdSlot("product_after_table", "Product page after table", "product_after_table", "PRODUCT", "ADSENSE", 20);
  await upsertAdSlot("product_before_faq", "Product page before FAQ", "product_before_faq", "PRODUCT", "ADSENSE", 30);
  await upsertAdSlot("sidebar_card", "Sidebar card", "sidebar_card", "GLOBAL", "CUSTOM", 40);
  await upsertAdSlot("ranking_inline", "Ranking inline", "ranking_inline", "RANKING", "ADSENSE", 50);

  const events = [
    ["view_product_page", "View product page", "User views product page."],
    ["select_plan", "Select plan", "User switches plan."],
    ["click_country", "Click country", "User clicks country."],
    ["open_share_modal", "Open share modal", "User opens share modal."],
    ["download_share_image", "Download share image", "User downloads share image."],
    ["click_affiliate", "Click affiliate", "User clicks affiliate link."],
    ["click_ad", "Click ad", "User clicks ad slot."],
    ["copy_link", "Copy link", "User copies page link."],
    ["search_product", "Search product", "User searches product."],
    ["language_switch", "Language switch", "User switches language."],
  ];

  for (const item of events) {
    await upsertTrackingEvent(item[0], item[1], item[2]);
  }

  console.log("Seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
