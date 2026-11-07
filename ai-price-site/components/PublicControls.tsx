"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import PublicIcon from "./PublicIcon";

export function PublicSegments({ label, options, value, onChange }: {
  label:string; options:{value:string;label:string}[]; value:string; onChange:(value:string)=>void;
}) {
  const selected=Math.max(0,options.findIndex(option=>option.value===value));
  const [morph,setMorph]=useState({selected,cycle:0,changed:false});
  // Alternate even for nonadjacent selections; index parity alone misses 0 -> 2.
  if(morph.selected!==selected)setMorph({selected,cycle:1-morph.cycle,changed:true});
  return <div data-jelly-cycle={morph.changed?morph.cycle:undefined} className="gs-segments" role="tablist" aria-label={label} style={{"--gs-count":options.length,"--gs-selected":selected} as CSSProperties}>
    <span className="gs-segment-slider" aria-hidden="true"/>
    {options.map((option,index)=><button key={option.value} type="button" role="tab" aria-selected={option.value===value} tabIndex={option.value===value?0:-1} onClick={()=>onChange(option.value)} onKeyDown={e=>{
      let next=index;if(e.key==="ArrowRight")next=(index+1)%options.length;else if(e.key==="ArrowLeft")next=(index-1+options.length)%options.length;else if(e.key==="Home")next=0;else if(e.key==="End")next=options.length-1;else return;
      e.preventDefault();onChange(options[next].value);(e.currentTarget.parentElement?.querySelectorAll("button")[next] as HTMLButtonElement)?.focus();
    }}>{option.label}</button>)}
  </div>;
}

export function PublicDisclosure({ title, children, defaultOpen=false }: {title:ReactNode;children:ReactNode;defaultOpen?:boolean}) {
  const [open,setOpen]=useState(defaultOpen);const id=useId();
  return <section data-gs-disclosure data-open={open}><button className="gs-disclosure-header" type="button" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}>{title}<PublicIcon name="ChevronDown" className="gs-disclosure-chevron" size={16}/></button>
    <div className="gs-disclosure-grid"><div id={id} inert={!open}>{children}</div></div>
  </section>;
}

/** Widths are supplied by the page's canonical dataset; visible text carries the values. */
export function PublicComparisonBar({ label, value, maximum, tone, marker, hideValue=false }: {label:string;value:number;maximum:number;tone:"low"|"baseline"|"high";marker?:number;hideValue?:boolean}) {
  const ref=useRef<HTMLDivElement>(null);const [entered,setEntered]=useState(false);
  useEffect(()=>{const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setEntered(true);observer.disconnect();}});if(ref.current)observer.observe(ref.current);return()=>observer.disconnect();},[]);
  if(!Number.isFinite(value)||!Number.isFinite(maximum)||maximum<=0||value<0)return null;
  return <div ref={ref} className="gs-comparison" data-entered={entered}><div className="gs-comparison-label"><span>{label}</span>{!hideValue&&<span>{value}</span>}</div>
    <div className="gs-bar-track" aria-hidden="true"><span className="gs-bar-fill" data-tone={tone} style={{"--gs-fraction":Math.min(1,value/maximum)} as CSSProperties}/>
      {marker!==undefined&&Number.isFinite(marker)&&<span className="gs-bar-marker" style={{left:`${Math.max(0,Math.min(100,marker/maximum*100))}%`}}/>}</div>
  </div>;
}

export function PublicTutorialCard({ article }: {article?:{href:string;title:string;summary:string}|null}) {
  return article?<Link href={article.href} className="gs-tutorial" data-gs-motion-card><PublicIcon name="BookOpen"/><span><strong>{article.title}</strong><small>{article.summary}</small></span><PublicIcon name="ArrowRight"/></Link>:null;
}
export function PublicPromotionPlaceholder({ enabled=false }: {enabled?:boolean}) {return enabled?<aside className="gs-promotion" aria-label="推广位"><span>推广</span></aside>:null;}
export function PublicEmphasis({children}:{children:ReactNode}) {return <aside className="gs-emphasis">{children}</aside>;}

/** Native modal supplies inert background, keyboard focus containment and Escape. */
export function PublicDialog({ label, onClose, children, variant = "menu" }: {
  label: string; onClose: () => void; children: ReactNode; variant?: "menu" | "search" | "currency";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const dialog = ref.current!;
    const trigger = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-gs-initial-focus]")?.focus();
    document.body.style.overflow = "hidden";
    return () => { dialog.close(); document.body.style.overflow = overflow; trigger?.focus(); };
  }, []);
  return <dialog ref={ref} className="gs-public-unified gs-dialog" data-variant={variant} aria-label={label}
    onCancel={event => { event.preventDefault(); close.current(); }}
    onClick={event => { if (event.target === event.currentTarget) close.current(); }}>
    <div className="gs-dialog-body">
      <div className="gs-dialog-heading"><strong>{label}</strong><button type="button" data-gs-ui="icon-button" aria-label={`关闭${label}`} onClick={onClose}><PublicIcon name="X" /></button></div>
      {children}
    </div>
  </dialog>;
}
