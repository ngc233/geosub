"use client";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { supportedDisplayCurrencies, getDisplayCurrencySymbol, isSupportedDisplayCurrency, type DisplayCurrency } from "../lib/display-currency";
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
export default function PublicCurrencySelect({ onChange, displayCurrency }: {onChange?:(value:DisplayCurrency)=>void;displayCurrency?:string}) {
  const [currency,select]=usePublicCurrency();
  const [open,setOpen]=useState(false);
  const [active,setActive]=useState(0);
  const id=useId();
  const list=useRef<HTMLDivElement>(null);
  const names=new Intl.DisplayNames(["zh-CN"],{type:"currency"});
  const shown=displayCurrency && isSupportedDisplayCurrency(displayCurrency) ? displayCurrency : currency;
  const choose=(code:DisplayCurrency)=>{select(code);onChange?.(code);setOpen(false);};
  return <><button type="button" data-gs-ui="button" aria-haspopup="dialog" onClick={()=>{setActive(supportedDisplayCurrencies.indexOf(currency));setOpen(true);}}><PublicIcon name="Banknote" size={20} className="gs-currency-mark"/><span>折合为 <b>{getDisplayCurrencySymbol(shown)} {shown}</b></span><PublicIcon name="ChevronDown" size={16}/></button>
    {open&&<PublicDialog label="选择币种" variant="currency" onClose={()=>setOpen(false)}>
      <div ref={list} id={id} role="listbox" aria-label="显示币种" className="gs-currency-options" onKeyDown={event=>{
        const columns=getComputedStyle(list.current!).gridTemplateColumns.split(" ").length;
        const offset={ArrowDown:columns,ArrowUp:-columns,ArrowRight:1,ArrowLeft:-1}[event.key];
        let next=active;
        if(offset!==undefined) next=Math.max(0,Math.min(supportedDisplayCurrencies.length-1,active+offset));
        else if(event.key==="Home") next=0;
        else if(event.key==="End") next=supportedDisplayCurrencies.length-1;
        else return;
        event.preventDefault();setActive(next);
        list.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[next]?.focus();
      }}>{supportedDisplayCurrencies.map((code,index)=><button type="button" key={code} id={`${id}-${code}`} role="option" aria-label={`${code} · ${names.of(code)}`} aria-selected={currency===code} data-active={index===active} data-gs-initial-focus={currency===code || undefined} tabIndex={index===active?0:-1} onFocus={()=>setActive(index)} onClick={()=>choose(code)}>
        <span className="gs-currency-symbol" aria-hidden="true">{getDisplayCurrencySymbol(code)}</span><span className="gs-currency-label"><strong>{code}</strong><small>{names.of(code)}</small></span>{currency===code&&<PublicIcon name="Check" size={16}/>}</button>)}</div>
    </PublicDialog>}</>;

}

// A page publishes only its already-read, valid DATA-1 rates. Header search
// follows that page's preference without another query or persisted rate data.
let pageRates:Readonly<Record<string,number>>|null=null;
export function usePageDisplayRates(rates:Readonly<Record<string,number>>) {
  useEffect(()=>{pageRates=rates;window.dispatchEvent(new Event(eventName));return()=>{if(pageRates===rates){pageRates=null;window.dispatchEvent(new Event(eventName));}};},[rates]);
}
export function useSearchDisplayCurrency() {
  const [preferred]=usePublicCurrency();
  const rates=useSyncExternalStore(subscribe,()=>pageRates,()=>null);
  const currency=rates?.[preferred]?preferred:"USD";
  return {currency,rate:rates?.[currency]??1,changeKey:preferred};
}
