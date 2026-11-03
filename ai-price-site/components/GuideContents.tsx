"use client";

import {PublicEvidence} from "./ui/PublicControls";

export default function GuideContents({items,mobile=false}:{items:Array<{id:string;title:string}>;mobile?:boolean}) {
  if(!items.length)return null;
  const links=<nav aria-label="文章章节">{items.map(item=><a key={item.id} href={`#${item.id}`}>{item.title}</a>)}</nav>;
  return mobile ? <aside className="gs-guide-contents gs-guide-contents-mobile"><PublicEvidence animated title="文章目录">{links}</PublicEvidence></aside> : <aside className="gs-guide-contents gs-guide-contents-desktop"><h2>文章目录</h2>{links}</aside>;
}
