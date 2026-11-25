"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChromeSearchResult } from "../lib/public-chrome-search";
import { PublicDialog } from "./PublicControls";
import PublicIcon from "./PublicIcon";
import { useSearchDisplayCurrency } from "./PublicCurrencySelect";
import PublicPriceNumber from "./PublicPriceNumber";
import HomepageProductMark from "./HomepageProductMark";
import HomepageCountryFlag from "./HomepageCountryFlag";

const searchCopy = {
  zh: {
    search: "搜索", label: "搜索产品或国家", placeholder: "搜 ChatGPT、Netflix，或者土耳其", close: undefined,
    prompt: "输入产品、套餐或国家名称开始搜索", pending: "正在搜索…",
    empty: "没有找到可显示最低价的结果，试试产品或国家的其他名称", failed: "搜索暂时不可用，请重试",
    results: "搜索结果", groups: {product:"产品",plan:"套餐",country:"国家"},
    retry: "重试", suggestions: "搜索建议", country: "印度", contact: "联系我们",
    help: "↑ ↓ 选择 · Enter 打开 · Esc 关闭",
  },
  en: {
    search: "Search", label: "Search products or countries", placeholder: "Search ChatGPT, Netflix, or Turkey", close: "Close search",
    prompt: "Enter a product, plan, or country name to search.",
    pending: "Searching…", empty: "No results with a price. Try another product or country name.",
    failed: "Search is temporarily unavailable. Please try again.",
    results: "Search results", groups: {product:"Products",plan:"Plans",country:"Countries"},
    retry: "Try again", suggestions: "Search suggestions", country: "India", contact: "Contact us",
    help: "↑ ↓ Select · Enter Open · Esc Close",
  },
} as const;

export default function PublicSearch({variant="header",locale="zh"}:{
  variant?:"header"|"hero"|"state"; locale?:"zh"|"en";
}) {
  const copy = searchCopy[locale];
  const display=useSearchDisplayCurrency(locale === "en" ? "USD" : "CNY");
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState("");
  const [results,setResults]=useState<ChromeSearchResult[]>([]);
  const [status,setStatus]=useState<string>(copy.prompt);
  const [active,setActive]=useState(0);
  const [retry,setRetry]=useState(0);
  const input=useRef<HTMLInputElement>(null);
  const id=useId(); const router=useRouter();
  useEffect(()=>{
    const shortcut=(e:KeyboardEvent)=>{ if(variant==="header" && e.key==="/" && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLElement && (e.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)))) { e.preventDefault(); setOpen(true); } };
    document.addEventListener("keydown",shortcut); return ()=>document.removeEventListener("keydown",shortcut);
  },[variant]);
  useEffect(()=>{ if(open) input.current?.focus(); },[open]);
  useEffect(()=>{
    if(!open || query.trim().length<1) return;
    const controller=new AbortController();
    const timer=setTimeout(async()=>{
      try {
        const response=await fetch(`/api/search?locale=${locale}&view=chrome&q=${encodeURIComponent(query.trim())}`,{signal:controller.signal});
        if(!response.ok) throw new Error("unavailable");
        const data=await response.json();
        if(controller.signal.aborted) return;
        setResults(data.results); setActive(0); setStatus(data.results.length?"":copy.empty);
      } catch { if(!controller.signal.aborted) { setResults([]); setStatus(copy.failed); } }
    },180);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[query,open,retry,copy,locale]);
  useEffect(()=>{if(open)document.getElementById(`${id}-${active}`)?.scrollIntoView({block:"nearest"});},[active,id,open]);
  const search = (value:string) => {
    setQuery(value); setResults([]); setActive(0);
    setStatus(value.trim().length>=1?copy.pending:copy.prompt);
    setRetry(old=>old+1); input.current?.focus();
  };
  const choose=(result:ChromeSearchResult)=>{setOpen(false);router.push(result.href);};
  return <>
    {variant!=="header"?<form className="gs-home-search" role="search" onSubmit={e=>{e.preventDefault();setOpen(true);search(query);}}><label className="gs-field gs-home-search-field"><PublicIcon name="Search"/><input aria-label={variant==="state" ? "查找产品或国家" : "首页搜索产品或国家"} placeholder="搜 ChatGPT、Netflix，或者土耳其" value={query} maxLength={80} onChange={e=>setQuery(e.target.value)}/></label><button type="submit" data-gs-ui="button">搜索</button></form>:<button type="button" className="gs-search-trigger" data-gs-ui="button" aria-label={copy.label} onClick={()=>setOpen(true)}><PublicIcon name="Search"/><span>{copy.search}</span><kbd>/</kbd></button>}
    {open && <PublicDialog label={copy.search} closeLabel={copy.close} variant="search" onClose={()=>setOpen(false)}>
      <div className="gs-field"><input ref={input} data-gs-initial-focus data-gs-ui="input" aria-label={copy.label} placeholder={copy.placeholder} role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls={`${id}-results`} aria-activedescendant={results[active]?`${id}-${active}`:undefined} value={query} maxLength={80}
        onChange={e=>search(e.target.value)}
        onKeyDown={e=>{if(["ArrowDown","ArrowUp"].includes(e.key)){e.preventDefault();if(results.length)setActive(old=>(old+(e.key==="ArrowDown"?1:-1)+results.length)%results.length);}if(e.key==="Enter"&&results[active]){e.preventDefault();choose(results[active]);}}}/></div>
      <div id={`${id}-results`} role="listbox" aria-label={copy.results} className="gs-search-results">
        {(["product","plan","country"] as const).map(kind=>{const group=results.filter(result=>result.kind===kind);return group.length?<div key={kind} role="group" aria-label={copy.groups[kind]}><strong className="gs-search-group-title">{copy.groups[kind]}</strong>{group.map(result=>{const index=results.indexOf(result);return <div key={result.id} id={`${id}-${index}`} role="option" aria-selected={active===index} onMouseMove={()=>setActive(index)} onClick={()=>choose(result)}>
          <div className="gs-search-option-main">{result.logoSlug ? <HomepageProductMark product={{slug:result.logoSlug,name:result.title}} className="gs-search-mark"/> : result.countryCode ? <HomepageCountryFlag code={result.countryCode}/> : null}<div><strong>{result.title}</strong><small>{result.subtitle}</small></div></div><span className="gs-search-price"><PublicPriceNumber value={result.minimumUsd*display.rate} currency={display.currency} cycle={result.cycle} changeKey={display.changeKey} locale={locale === "en" ? "en-US" : "zh-CN"}/></span>
        </div>;})}</div>:null;})}
      </div>
      <p role="status">{status}</p>{status === copy.failed&&<button data-gs-ui="button" onClick={()=>{setStatus(copy.pending);setRetry(x=>x+1);}}>{copy.retry}</button>}
      {(status === copy.empty || !query.trim().length) && <div aria-label={copy.suggestions}>
        <div className="gs-search-suggestions">{["ChatGPT", "Claude", "Netflix", copy.country].map(term =>
          <button type="button" key={term} data-gs-ui="button" onClick={()=>search(term)}>{term}</button>)}</div>
        {status === copy.empty && <Link className="gs-search-contact" href={locale === "zh" ? "/zh/contact" : "/en/about"} onClick={()=>setOpen(false)}>{copy.contact}</Link>}
      </div>}
      <p className="gs-search-help">{copy.help}</p>
    </PublicDialog>}
  </>;
}
