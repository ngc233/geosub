import 'server-only';
import { contentTargets } from './content-target-registry';
import { assertLocalContentDatabase } from './managed-content';
import { contentStore } from './managed-content-store';
import { distributeContentAttempt } from './content-distribution';

/** One bounded sweep, no in-memory queue; a new process resumes from durable state. */
export async function recoverContentDeliveries(invalidate: (target: typeof contentTargets[number]) => Promise<void>) {
 assertLocalContentDatabase(process.env.DATABASE_URL);
 const results=[];
 for(const target of contentTargets) {
  try {
   const claim=await contentStore(target.id).claimContentRecovery();
   if(claim.status==='skipped') { results.push({targetId:target.id,...claim}); continue; }
   const receipt=await distributeContentAttempt(claim.attempt.id,claim.attempt.owner!,()=>invalidate(target),null,target.id);
   results.push({targetId:target.id,status:receipt});
  } catch {
   // An uncertain transport/DB outcome is never redispatched here. Next sweep
   // consults the saved attempt/lease. Do not return credentials or raw errors.
   results.push({targetId:target.id,status:'failed'});
  }
 }
 return results;
}
