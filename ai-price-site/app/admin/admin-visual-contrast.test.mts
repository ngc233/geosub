import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

test('admin text remains readable on the page and card surfaces in both themes',()=>{
 const css=readFileSync(new URL('../globals.css',import.meta.url),'utf8');
 const start=css.indexOf('[data-admin-theme] {');
 const light=css.slice(start,css.indexOf('@media (prefers-color-scheme: dark) {',start));
 const dark=css.slice(css.lastIndexOf('[data-admin-theme="dark"] {'));
 function hex(block:string,token:string){
  const match=block.match(new RegExp(`--${token}: (#[0-9a-f]{6});`));
  assert.ok(match,`${token} must be explicitly defined`);return match[1].slice(1);
 }
 function luminance(value:string){
  const channels=value.match(/../g)!.map(v=>Number.parseInt(v,16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
  return channels.reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
 }
 function contrast(a:string,b:string){const values=[luminance(a),luminance(b)].sort((a,b)=>b-a);return(values[0]+0.05)/(values[1]+0.05);}
 for(const [name,block] of [['light',light],['dark',dark]]){
  for(const token of ['admin-text-muted','admin-text-faint']){
   for(const surface of ['admin-surface','admin-canvas']){
    assert.ok(contrast(hex(block,token),hex(block,surface))>=4.5,`${name}: ${token} on ${surface}`);
   }
  }
 }
 assert.ok(contrast('ffffff',hex(light,'admin-primary'))>=4.5,'filled primary control text');
});
