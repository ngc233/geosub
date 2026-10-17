import test from 'node:test';
import assert from 'node:assert/strict';
import { createPromotionLease, type LeaseEntry } from './promotion-lease.ts';
import type { PublicPromotion } from './first-party-promotion.ts';
const card = {generation: 2, ttlMs: 30000} as PublicPromotion;
function fixture() {
 let now=0, visible=true, entry:LeaseEntry|null=null, next=0;
 const timers=new Map<number,{at:number;fn:()=>void}>();
 const pending:Array<{resolve:(card:PublicPromotion|null)=>void;reject:(error:Error)=>void}>=[];
 const lease=createPromotionLease({now:()=>now,visible:()=>visible,render:value=>{entry=value;},
  fetchCard:()=>new Promise((resolve,reject)=>pending.push({resolve,reject})),
  setTimer:(fn,ms)=>{const id=++next;timers.set(id,{at:now+ms,fn});return id as unknown as ReturnType<typeof setTimeout>;},
  clearTimer:id=>{timers.delete(id as unknown as number);}});
 function advance(ms:number) {const end=now+ms;for(;;){const due=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].fn();}now=end;}
 return {lease,pending,advance,entry:()=>entry,hide:()=>{visible=false;},show:()=>{visible=true;}};
}
test('lease disappears at 30 seconds without another response',async()=>{const f=fixture();const p=f.lease.refresh();f.pending[0].resolve(card);await p;f.advance(29999);assert.ok(f.entry());f.advance(1);assert.equal(f.entry(),null);});
test('request time is deducted from lifetime',async()=>{const f=fixture();const p=f.lease.refresh();f.advance(2000);f.pending[0].resolve(card);await p;assert.equal(f.entry()?.deadline,30000);f.advance(28000);assert.equal(f.entry(),null);});
test('hung transport hides card after 3 seconds even if abort is ignored',async()=>{const f=fixture();const p=f.lease.refresh();f.pending[0].resolve(card);await p;f.advance(20000);const slow=f.lease.refresh();f.advance(3000);assert.equal(f.entry(),null);f.pending[1].resolve(card);await slow;assert.equal(f.entry(),null);});
test('paused or revoked API response hides immediately',async()=>{const f=fixture();let p=f.lease.refresh();f.pending[0].resolve(card);await p;p=f.lease.refresh();f.pending[1].resolve(null);await p;assert.equal(f.entry(),null);});
test('offline invalidation ignores a pending old response',async()=>{const f=fixture();const p=f.lease.refresh();f.lease.invalidate();f.pending[0].resolve(card);await p;assert.equal(f.entry(),null);});
test('hidden page cannot show a late response and resumes only after validation',async()=>{const f=fixture();let p=f.lease.refresh();f.hide();f.pending[0].resolve(card);await p;assert.equal(f.entry(),null);f.show();p=f.lease.resume();assert.equal(f.entry(),null);f.pending[1].resolve(card);await p;assert.ok(f.entry());});
test('out of order responses cannot resurrect old content',async()=>{const f=fixture();const old=f.lease.refresh(),fresh=f.lease.refresh();f.pending[1].resolve(null);await fresh;f.pending[0].resolve(card);await old;assert.equal(f.entry(),null);});
test('lower generation is rejected',async()=>{const f=fixture();let p=f.lease.refresh();f.pending[0].resolve(card);await p;p=f.lease.refresh();f.pending[1].resolve({...card,generation:1});await p;assert.equal(f.entry(),null);});
test('unmount prevents pending rendering',async()=>{const f=fixture();const p=f.lease.refresh();f.lease.stop();f.pending[0].resolve(card);await p;assert.equal(f.entry(),null);});
test('network error hides current content',async()=>{const f=fixture();let p=f.lease.refresh();f.pending[0].resolve(card);await p;p=f.lease.refresh();f.pending[1].reject(Error('offline'));await p;assert.equal(f.entry(),null);});
for(const ttlMs of [0,-1,30001,NaN,Infinity])test(`invalid lifetime ${ttlMs} is rejected`,async()=>{const f=fixture();const p=f.lease.refresh();f.pending[0].resolve({...card,ttlMs});await p;assert.equal(f.entry(),null);});
