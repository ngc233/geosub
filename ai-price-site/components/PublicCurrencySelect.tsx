"use client";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { supportedDisplayCurrencies, isSupportedDisplayCurrency, type DisplayCurrency } from "../lib/display-currency";
import { PublicDialog } from "./PublicControls";
import PublicIcon from "./PublicIcon";
const key="geosub-public-display-currency";
const eventName="geosub-public-currency-change";
let memory:DisplayCurrency="CNY";
const subscribe=(notify:()=>void)=>{window.addEventListener("storage",notify);window.addEventListener(eventName,notify);return()=>{window.removeEventListener("storage",notify);window.removeEventListener(eventName,notify);};};
const read=()=>{try{const value=localStorage.getItem(key);return value&&isSupportedDisplayCurrency(value)?value:memory;}catch{return memory;}};
export function usePublicCurrency() {
  const currency=useSyncExternalStore(subscribe,read,()=>"CNY" as DisplayCurrency);
  return [currency,(value:DisplayCurrency)=>{memory=value;try{localStorage.setItem(key,value);}catch{/* Private browsing still shares the in-memory preference. */}window.dispatchEvent(new Event(eventName));}] as const;
}
/** V2 component only: pages opt in during V3–V6. No exchange-rate fetch or page mounting. */
export default function PublicCurrencySelect({ onChange }: {onChange?:(value:DisplayCurrency)=>void}) {
  const [currency,select]=usePublicCurrency(); const [open,setOpen]=useState(false); const [query,setQuery]=useState("");const [active,setActive]=useState(0);const id=useId();
  const input=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(open)input.current?.focus();},[open]);
  useEffect(()=>{if(open)document.getElementById(`${id}-${options[active]}`)?.scrollIntoView({block:"nearest"});});
  const names=new Intl.DisplayNames(["zh-CN"],{type:"currency"});
  const options=supportedDisplayCurrencies.filter(code=>`${code} ${names.of(code)}`.toLowerCase().includes(query.toLowerCase()));
  const choose=(code:DisplayCurrency)=>{select(code);onChange?.(code);setOpen(false);};
  return <><button type="button" data-gs-ui="button" aria-haspopup="dialog" onClick={()=>{setQuery("");setActive(supportedDisplayCurrencies.indexOf(currency));setOpen(true);}}>折合为 {currency}<PublicIcon name="ChevronDown" size={16}/></button>
    {open&&<PublicDialog label="选择币种" variant="currency" onClose={()=>setOpen(false)}><input ref={input} data-gs-ui="input" aria-label="搜索币种" role="combobox" aria-expanded="true" aria-controls={id} aria-activedescendant={options[active]?`${id}-${options[active]}`:undefined} value={query} onChange={e=>{setQuery(e.target.value);setActive(0);}} onKeyDown={e=>{if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();if(options.length)setActive(old=>(old+(e.key==="ArrowDown"?1:-1)+options.length)%options.length);}if(e.key==="Enter"&&options[active]){e.preventDefault();choose(options[active]);}}}/>
      <div id={id} role="listbox" aria-label="显示币种" className="gs-currency-options">{options.map((code,index)=><div key={code} id={`${id}-${code}`} role="option" aria-selected={currency===code} data-active={index===active} onClick={()=>choose(code)}><span>{code} · {names.of(code)}</span>{currency===code&&<PublicIcon name="Check" size={16}/>}</div>)}</div>{!options.length&&<p role="status">没有匹配的币种</p>}
    </PublicDialog>}</>;
}
