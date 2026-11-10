import type { ReactNode } from "react";
import PublicIcon from "./PublicIcon";

// Country data notes must remain readable without hydration. PublicDisclosure
// requires JavaScript, so this local wrapper uses the native disclosure control.
export default function CountryDataDisclosure({ children }: { children: ReactNode }) {
  return <details className="gs-country-evidence">
    <summary className="gs-disclosure-header">数据说明与来源<PublicIcon name="ChevronDown" className="gs-disclosure-chevron" size={16}/></summary>
    <div className="gs-country-evidence-content">{children}</div>
  </details>;
}
