"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChromeSearchResult } from "../lib/public-chrome-search";
import { PublicDialog } from "./PublicControls";
import PublicIcon from "./PublicIcon";
import { useSearchDisplayCurrency } from "./PublicCurrencySelect";
import PublicPriceNumber from "./PublicPriceNumber";

export default function PublicSearch({variant="header"}:{variant?:"header"|"hero"}) {
  const display=useSearchDisplayCurrency();
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState("");
  const [results,setResults]=useState<ChromeSearchResult[]>([]);
  const [status,setStatus]=useState("输入至少两个字，搜索产品、套餐或国家");
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
    if(!open || query.trim().length<2) return;
    const controller=new AbortController();
    const timer=setTimeout(async()=>{
      try {
        const response=await fetch(`/api/search?locale=zh&view=chrome&q=${encodeURIComponent(query.trim())}`,{signal:controller.signal});
        if(!response.ok) throw new Error("unavailable");
        const data=await response.json();
        if(controller.signal.aborted) return;
        setResults(data.results); setActive(0); setStatus(data.results.length?"":"没有找到可显示最低价的结果，试试产品或国家的其他名称");
      } catch { if(!controller.signal.aborted) { setResults([]); setStatus("搜索暂时不可用，请重试"); } }
    },220);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[query,open,retry]);
  useEffect(()=>{if(open)document.getElementById(`${id}-${active}`)?.scrollIntoView({block:"nearest"});},[active,id,open]);
  const search = (value:string) => {
    setQuery(value); setResults([]); setActive(0);
    setStatus(value.trim().length>=2?"正在搜索…":"输入至少两个字，搜索产品、套餐或国家");
    setRetry(old=>old+1); input.current?.focus();
  };
  const choose=(result:ChromeSearchResult)=>{setOpen(false);router.push(result.href);};
  return <>
    {variant==="hero"?<form className="gs-home-search" role="search" onSubmit={e=>{e.preventDefault();setOpen(true);search(query);}}><label className="gs-field gs-home-search-field"><PublicIcon name="Search"/><input aria-label="首页搜索产品或国家" placeholder="搜 ChatGPT、Netflix，或者土耳其" value={query} maxLength={80} onChange={e=>setQuery(e.target.value)}/></label><button type="submit" data-gs-ui="button">搜索</button></form>:<button type="button" className="gs-search-trigger" data-gs-ui="button" aria-label="搜索产品或国家" onClick={()=>setOpen(true)}><PublicIcon name="Search"/><span>搜索</span><kbd>/</kbd></button>}
    {open && <PublicDialog label="搜索" variant="search" onClose={()=>setOpen(false)}>
      <div className="gs-field"><input ref={input} data-gs-initial-focus data-gs-ui="input" aria-label="搜索产品或国家" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls={`${id}-results`} aria-activedescendant={results[active]?`${id}-${active}`:undefined} value={query} maxLength={80}
        onChange={e=>search(e.target.value)}
        onKeyDown={e=>{if(["ArrowDown","ArrowUp"].includes(e.key)){e.preventDefault();if(results.length)setActive(old=>(old+(e.key==="ArrowDown"?1:-1)+results.length)%results.length);}if(e.key==="Enter"&&results[active]){e.preventDefault();choose(results[active]);}}}/></div>
      <div id={`${id}-results`} role="listbox" aria-label="搜索结果" className="gs-search-results">
        {(["product","plan","country"] as const).map(kind=>{const group=results.filter(result=>result.kind===kind);return group.length?<div key={kind} role="group" aria-label={{product:"产品",plan:"套餐",country:"国家"}[kind]}><strong className="gs-search-group-title">{{product:"产品",plan:"套餐",country:"国家"}[kind]}</strong>{group.map(result=>{const index=results.indexOf(result);return <div key={result.id} id={`${id}-${index}`} role="option" aria-selected={active===index} onMouseMove={()=>setActive(index)} onClick={()=>choose(result)}>
          <div><strong>{result.title}</strong><small>{result.subtitle}</small></div><span className="gs-search-price"><PublicPriceNumber value={result.minimumUsd*display.rate} currency={display.currency} cycle={result.cycle} changeKey={display.changeKey}/></span>
        </div>;})}</div>:null;})}
      </div>
      <p role="status">{status}</p>{status.includes("不可用")&&<button data-gs-ui="button" onClick={()=>{setStatus("正在搜索…");setRetry(x=>x+1);}}>重试</button>}
      {status.startsWith("没有找到") && <div aria-label="搜索建议">
        <div className="gs-search-suggestions">{["ChatGPT", "Claude", "Netflix", "印度"].map(term =>
          <button type="button" key={term} data-gs-ui="button" onClick={()=>search(term)}>{term}</button>)}</div>
        <Link className="gs-search-contact" href="/zh/contact" onClick={()=>setOpen(false)}>联系我们</Link>
      </div>}
      <p className="gs-search-help">↑ ↓ 选择 · Enter 打开 · Esc 关闭</p>
    </PublicDialog>}
  </>;
}
