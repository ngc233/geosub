import type { Metadata } from "next";
import { guardUnreleasedPublicPage } from "../../../lib/public-page-guard";

export const metadata: Metadata = {
  title: "VPN 对比",
  description: "GeoSub VPN 对比数据仍在建设中，暂不作为正式页面展示。",
  robots: {
    index: false,
    follow: false,
  },
};

export default function VpnPage() {
  guardUnreleasedPublicPage();

  return (
    <main className="max-w-7xl mx-auto px-6 py-16">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
        VPN 对比
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400">
        这里后面会放 VPN 下载速度、上传速度、Ping、稳定性等数据。
      </p>
    </main>
  );
}
