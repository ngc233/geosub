import type { ReactNode } from "react";
import "../public-tokens.css";
import "../public-base.css";
import "../public-components.css";
import "../public-motion.css";
// Scope is on the new chrome/components only; existing page bodies stay unchanged.
export default function ChineseLayout({ children }: { children: ReactNode }) { return children; }
