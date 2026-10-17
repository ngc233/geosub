'use client';
import { createContext, useContext, useEffect, useRef, useState, startTransition, useCallback, type ComponentProps, type ReactNode } from 'react';
import { canAdmin, type AdminCapability } from '../../lib/admin-permissions';
import { guardAdminHistory } from '../../lib/admin-history-guard';
const RoleContext = createContext('VIEWER');
const UnsavedContext = createContext<(form: HTMLFormElement, dirty: boolean) => void>(() => {});
const OtherFormsContext = createContext<(form:HTMLFormElement)=>boolean>(()=>true);
const leaveMessage = '还有未保存的修改。离开将丢失这些输入，确定离开吗？';
export function AdminPermissionsProvider({role,children}:{role:string;children:ReactNode}) {
 const dirtyForms = useRef(new Set<HTMLFormElement>());
 const mark = useCallback((form:HTMLFormElement, dirty:boolean) => { if(dirty) dirtyForms.current.add(form); else dirtyForms.current.delete(form); }, []);
 const allowOtherForms = useCallback((form:HTMLFormElement) => ![...dirtyForms.current].some(other=>other!==form&&other.isConnected) || window.confirm('本页其他区域还有未保存的修改。此操作可能刷新页面并丢失这些输入，仍要继续吗？'), []);
 useEffect(() => {
  const hasChanges = () => [...dirtyForms.current].some(form => form.isConnected);
  const unload = (event:BeforeUnloadEvent) => { if(hasChanges()){event.preventDefault();event.returnValue='';} };
  const click = (event:MouseEvent) => {
   if(event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !hasChanges()) return;
   const link=(event.target as Element).closest('a[href]');
   if(!(link instanceof HTMLAnchorElement) || link.target==='_blank' || link.hasAttribute('download')) return;
   const next = new URL(link.href,location.href);
   if(next.pathname===location.pathname && next.search===location.search && next.hash) return;
   if(!window.confirm(leaveMessage)){event.preventDefault();event.stopPropagation();}
  };
  window.addEventListener('beforeunload',unload);
  document.addEventListener('click',click,true);
  const removeTraversalGuard = guardAdminHistory(window, hasChanges, () => window.confirm(leaveMessage));
  return () => {removeTraversalGuard?.();window.removeEventListener('beforeunload',unload);document.removeEventListener('click',click,true);};
 }, []);
 return <RoleContext.Provider value={role}><UnsavedContext.Provider value={mark}><OtherFormsContext.Provider value={allowOtherForms}>{children}</OtherFormsContext.Provider></UnsavedContext.Provider></RoleContext.Provider>;
}
export function useAdminPermission(capability:AdminCapability){return canAdmin(useContext(RoleContext),capability);}
/** Unlike React's void dispatch, this adapter returns the actual server result. */
export function useAdminActionState<S>(action:(state:S,data:FormData)=>Promise<S>,initial:S){
 const [state,setState]=useState(initial),[pending,setPending]=useState(false);
 const current=useRef(initial);
 const dispatch=async(data:FormData)=>{setPending(true);try{const result=await action(current.current,data);current.current=result;setState(result);return result;}finally{setPending(false);}};
 return [state,dispatch,pending] as const;
}
function fingerprint(form:HTMLFormElement){
 return JSON.stringify([...new FormData(form)].filter(([key])=>!key.startsWith('$ACTION_')&&key!=='recordVersion').map(([key,value])=>[key,typeof value==='string'?value:[value.name,value.size,value.lastModified]]));
}
type Props=Omit<ComponentProps<'form'>,'action'>&{capability?:AdminCapability;action?:string|((data:FormData)=>unknown|Promise<unknown>);confirmMessage?:string};
/** UI protection only: server actions must still authorize, validate and transact. Inputs stay in memory only. */
export function AdminActionForm({capability='manage',children,onSubmit,onChange,onClick,action,confirmMessage,ref:externalRef,...props}:Props){
 const allowed=useAdminPermission(capability),mark=useContext(UnsavedContext),allowOtherForms=useContext(OtherFormsContext);
 const ref=useRef<HTMLFormElement>(null),baseline=useRef(''),inFlight=useRef(false);
 const [pending,setPending]=useState(false),[message,setMessage]=useState(''),[failed,setFailed]=useState(false);
 const versions=useRef(new Map<string,string>());
 useEffect(()=>{const form=ref.current;if(!form)return;baseline.current=fingerprint(form);for(const el of form.querySelectorAll<HTMLInputElement>('input[name=recordVersion]'))versions.current.set(el.name,el.value);return()=>mark(form,false);},[mark]);
 return <form {...props} ref={node=>{ref.current=node;if(typeof externalRef==='function')externalRef(node);else if(externalRef)externalRef.current=node;}} action={action as ComponentProps<'form'>['action']} data-admin-capability={capability} aria-busy={pending} onClick={event=>{onClick?.(event);requestAnimationFrame(()=>{if(ref.current&&allowed&&!inFlight.current)mark(ref.current,fingerprint(ref.current)!==baseline.current);});}} onChange={event=>{onChange?.(event);if(ref.current)mark(ref.current,fingerprint(ref.current)!==baseline.current);}} onSubmit={event=>{
  if(!allowed || inFlight.current){event.preventDefault();return;}
  onSubmit?.(event);if(event.defaultPrevented)return;
  if(!allowOtherForms(event.currentTarget)){event.preventDefault();return;}
  if(confirmMessage&&!window.confirm(confirmMessage)){event.preventDefault();return;}
  if(typeof action!=='function')return;
  event.preventDefault();const form=event.currentTarget;
  const submitter=(event.nativeEvent as SubmitEvent).submitter;
  // Capture before disabling controls, including the clicked submit button's name/value.
  const submitted=fingerprint(form);const data=new FormData(form,submitter);for(const [key,value] of versions.current)data.set(key,value);inFlight.current=true;mark(form,true);setPending(true);setMessage('正在保存，请稍候…');setFailed(false);
  startTransition(async()=>{
   try{
    const result=await action(data);
    if(result&&typeof result==='object'&&(('error' in result&&typeof result.error==='string')||('ok' in result&&result.ok===false))){
     setFailed(true);setMessage('error' in result&&typeof result.error==='string'?result.error:'message' in result&&typeof result.message==='string'?result.message:'操作未完成，输入仍保留。');mark(form,true);
    }else{baseline.current=submitted;mark(form,false);if(result&&typeof result==='object'&&'recordVersion' in result&&typeof result.recordVersion==='string')versions.current.set('recordVersion',result.recordVersion);setMessage(result&&typeof result==='object'&&'message' in result&&typeof result.message==='string'&&result.message?result.message:'操作已完成。');}
   }catch{
    setFailed(true);setMessage('暂时无法确认操作结果，输入仍保留。请先在新标签页核对记录是否已保存，再决定是否重试。');mark(form,true);
   }finally{inFlight.current=false;setPending(false);}
  });
 }}>
  <fieldset disabled={!allowed||pending} className="contents" data-admin-permission-denied={!allowed || undefined} title={!allowed?'当前角色无此操作权限':undefined}>{children}</fieldset>
  {message?<p role={failed?'alert':'status'} className="col-span-full mt-3 rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">{message}</p>:null}
 </form>;
}
