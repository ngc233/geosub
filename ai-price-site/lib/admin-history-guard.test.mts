import assert from 'node:assert/strict';
import test from 'node:test';
import { guardAdminHistory } from './admin-history-guard.ts';
const tick = () => new Promise(resolve => setTimeout(resolve, 10));
function browser() {
 const win = new EventTarget() as EventTarget & {location:{href:string};history:History};
 win.location={href:'https://local.test/admin'};
 const entries: Array<{url:string;state:object}>=[{url:win.location.href,state:{__NA:true,tree:'initial'}}]; let at=0;
 const history={
  get state(){return entries[at].state;},
  pushState(state:object,_title:string,url?:string){ entries.splice(++at); entries.push({state,url:new URL(url || win.location.href,win.location.href).href}); win.location.href=entries[at].url; },
  replaceState(state:object,_title:string,url?:string){entries[at]={state,url:new URL(url || win.location.href,win.location.href).href};win.location.href=entries[at].url;},
  go(delta:number){setTimeout(()=>{at+=delta;win.location.href=entries[at].url;win.dispatchEvent(Object.assign(new Event('popstate'),{state:entries[at].state}));},0);}
 } as unknown as History;
 win.history=history;
 return {win:win as unknown as Window,entries,history};
}
test('cancel back/forward restores native position and inputs; acceptance reaches target once',async()=>{
 const {win,history,entries}=browser(); let dirty=true,accept=false,prompts=0,routes=0;
 const cleanup=guardAdminHistory(win,()=>dirty,()=>{prompts++;assert.equal(win.location.href,'https://local.test/edit');return accept;});
 win.addEventListener('popstate',()=>routes++);
 history.pushState({__NA:true,tree:'edit'},'','/edit');
 history.pushState({__NA:true,tree:'next'},'','/next');
 dirty=false;history.go(-1);await tick();dirty=true;
 const before=routes;
 history.go(1);await tick();await tick();assert.equal(prompts,1);assert.equal(routes,before);assert.equal(win.location.href,'https://local.test/edit');
 history.go(1);await tick();await tick();assert.equal(prompts,2);assert.equal(entries.length,3);
 history.go(-1);await tick();await tick();assert.equal(prompts,3);assert.equal(win.location.href,'https://local.test/edit');
 accept=true;history.go(1);await tick();await tick();await tick();assert.equal(routes,before+1);assert.equal(win.location.href,'https://local.test/next');
 assert.equal(history.state.tree,'next');assert.equal(history.state.__NA,true);cleanup();
});
test('hash traversal, clean history and replace preserve router metadata; cleanup restores methods',async()=>{
 const {win,history,entries}=browser(); const original=history.pushState;let prompts=0;
 const cleanup=guardAdminHistory(win,()=>true,()=>{prompts++;return false;});
 history.pushState({tree:'hash'},'','#section');history.go(-1);await tick();assert.equal(prompts,0);
 history.replaceState({tree:'replacement'},'','/admin');assert.equal(entries.length,2);assert.equal(history.state.tree,'replacement');
 cleanup();assert.equal(history.pushState,original);
});
