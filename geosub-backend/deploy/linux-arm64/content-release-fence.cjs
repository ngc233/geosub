/* Controller-owned protocol: retained applications cannot silently omit targets. */
const {readFileSync} = require('node:fs');
const {targets, hash, rollbackPlan, validateRevision, verifiedReceipt} = require('./content-release-contract.cjs');
async function checkRegisteredTargets(tx) {
  const rows = await tx.siteSetting.findMany({where:{settingKey:{startsWith:'managed-content:v2:'},OR:[{settingKey:{endsWith:':state'}},{settingKey:{endsWith:':fence'}}]},select:{settingKey:true}});
  if (rows.some(r=>!targets.some(t=>r.settingKey===t.prefix+'state'||r.settingKey===t.prefix+'fence'))) throw Error('Unregistered content deployment target');
}
async function readTarget(tx, target) {
  const read = async suffix => (await tx.siteSetting.findUnique({where:{settingKey:target.prefix+suffix}}))?.valueJson;
  const state = await read('state'), fence = await read('fence');
  const revision = state?.version ? await read('revision:'+state.version) : null;
  const attempt = state?.attemptId ? await read('attempt:'+state.attemptId) : null;
  if (state) validateRevision(target,state,revision);
  if (fence && (!Number.isSafeInteger(fence.generation) || fence.generation < 0 || !Number.isSafeInteger(fence.epoch) || fence.epoch < 0 || !['open','closed'].includes(fence.admission))) throw Error('Invalid content fence');
  return {target,state,fence,revision,attempt};
}
function receiptReady(row) {
  if (!row.state?.version) return true;
  if (!verifiedReceipt(row.target,row.state,row.attempt)) return false;
  if (!JSON.stringify(row.revision.content).includes('{{')) return true;
  const proof = row.attempt?.evidence;
  return /^[a-f0-9]{64}$/.test(proof?.origin?.factsHash ?? '') && proof.origin.factsHash === proof.public?.factsHash &&
    proof.origin.outputHashes.factsHash === hash(proof.origin.factsHash) && proof.public.outputHashes.factsHash === proof.origin.outputHashes.factsHash;
}
async function verifyClosedContent(db, {production = false} = {}) {
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(721091101)`;
    await checkRegisteredTargets(tx);
    const rows = await Promise.all(targets.map(t => readTarget(tx,t)));
    for (const row of rows) {
      if ((row.state || row.fence) && row.fence?.admission !== 'closed') throw Error('Content admission must stay closed: '+row.target.id);
      if (!receiptReady(row)) throw Error('Content receipt is not verified: '+row.target.id);
      if (production && row.target !== targets[0] && row.revision?.content != null) throw Error('Claude production runtime is not activated: '+row.target.id);
    }
    if (production) {
      const promotion = await tx.$queryRaw`SELECT enabled, placement_enabled FROM public.promotion_config WHERE id=true`;
      if (promotion.length!==1 || promotion[0].enabled!==false || promotion[0].placement_enabled!==false) throw Error('Real promotion must remain disabled');
    }
    return {verified:true, scope:production?'production-code-release':'local-rehearsal', claudeActivation:false, targets:rows.map(r=>({id:r.target.id,version:r.state?.version??0,generation:r.fence?.generation??0}))};
  });
}
/** Read-only serving identity check; not a substitute for full public/CDN acceptance. */
async function verifyContentOrigin(db, origin, {production = false, http = fetch} = {}) {
  const url = new URL(origin);
  if (url.protocol!=='http:' || !['127.0.0.1','localhost','[::1]'].includes(url.hostname) || !url.port || url.pathname!=='/' || url.search || url.hash || url.username || url.password) throw Error('Content origin must be an exact loopback listener');
  if (production) await verifyClosedContent(db,{production:true});
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(721091101)`;
    await checkRegisteredTargets(tx);
    const result=[];
    for (const target of targets) {
      const row=await readTarget(tx,target);
      if (!row.state?.version) continue;
      if (row.fence?.admission!=='closed') throw Error('Content origin gate requires closed admission');
      const response=await http(url.origin+target.path,{redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Cache-Control':'no-cache'}});
      if (response.status!==200 || !response.body) throw Error('Content origin HTTP rejected');
      const reader=response.body.getReader(),chunks=[];let bytes=0;
      try {while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2_000_000)throw Error('Content origin body too large');chunks.push(Buffer.from(value));}}finally{await reader.cancel();}
      const html=Buffer.concat(chunks).toString('utf8').replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,'');
      const mains=[...html.matchAll(/<main\b([^>]*)>/gi)].map(m=>m[1]).filter(a=>/\sdata-content-version=/.test(' '+a));
      if(mains.length!==1)throw Error('Content origin serving marker missing or duplicated');
      const attr=name=>{const values=[...mains[0].matchAll(new RegExp('(?:^|\\s)'+name+'="([^"]*)"','g'))];if(values.length!==1)throw Error('Content origin marker invalid');return values[0][1];};
      const version=attr('data-content-version'),generation=attr('data-content-mode-generation');
      // Closing admission advances the fence without changing the publication. A retained
      // HTML generation may be older, but never older than this publication's own attempt.
      if(version!==String(row.state.version)||!/^\d+$/.test(generation)||!Number.isSafeInteger(Number(generation))||Number(generation)>(row.fence?.generation??0)||Number(generation)<(row.attempt?.fenceGeneration??0))throw Error('Content origin serves a stale revision or fence');
      let factsHash;
      if(JSON.stringify(row.revision.content).includes('{{')){
        factsHash=attr('data-content-facts-hash');
        if(!/^[a-f0-9]{64}$/.test(factsHash)||production&&factsHash!==row.attempt?.evidence?.origin?.factsHash)throw Error('Content origin fact fingerprint differs');
      }
      result.push({id:target.id,version,generation,...(factsHash?{factsHash}:{})});
    }
    return {verified:true,scope:production?'production-origin-identity':'local-origin-identity',publicCdnVerified:false,targets:result};
  },{timeout:40000});
}
function requireRollbackRows(rows, plan) {
  for (const row of rows) {
    if (!row.state?.version) continue;
    const capability = plan.targets.find(t=>t.id===row.target.id);
    if ((!capability && row.revision.content !== null) || (JSON.stringify(row.revision.content).includes('{{') && !capability?.facts) || !receiptReady(row)) {
      throw Error('Rollback blocked: exact reader capability and verified receipt or verified code-default content required: '+row.target.id);
    }
  }
}
async function checkRollbackContent(db, options) {
  const plan = rollbackPlan(options.from,options.to,options.policy);
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(721091101)`;
    await checkRegisteredTargets(tx);
    requireRollbackRows(await Promise.all(targets.map(t=>readTarget(tx,t))),plan);
    return plan;
  });
}
async function pauseContentForDeployment(db, operation, expectedGeneration, options = {}) {
  if (!['upgrade','rollback','resume'].includes(operation)) throw Error('Invalid deployment operation');
  const plan = operation === 'rollback' && options.from && options.to && options.policy
    ? rollbackPlan(options.from,options.to,options.policy) : {mode:'code-default-required',targets:[],pair:null};
  if (operation === 'resume' && options.targetId && options.targetId !== targets[0].id) throw Error('Claude production admission remains disabled');
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(721091101)`;
    await checkRegisteredTargets(tx);
    const rows = await Promise.all(targets.map(t => readTarget(tx,t)));
    if (operation === 'rollback') requireRollbackRows(rows,plan);
    if (operation === 'resume') {
      const row = rows[0];
      if (!Number.isSafeInteger(expectedGeneration) || expectedGeneration !== (row.fence?.generation??0)) throw Error('Stale content fence generation');
      if (!receiptReady(row) || rows.slice(1).some(r=>(r.state||r.fence)&&r.fence?.admission!=='closed')) throw Error('Production content readiness missing');
    }
    const result = [];
    for (const row of rows) {
      if (operation === 'resume' && row.target !== targets[0]) continue;
      if (!row.state && !row.fence && operation !== 'resume') continue;
      const fence = {...row.fence,generation:(row.fence?.generation??0)+1,epoch:(row.fence?.epoch??0)+1,admission:operation==='resume'?'open':'closed'};
      const data = {label:'Content deployment fence',groupName:row.target.group,valueJson:fence,isPublic:false};
      await tx.siteSetting.upsert({where:{settingKey:row.target.prefix+'fence'},create:{settingKey:row.target.prefix+'fence',...data},update:data});
      if (row.attempt && ['pending','running'].includes(row.attempt.status)) await tx.siteSetting.update({where:{settingKey:row.target.prefix+'attempt:'+row.state.attemptId},data:{valueJson:{...row.attempt,status:'superseded',finishedAt:Date.now(),owner:null,leaseUntil:null}}});
      // This runs before migration 059: never RETURNING the possibly absent actor_id.
      await tx.auditLog.create({select:{id:true},data:{action:'content_deploy_pause',targetType:row.target===targets[0]?'content_pilot':row.target.id,oldValue:row.fence??{},newValue:{...fence,rollbackPolicy:operation==='rollback'?plan:null},note:operation}});
      result.push({id:row.target.id,generation:fence.generation});
    }
    return {changed:result.length>0,generation:result.find(r=>r.id===targets[0].id)?.generation,targets:result,rollbackPolicy:operation==='rollback'?plan:null};
  });
}
async function runCli(createDb, args = process.argv.slice(2), env = process.env) {
  let db;
  try {
    const [operation, ...rest] = args;
    if (operation === 'resume' && (env.GEOSUB_CONTENT_RUNTIME!=='production-v1' || env.GEOSUB_CONTENT_DISTRIBUTION!=='cloudflare' || env.GEOSUB_CONTENT_CACHE_POLICY!=='audited-single-url' || !env.GEOSUB_CONTENT_CF_API_TOKEN)) throw Error('Production content readiness configuration missing');
    db=createDb(['verify-closed','check-rollback','verify-origin'].includes(operation));
    let result;
    if (operation === 'verify-closed' && (rest.length===0 || rest.join(' ')==='--production')) result=await verifyClosedContent(db,{production:rest.length>0});
    else if (operation==='verify-origin' && (rest.length===1 || rest.length===2&&rest[1]==='--production')) result=await verifyContentOrigin(db,rest[0],{production:rest.length===2});
    else if (['rollback','check-rollback'].includes(operation) && rest.length===6 && rest[0]==='--from-root' && rest[2]==='--to-root' && rest[4]==='--policy') {
      const options={from:rest[1],to:rest[3],policy:JSON.parse(readFileSync(rest[5],'utf8'))};
      result=operation==='check-rollback'?await checkRollbackContent(db,options):await pauseContentForDeployment(db,operation,undefined,options);
    }
    else if (operation==='upgrade' && !rest.length || operation==='rollback' && !rest.length || operation==='resume' && rest.length===1) result=await pauseContentForDeployment(db,operation,Number(rest[0]));
    else throw Error('Invalid content gate arguments');
    console.log(JSON.stringify(result));
  } catch {
    console.error('Content deployment gate rejected. Inspect exact rollback capability, closed fences and verified receipts; no application switch was performed by this gate.');
    process.exitCode=1;
  } finally { await db?.$disconnect(); }
}
module.exports={pauseContentForDeployment,verifyClosedContent,checkRollbackContent,verifyContentOrigin,runCli};
