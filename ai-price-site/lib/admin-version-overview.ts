import "server-only";

import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { join } from "node:path";
import packageJson from "../package.json";
import { prisma } from "./prisma";
import { readAdminReadModel } from "./admin-read-model-cache";
import { parseCollectorMetadata, priceVersionLabel, type VersionItem } from "./admin-version-model";
import { contentTargets } from "./content-target-registry";
import { assertContentTargetRuntime } from "./managed-content";
import { contentStore } from "./managed-content-store";

async function collectorVersion(): Promise<VersionItem> {
  const missing = {
    key: "collector", title: "采集器", version: "未接入",
    status: "版本信息不可用", detail: "采集组件独立更新后，由发布回执提供实际生效版本。",
  };
  let file;
  try {
    const root = process.env.GEOSUB_RELEASE_DIR || "/opt/geosub/releases";
    file = await open(join(root, "collector-version.json"), constants.O_RDONLY | constants.O_NOFOLLOW);
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > 4096) return missing;
    const metadata = parseCollectorMetadata(JSON.parse(await file.readFile("utf8")));
    if (!metadata) return missing;
    return {
      key: "collector", title: "采集器", version: `v${metadata.version}`,
      status: metadata.operation === "rollback" ? "已回退" : "已生效",
      detail: `提交 ${metadata.commit.slice(0, 12)} · 独立于网站发布`,
      updatedAt: metadata.deployedAt,
    };
  } catch {
    return missing;
  } finally {
    await file?.close();
  }
}

type PriceVersionRow = {
  revision: string;
  recorded_at: Date;
  price_count: string;
  product_count: string;
  ios_count: string;
  web_count: string;
  fingerprint: string;
};

async function priceVersion(): Promise<VersionItem> {
  const missing = {
    key: "prices", title: "正式价格", version: "未建档",
    status: "独立编号未启用", detail: "仅正式数据变化生成版本；同价核验单独更新时间。",
  };
  try {
    const [table] = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT to_regclass('public.price_dataset_versions') IS NOT NULL AS exists
    `;
    if (!table?.exists) return missing;
    const [row] = await prisma.$queryRaw<PriceVersionRow[]>`
      SELECT revision::text, recorded_at, price_count::text, product_count::text,
        ios_count::text, web_count::text, fingerprint
      FROM public.price_dataset_versions ORDER BY revision DESC LIMIT 1
    `;
    if (!row) return missing;
    const version = priceVersionLabel(row.revision, row.recorded_at);
    if (!version || !/^[a-f0-9]{64}$/.test(row.fingerprint)) throw new Error("Invalid price version");
    return {
      key: "prices", title: "正式价格", version, status: "已建档",
      detail: `${row.product_count} 个产品 · ${row.price_count} 条正式价`
        + ` · iOS ${row.ios_count} / Web ${row.web_count}`,
      updatedAt: row.recorded_at.toISOString(),
    };
  } catch {
    return { ...missing, version: "读取失败", status: "暂不可用", detail: "请稍后刷新查看，未使用推测版本。" };
  }
}

async function contentVersions(): Promise<VersionItem[]> {
  return Promise.all(contentTargets.map(async target => {
    const item = {
      key: target.id,
      title: `${target.productSlug === "chatgpt" ? "ChatGPT" : "Claude"} 总览 · ${target.locale === "zh" ? "中文" : "英文"}`,
      version: "模板文案", status: "尚未单独发布", detail: "按页面与语言独立记录修订。",
    };
    try {
      assertContentTargetRuntime(target.id);
    } catch {
      return { ...item, status: "未启用独立文案" };
    }
    try {
      const store = contentStore(target.id);
      const state = await store.readContentState();
      if (!state.version) return item;
      const revision = await store.readRevision(state.version);
      if (!revision) throw new Error("Missing revision");
      return {
        ...item, version: `C${String(revision.version).padStart(4, "0")}`,
        status: state.receipt === "verified" ? "分发已验证" : "分发待核验",
        detail: "独立文案修订，不改变价格版本。", updatedAt: revision.createdAt,
      };
    } catch {
      return { ...item, version: "读取失败", status: "暂不可用" };
    }
  }));
}

export async function getAdminVersionOverview() {
  return readAdminReadModel("versions.overview", async () => {
    const [collector, prices, content] = await Promise.all([
      collectorVersion(), priceVersion(), contentVersions(),
    ]);
    const website: VersionItem = {
      key: "website", title: "网站程序", version: `v${packageJson.version}`,
      status: "当前运行", detail: "当前网站构建版本，独立于采集器和数据。",
    };
    return { website, collector, prices, content };
  });
}
