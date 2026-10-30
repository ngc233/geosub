import { revalidatePath, revalidateTag } from 'next/cache';
import { assertLocalContentDatabase } from '../../../../../lib/managed-content';
import { validContentRecoveryToken } from '../../../../../lib/content-recovery-auth';
import { recoverContentDeliveries } from '../../../../../lib/content-recovery';
export const dynamic='force-dynamic';
export async function POST(request: Request) {
 try { assertLocalContentDatabase(process.env.DATABASE_URL); } catch { return new Response(null,{status:404}); }
 if(!validContentRecoveryToken(request.headers.get('x-geosub-content-recovery'),process.env.GEOSUB_CONTENT_RECOVERY_TOKEN))return new Response(null,{status:404});
 const results=await recoverContentDeliveries(async target=>{
  // updateTag is Server-Action-only; expire:0 blocks stale serving in this route.
  revalidateTag(target.cacheTag,{expire:0});
  revalidatePath(target.canonicalPath);
 });
 revalidatePath('/admin/content');
 return Response.json({results},{headers:{'Cache-Control':'no-store'}});
}
