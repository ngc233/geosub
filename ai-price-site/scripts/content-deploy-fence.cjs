/* Shared with normal upgrade/rollback: close content admission before stopping the app. */
const {createHash}=require('node:crypto');
const prefix='content-pilot:en:chatgpt:';
async function pauseContentForDeployment(db, operation, expectedGeneration) {
  if (!['upgrade','rollback','resume'].includes(operation)) throw new Error('Invalid deployment operation');
  return db.$transaction(async(tx)=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(721091101)`;
    const state=(await tx.siteSetting.findUnique({where:{settingKey:prefix+'state'}}))?.valueJson;
    const previous=(await tx.siteSetting.findUnique({where:{settingKey:prefix+'fence'}}))?.valueJson;
    if (!state && !previous && operation!=='resume') return {changed:false};
    if(operation==='resume' && (!Number.isSafeInteger(expectedGeneration) || expectedGeneration!==(previous?.generation??0))) throw new Error('Stale content fence generation');
    if(operation==='rollback' && state?.version) {
      const revision=(await tx.siteSetting.findUnique({where:{settingKey:prefix+'revision:'+state.version}}))?.valueJson;
      if(!revision || revision.content!==null || revision.hash!==createHash('sha256').update('null').digest('hex') || state.receipt!=='verified') throw new Error('Rollback blocked: publish and verify code-default content before reverting the application.');
    }
    const fence={...previous,generation:(previous?.generation??0)+1,epoch:(previous?.epoch??0)+1,admission:operation==='resume'?'open':'closed'};
    const data={label:'Content deployment fence',groupName:'content-pilot',valueJson:fence,isPublic:false};
    await tx.siteSetting.upsert({where:{settingKey:prefix+'fence'},create:{settingKey:prefix+'fence',...data},update:data});
    if(state?.attemptId){
      const row=await tx.siteSetting.findUnique({where:{settingKey:prefix+'attempt:'+state.attemptId}});
      const attempt=row?.valueJson;
      if(attempt && ['pending','running'].includes(attempt.status)) await tx.siteSetting.update({where:{id:row.id},data:{valueJson:{...attempt,status:'superseded',finishedAt:Date.now(),owner:null,leaseUntil:null}}});
    }
    await tx.auditLog.create({data:{action:'content_deploy_pause',targetType:'content_pilot',oldValue:previous??{},newValue:fence,note:operation}});
    return {changed:true,generation:fence.generation};
  });
}
module.exports={pauseContentForDeployment};
if(require.main===module){
  if(process.argv[2]==='resume' && (process.env.GEOSUB_CONTENT_RUNTIME!=='production-v1' || process.env.GEOSUB_CONTENT_DISTRIBUTION!=='cloudflare' || process.env.GEOSUB_CONTENT_CACHE_POLICY!=='audited-single-url' || !process.env.GEOSUB_CONTENT_CF_API_TOKEN)) {console.error('Production content readiness configuration missing');process.exit(1);}
  const {PrismaClient}=require('@prisma/client');
  const {PrismaPg}=require('@prisma/adapter-pg');
  const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
  pauseContentForDeployment(db,process.argv[2],Number(process.argv[3])).then((result)=>console.log(JSON.stringify(result))).catch(()=>{console.error('Content deployment fence failed. Verify content rollback status and database access; application checkout was not changed.');process.exitCode=1;}).finally(()=>db.$disconnect());
}
