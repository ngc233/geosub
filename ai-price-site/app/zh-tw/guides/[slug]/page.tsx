import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocaleRobotsPolicy } from "../../../../lib/seo-indexing-policy";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "找不到指南文章",
    robots: getLocaleRobotsPolicy("zh-tw"),
  };
}

export default function TraditionalChineseGuideArticlePage() {
  notFound();
}
