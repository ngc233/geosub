"use client";

import { Check, ChevronDown, Minus } from "lucide-react";
import { useEffect, useId, useRef, useState, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type KeyboardEvent, type ReactNode, type Ref } from "react";
import styles from "./PublicControls.module.css";
import AnimatedDisclosure from "./AnimatedDisclosure";
import SlidingSelection from "./SlidingSelection";

const join = (...values: (string | undefined | false)[]) => values.filter(Boolean).join(" ");
export type PreviewState = "hover" | "focus";

export function PublicButton({ variant = "primary", className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary"; ref?: Ref<HTMLButtonElement> }) {
  return <button type={type} data-gs-ui="button" data-gs-variant={variant} className={join(styles.button, variant === "primary" ? styles.primary : styles.secondary, className)} {...props} />;
}

export function PublicLink({ disabled, className, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { disabled?: boolean }) {
  if (disabled) return <span data-gs-ui="link" role="link" aria-disabled="true" className={join(styles.link, styles.disabled, className)}>{props.children}</span>;
  return <a data-gs-ui="link" className={join(styles.link, className)} {...props} />;
}

export function PublicIconButton({ className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { ref?: Ref<HTMLButtonElement> }) {
  return <button type={type} data-gs-ui="icon-button" className={join(styles.iconButton, className)} {...props} />;
}

export function PublicTextButton({ className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} data-gs-ui="text-button" className={join(styles.link, styles.textButton, className)} {...props} />;
}

export function PublicCard({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section data-gs-ui="card" className={join(styles.card, className)} {...props} />;
}

export function PublicTag({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span data-gs-ui="tag" className={join(styles.tag, className)} {...props} />;
}

export function PublicInput({ label, id, className, hideLabel, startIcon, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hideLabel?: boolean; startIcon?: ReactNode }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  return <div className={styles.field}>
    <label htmlFor={inputId} className={hideLabel ? styles.srOnly : undefined}>{label}</label>
    {startIcon ? <div className={styles.inputWrap}><span className={styles.inputIcon}>{startIcon}</span><input id={inputId} data-gs-ui="input" className={join(styles.input, styles.inputWithIcon, className)} {...props} /></div> : <input id={inputId} data-gs-ui="input" className={join(styles.input, className)} {...props} />}
  </div>;
}

export type PublicSelectOption = { value: string; label: string; disabled?: boolean };
export function PublicTextarea({label,id,className,...props}:TextareaHTMLAttributes<HTMLTextAreaElement>&{label:string}) {
  const generatedId=useId(),inputId=id||generatedId;
  return <div className={styles.field}><label htmlFor={inputId}>{label}</label><textarea id={inputId} data-gs-ui="textarea" className={join(styles.input,styles.textarea,className)} {...props}/></div>;
}

export function PublicSelect({ label, options, value, onChange, disabled, previewState, hideLabel, className }: {
  label: string; options: PublicSelectOption[]; value: string; onChange: (value: string) => void;
  disabled?: boolean; previewState?: PreviewState; hideLabel?: boolean; className?: string;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const search = useRef({ text: "", time: 0 });
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const [active, setActive] = useState(0);
  const enabled = options.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0);
  const current = options.findIndex(option => option.value === value);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    const menu = list.current;
    if (menu && menu.getBoundingClientRect().bottom > window.innerHeight) {
      const anchorTop = button.current?.getBoundingClientRect().top || 0;
      if (anchorTop > menu.offsetHeight) setAbove(true);
    }
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-option-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function openMenu(last = false) {
    if (disabled || enabled.length === 0) return;
    setAbove(false);
    setActive(current >= 0 && !options[current].disabled ? current : enabled[last ? enabled.length - 1 : 0]);
    setOpen(true);
  }
  function choose(index: number) {
    if (options[index] && !options[index].disabled) {
      onChange(options[index].value); setOpen(false); button.current?.focus();
    }
  }
  function handleKey(event: KeyboardEvent<HTMLButtonElement>) {
    const key = event.key;
    if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " ", "Escape"].includes(key)) event.preventDefault();
    if (key === "Tab" || key === "Escape") { setOpen(false); return; }
    if (key === "Enter" || key === " ") { if (open) choose(active); else openMenu(); return; }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(key)) {
      if (!open) { openMenu(key === "ArrowUp" || key === "End"); return; }
      const position = enabled.indexOf(active);
      setActive(key === "Home" ? enabled[0] : key === "End" ? enabled.at(-1)! : enabled[(position + (key === "ArrowUp" ? -1 : 1) + enabled.length) % enabled.length]);
      return;
    }
    if (key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      const now = Date.now();
      const text = now - search.current.time < 650 ? search.current.text + key : key;
      search.current = { text: text.toLocaleLowerCase(), time: now };
      const found = enabled.find(index => options[index].label.toLocaleLowerCase().startsWith(search.current.text));
      if (found !== undefined) { setActive(found); setOpen(true); }
    }
  }
  return <div ref={root} className={join(styles.field, className)}>
    <label id={`${id}-label`} htmlFor={`${id}-button`} className={hideLabel ? styles.srOnly : undefined}>{label}</label>
    <div className={styles.selectRoot}>
      <button ref={button} id={`${id}-button`} type="button" role="combobox" data-gs-ui="select" data-preview-state={previewState}
        className={styles.select} disabled={disabled || enabled.length === 0} aria-labelledby={`${id}-label ${id}-value`}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${id}-list` : undefined}
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        onClick={() => open ? setOpen(false) : openMenu()} onKeyDown={handleKey}>
        <span id={`${id}-value`}>{options[current]?.label || "请选择"}</span>
        <ChevronDown className={styles.icon} aria-hidden="true" />
      </button>
      {open && <div ref={list} id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`} className={join(styles.selectMenu, above && styles.selectAbove)}>
        {options.map((option, index) => <div key={option.value} id={`${id}-option-${index}`} role="option"
          data-option-index={index} aria-selected={option.value === value} aria-disabled={option.disabled || undefined}
          data-active={active === index} className={styles.selectOption}
          onPointerDown={event => { if (event.pointerType !== "touch") event.preventDefault(); }} onPointerMove={() => !option.disabled && setActive(index)}
          onClick={() => choose(index)}>
          <span>{option.label}</span>{option.value === value && <Check className={styles.icon} aria-hidden="true" />}
        </div>)}
      </div>}
    </div>
  </div>;
}

export function PublicCheckbox({ label, checked, onChange, disabled, indeterminate, previewState, hideLabel, className, animated = false }: {
  label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean;
  indeterminate?: boolean; previewState?: PreviewState; hideLabel?: boolean; className?: string; animated?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (input.current) input.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return <label className={join(styles.checkbox, disabled && styles.disabled, className)} data-preview-state={previewState}>
    <span className={styles.checkboxHit} data-gs-ui="checkbox-hit">
      <input ref={input} type="checkbox" data-gs-ui="checkbox" className={styles.checkboxInput} checked={checked}
        disabled={disabled} aria-label={label} onChange={event => onChange(event.target.checked)} />
      {animated ? <span data-gs-checkbox-mark data-checked={Boolean(checked || indeterminate)} className={styles.checkboxMark} aria-hidden="true">{indeterminate ? <Minus /> : <Check />}</span> : (checked || indeterminate) && (indeterminate ? <Minus className={styles.checkboxMark} aria-hidden="true" /> : <Check className={styles.checkboxMark} aria-hidden="true" />)}
    </span><span className={hideLabel ? styles.srOnly : undefined}>{label}</span>
  </label>;
}

export function PublicFilters({ items, value, onChange, disabled, previewState, className, label = "价格筛选", animated = true }: {
  items: { value: string; label: string; disabled?: boolean }[]; value: string; onChange: (value: string) => void;
  disabled?: boolean; previewState?: PreviewState; className?: string; label?: string; animated?: boolean;
}) {
  return <div role="group" aria-label={label} className={join(styles.filters, className)} data-gs-animated={animated ? "" : undefined}>
    {animated && <SlidingSelection kind="filter" value={value} />}
    {items.map((item, index) => <button key={item.value} type="button" data-gs-ui="filter" className={styles.filter}
      aria-pressed={item.value === value} disabled={disabled || item.disabled} data-preview-state={index === 0 ? previewState : undefined}
      onClick={() => onChange(item.value)}>{item.label}</button>)}
  </div>;
}

export function PublicEvidencePanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-gs-ui="evidence" className={join(styles.evidencePanel, className)} {...props} />;
}

export function PublicEvidence({ title, children, defaultOpen = false, disabled, previewState, label, responsiveTitle, animated = false }: {
  title: string; children: ReactNode; defaultOpen?: boolean; disabled?: boolean; previewState?: PreviewState; label?: string; responsiveTitle?: boolean; animated?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  if (animated) return <AnimatedDisclosure className={`${styles.evidence} gs-public-evidence`} title={responsiveTitle ? <span data-gs-evidence-title>{title}</span> : title} buttonLabel={label} disabled={disabled} triggerClassName={styles.evidenceTrigger} headingLevel={3} open={open} onOpenChange={setOpen}><PublicEvidencePanel>{children}</PublicEvidencePanel></AnimatedDisclosure>;
  return <div className={styles.evidence}>
    <button type="button" className={styles.evidenceTrigger} data-gs-ui="evidence-trigger" data-preview-state={previewState}
      aria-label={label} aria-expanded={open} aria-controls={id} disabled={disabled} onClick={() => setOpen(!open)}>
      {responsiveTitle ? <span data-gs-evidence-title>{title}</span> : title}<ChevronDown className={join(styles.icon, open && styles.rotated)} aria-hidden="true" />
    </button>
    <PublicEvidencePanel id={id} hidden={!open}>{children}</PublicEvidencePanel>
  </div>;
}

export function PublicConsentNotice({ onAccept, onReject, disabled, title, description, acceptLabel, rejectLabel, privacyLink }: { onAccept: () => void; onReject: () => void; disabled?: boolean; title: string; description: ReactNode; acceptLabel: string; rejectLabel: string; privacyLink?: ReactNode }) {
  return <section data-gs-ui="consent" aria-label={title} className={styles.consent}>
    <div><h3>{title}</h3><p>{description}</p></div>
    <div className={styles.consentActions}>
      {privacyLink}
      <PublicButton onClick={onAccept} disabled={disabled}>{acceptLabel}</PublicButton>
      <PublicButton variant="secondary" onClick={onReject} disabled={disabled}>{rejectLabel}</PublicButton>
    </div>
  </section>;
}
