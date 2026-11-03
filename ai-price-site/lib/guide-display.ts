/** Presentation only. Stored article types, publication and indexing stay unchanged. */
export type GuideDirectoryEntry = {
  id: string;
  href: string;
  title: string;
  description: string;
  label: string;
  articleType: string;
  core: boolean;
  updated: string | null;
};

export function publicGuideTypeLabel(type: string, fallback: string) {
  return type === "GUIDE" ? "指南" : type === "NEWS" ? "资讯" : type === "METHODOLOGY" ? "方法" : fallback;
}

export function filterGuideEntries(entries: readonly GuideDirectoryEntry[], query: string, filter: string) {
  const search = query.trim().toLocaleLowerCase();
  return entries.filter(entry =>
    (filter === "all" || (filter === "core" ? entry.core && entry.articleType !== "NEWS" : entry.articleType === filter)) &&
    `${entry.title} ${entry.description} ${entry.label}`.toLocaleLowerCase().includes(search));
}

/** Input is already sanitized by the article renderer; only heading IDs are added. */
export function guideContentsFromHtml(html: string) {
  const items:Array<{id:string;title:string}>=[];
  const used=new Set([...html.matchAll(/\bid="([^"]*)"/g)].map(match=>match[1]));
  const body=html.replace(/<h([2-4])([^>]*)>([\s\S]*?)<\/h\1>/g,(whole,level:string,attributes:string,content:string)=>{
    const existing=attributes.match(/\bid="([^"]*)"/);
    let id=existing?.[1];
    if(!id) {let index=items.length+1;do{id=`guide-section-${index++}`;}while(used.has(id));used.add(id);}
    const title=content.replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();
    if(title)items.push({id,title});
    return existing ? whole : `<h${level}${attributes} id="${id}">${content}</h${level}>`;
  });
  return {html:body,items};
}
