import type { ReactNode } from "react";
import { PublicCard, PublicLink } from "./ui/PublicControls";

/** Shared recovery layout; callers supply actions and never expose exception details. */
export default function PublicPageState({ state, title, description, children }: {
  state: "not-found" | "error";
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return <main className="gs-page-state" data-gs-page-state={state}>
    <PublicCard className="gs-page-state-card">
      {state === "not-found" && <p className="gs-page-state-code">404</p>}
      <h1>{title}</h1>
      <p role={state === "error" ? "alert" : undefined}>{description}</p>
      <div className="gs-page-state-actions">
        {children}
        <PublicLink href="/zh">返回首页</PublicLink>
        {state === "not-found" && <PublicLink href="/zh/ai-pricing">浏览订阅价格</PublicLink>}
      </div>
    </PublicCard>
  </main>;
}
