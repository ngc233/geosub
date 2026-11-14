"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { RotateCw } from "lucide-react";
import { useEffect } from "react";
// Both fallback entries share this already-loaded boundary chunk.
const NotFoundView = dynamic(() => import("../../components/AuxiliaryNotFound"));
export function ChineseNotFound() { return <NotFoundView/>; }

export default function ChineseError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    if (document.querySelector('link[data-gs-state-styles]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/styles/v7-auxiliary-states.css";
    link.dataset.gsStateStyles = "true";
    document.head.appendChild(link);
  }, []);
  useEffect(() => { console.error("[public-page-render-failed]", { type: "Error" }); }, [error]);
  return <main className="gs-public-unified gs-state-page"><section className="gs-state-panel gs-state-error">
    <span className="gs-state-error-icon" aria-hidden="true"><RotateCw size={24} strokeWidth={1.75}/></span>
    <div><h1>页面暂时打不开</h1><p>我们这边出了点问题，已经自动记录。稍后再试，或者先看看其他价格。</p>
      <div className="gs-state-actions"><button type="button" data-gs-ui="button" onClick={retry}>重新加载</button><Link href="/zh" data-gs-ui="button">返回首页</Link></div>
    </div>
  </section></main>;
}
