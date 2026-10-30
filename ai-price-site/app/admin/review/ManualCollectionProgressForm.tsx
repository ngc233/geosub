"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AdminActionForm } from "@/components/admin/AdminPermissions";
import { adminButtonClassName } from "@/components/admin/AdminButton";
import { safeAdminHref, safeAdminReturnTo } from "@/lib/admin-workflow-context";

type Props={productSlug?:string;buttonLabel?:string;pendingLabel?:string;disabled?:boolean;submitUrl?:string};
export default function ManualCollectionProgressForm({productSlug,buttonLabel="立即补采并审核",pendingLabel="正在提交请求",disabled=false,submitUrl="/admin/review/collect"}:Props){
 const router=useRouter();
 const inFlight=useRef(false);
 const [pending,setPending]=useState(false);
 const [error,setError]=useState<string|null>(null);
 return <AdminActionForm action={submitUrl} method="post" onClick={e=>e.stopPropagation()} onSubmit={async e=>{
   e.preventDefault();if(disabled||inFlight.current)return;
   inFlight.current=true;setPending(true);setError(null);
   const data=new FormData(e.currentTarget);
   data.set("returnTo",safeAdminReturnTo(window.location.pathname+window.location.search+window.location.hash,"/admin/pipeline"));
   let acknowledged=false;
   try{
     const response=await fetch(submitUrl,{method:"POST",body:data,headers:{Accept:"application/json"},credentials:"same-origin"});
     const payload=await response.json().catch(()=>null) as {ok?:boolean;redirectPath?:string;message?:string}|null;
     if(!response.ok||payload?.ok!==true)throw new Error(payload?.message||"未能确认采集请求。请先查看运行记录，再决定是否重试。");
     acknowledged=true;
     router.push(safeAdminHref(payload.redirectPath,`/admin/review?q=${encodeURIComponent(productSlug||"")}`));
   }catch(err){setError(err instanceof Error?err.message:"暂时无法确认请求结果，请先查看运行记录。");}
   finally{if(!acknowledged){inFlight.current=false;setPending(false);}}
 }}>
   {productSlug?<input type="hidden" name="productSlug" value={productSlug}/>:null}
   <button type="submit" disabled={disabled||pending} aria-busy={pending} className={adminButtonClassName({variant:"primary",size:"sm"})}>
     {pending?<Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true"/>:null}
     {pending?"正在提交请求…":buttonLabel}
   </button>
   {pending?<p role="status" className="mt-2 max-w-xs text-xs text-admin-text-muted">{pendingLabel}；收到后台确认后显示真实运行记录。</p>:null}
   {error?<p role="alert" className="mt-2 max-w-xs text-xs text-admin-danger">{error}</p>:null}
 </AdminActionForm>;
}
