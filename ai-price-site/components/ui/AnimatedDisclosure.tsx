"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** Accessible grid disclosure. Lazy content stays mounted after first use so closing can animate. */
export default function AnimatedDisclosure({ title, children, className = "", open, onOpenChange, defaultOpen = false, lazy = false, actions, headingLevel = 2, buttonLabel, disabled, triggerClassName = "" }: {
  title: ReactNode; children: ReactNode; className?: string; open?: boolean; onOpenChange?: (open: boolean) => void; defaultOpen?: boolean; lazy?: boolean; actions?: ReactNode; headingLevel?: 2 | 3; buttonLabel?: string; disabled?: boolean; triggerClassName?: string;
}) {
  const id = useId();
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const [retained, setRetained] = useState(false);
  const expanded = open ?? localOpen;
  const Heading = headingLevel === 2 ? "h2" : "h3";
  function toggle() {
    setRetained(true);
    if (onOpenChange) onOpenChange(!expanded); else setLocalOpen(!expanded);
  }
  return <section className={className} data-gs-disclosure data-open={expanded}>
    <div className="gs-disclosure-header"><Heading className="gs-disclosure-heading"><button type="button" className={`gs-disclosure-trigger ${triggerClassName}`} data-gs-ui="evidence-trigger" aria-label={buttonLabel} disabled={disabled} aria-expanded={expanded} aria-controls={id} onClick={toggle}><span className="gs-disclosure-title">{title}</span><ChevronDown className="gs-disclosure-chevron" size={18} aria-hidden="true" /></button></Heading>{actions && <div className="gs-disclosure-actions">{actions}</div>}</div>
    <div id={id} className="gs-disclosure-grid" aria-hidden={!expanded} inert={!expanded}>
      <div className="gs-disclosure-inner">{!lazy || expanded || retained ? children : null}</div>
    </div>
  </section>;
}
