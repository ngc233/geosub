import AdminLink from "./AdminLink";
import { AdminCard } from "./AdminCard";
import { getAdminVersionOverview } from "../../lib/admin-version-overview";
import type { VersionItem } from "../../lib/admin-version-model";

function VersionRow({ item }: { item: VersionItem }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-admin-text">{item.title}</h3>
        <span className="shrink-0 whitespace-nowrap text-xs text-admin-text-muted">{item.status}</span>
      </div>
      <p className="mt-2 break-all font-semibold tabular-nums text-admin-text">{item.version}</p>
      <p className="mt-2 text-xs leading-5 text-admin-text-muted">{item.detail}</p>
      {item.updatedAt ? (
        <p className="mt-1 text-xs text-admin-text-faint">
          记录于 {new Date(item.updatedAt).toLocaleString("zh-CN", {
            timeZone: "Asia/Singapore", hour12: false,
          })}（UTC+8）
        </p>
      ) : null}
    </div>
  );
}

export default async function AdminVersionOverview({ compact = false }: { compact?: boolean }) {
  const versions = await getAdminVersionOverview();
  if (compact) {
    return (
      <AdminCard className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-admin-text">版本总览</h2>
          <AdminLink href="/admin/system#versions" className="text-sm text-admin-accent hover:underline">
            查看各项版本
          </AdminLink>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[versions.website, versions.collector, versions.prices, {
            key: "content", title: "文案 / SEO", version: "按页面独立修订",
          }].map(item => (
            <div key={item.key} className="min-w-0">
              <dt className="text-xs text-admin-text-muted">{item.title}</dt>
              <dd className="mt-1 break-all text-sm font-medium tabular-nums text-admin-text">{item.version}</dd>
            </div>
          ))}
        </dl>
      </AdminCard>
    );
  }
  return (
    <section id="versions" aria-labelledby="versions-title" className="mb-6 scroll-mt-24">
      <AdminCard>
        <h2 id="versions-title" className="text-base font-semibold text-admin-text">版本总览</h2>
        <p className="mt-2 text-sm text-admin-text-muted">分别查看程序、采集器、正式价格与页面文案的实际版本。</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {[versions.website, versions.collector, versions.prices].map(item => (
            <VersionRow key={item.key} item={item} />
          ))}
          <div className="min-w-0 space-y-4">
            <h3 className="text-sm font-semibold text-admin-text">文案 / SEO</h3>
            {versions.content.map(item => <VersionRow key={item.key} item={item} />)}
          </div>
        </div>
      </AdminCard>
    </section>
  );
}
