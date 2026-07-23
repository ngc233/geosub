import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { guardUnreleasedPublicPage } from "../../../lib/public-page-guard";

export const metadata: Metadata = {
  title: "VPN 对比",
  robots: { index: false, follow: false },
};

export default function VpnPage() {
  guardUnreleasedPublicPage();
  notFound();
}
