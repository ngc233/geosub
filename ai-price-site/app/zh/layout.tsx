import type { ReactNode } from "react";

// Keep the existing root chrome and rendering policy; this segment only scopes recovery UI.
export default function ChinesePublicLayout({ children }: { children: ReactNode }) {
  return children;
}
