// Local HTTP switch rehearsal only; never edits deployment configuration or databases.
import http from 'node:http';
import assert from 'node:assert/strict';
const [oldArg,newArg]=process.argv.slice(2);
function local(value){const u=new URL(value);if(u.protocol!=='http:'||u.hostname!=='127.0.0.1'||u.username||u.password||u.pathname!=='/'||!u.port)throw Error('Explicit loopback HTTP origins required');return u.origin;}
const previous=local(oldArg),candidate=local(newArg);assert.notEqual(previous,candidate);
let active=previous;
const events=[];
async function admit(origin){const r=await fetch(origin+'/api/health',{redirect:'error',signal:AbortSignal.timeout(5000)});assert.equal(r.status,200);const page=await fetch(origin+'/admin-login',{redirect:'error',signal:AbortSignal.timeout(5000)});assert.equal(page.status,200);assert.match(await page.text(),/<form/);active=origin;events.push({event:'switch',origin});}
const proxy=http.createServer((req,res)=>{const target=active;const upstream=http.request(target+req.url,{method:'GET'},r=>{res.writeHead(r.statusCode,{...r.headers,'x-rehearsal-upstream':target});r.pipe(res);});upstream.on('error',()=>{res.writeHead(502);res.end();});upstream.end();});
await new Promise(r=>proxy.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+proxy.address().port;
const samples=[];
async function sample(){const r=await fetch(url+'/admin-login');assert.equal(r.status,200);assert.match(await r.text(),/<form/);samples.push(r.headers.get('x-rehearsal-upstream'));}
try{
 await admit(previous);await sample();
 const failed=http.createServer((q,s)=>{s.writeHead(503);s.end();});await new Promise(r=>failed.listen(0,'127.0.0.1',r));
 try{await assert.rejects(()=>admit('http://127.0.0.1:'+failed.address().port));assert.equal(active,previous);events.push({event:'unhealthy_candidate_rejected'});}finally{await new Promise(r=>failed.close(r));}
 const polling=(async()=>{for(let i=0;i<30;i++)await sample();})();
 await admit(candidate);await sample();await admit(previous);await sample();await polling;
 assert(samples.includes(candidate)&&samples.includes(previous));
 console.log(JSON.stringify({scope:'local HTTP only; not Linux/CDN/production acceptance',events,requests:samples.length,failures:0,finalUpstream:active},null,2));
}finally{await new Promise(r=>proxy.close(r));}
