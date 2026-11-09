"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
/** Same local assets as the legacy private CountryFlag.
 * Kept outside the locked price table so importing it cannot pull that table in. */
export default function HomepageCountryFlag({code, defer = false}:{code:string; defer?:boolean}) {
 const [failed,setFailed]=useState(false);
 const root=useRef<HTMLSpanElement>(null),[visible,setVisible]=useState(!defer);
 useEffect(()=>{
  if(!defer||visible)return;
  if(!("IntersectionObserver" in window)){
   const frame=requestAnimationFrame(()=>setVisible(true));
   return()=>cancelAnimationFrame(frame);
  }
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}
  },{rootMargin:"100px"});
  if(root.current)observer.observe(root.current);
  return()=>observer.disconnect();
 },[defer,visible]);
 // Opt-in only: offscreen decorative flags wait; country names and prices
 // remain server-rendered. Existing callers retain their original behavior.
 return <span ref={root} className="gs-home-flag" aria-hidden="true">{failed||(defer&&!visible)?null:<Image src={`/flags/${code.toLowerCase()}.svg`} width={28} height={20} alt="" aria-hidden="true" unoptimized onError={()=>setFailed(true)}/>}</span>;
}
