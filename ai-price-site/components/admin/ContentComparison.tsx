import type { OverviewContent } from '../../lib/managed-content';
function ContentValue({content,field}:{content:OverviewContent|null;field:keyof OverviewContent}){
 if(!content)return <p>代码默认内容（随价格数据生成）</p>;
 if(field==='sections')return <ul className="space-y-3">{content.sections.map((s,i)=><li key={i}><h4 className="font-semibold">{s.heading}</h4><p className="whitespace-pre-wrap">{s.body}</p></li>)}</ul>;
 if(field==='faqs')return <ul className="space-y-3">{content.faqs.map((s,i)=><li key={i}><h4 className="font-semibold">{s.q}</h4><p className="whitespace-pre-wrap">{s.a}</p></li>)}</ul>;
 if(field==='sources')return <ul className="space-y-2">{content.sources.map((s,i)=><li key={i} className="break-all">{s}</li>)}</ul>;
 return <p className="whitespace-pre-wrap">{content[field]}</p>;
}
export default function ContentComparison({current,draft}:{current:OverviewContent|null;draft:OverviewContent}){
 const labels={title:'搜索标题',heading:'页面主标题',description:'搜索摘要',sections:'介绍段落',faqs:'常见问题',sources:'官方来源'};
 return <details className="mb-4"><summary className="cursor-pointer py-3 font-semibold">比较当前内容与草稿</summary><p className="my-3 text-sm text-slate-500">以下展示原文；“已修改”仅表示与当前版本不同，不代表事实审核通过。</p><div className="space-y-5">{(Object.keys(labels) as Array<keyof OverviewContent>).map(field=><section key={field}><h3 className="mb-2 font-semibold">{labels[field]} · {current && JSON.stringify(current[field])===JSON.stringify(draft[field])?'未修改':'已修改'}</h3><div className="grid min-w-0 gap-3 md:grid-cols-2">{[{name:'当前内容',value:current},{name:'待发布草稿',value:draft}].map(({name,value})=><div key={name} className="min-w-0 break-words rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-700"><p className="mb-3 font-semibold">{name}</p><ContentValue content={value} field={field}/></div>)}</div></section>)}</div></details>;
}
