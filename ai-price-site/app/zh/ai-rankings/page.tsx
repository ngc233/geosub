import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { guardUnreleasedPublicPage } from "../../../lib/public-page-guard";

export const metadata: Metadata = {
  title: "AI 工具排行榜",
  robots: { index: false, follow: false },
};

export default function AiRankingsPage() {
  guardUnreleasedPublicPage();
  notFound();
}
