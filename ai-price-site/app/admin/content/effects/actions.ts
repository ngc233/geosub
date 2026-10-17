"use server";
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../../../../lib/admin-auth';
import { linkContentEffect, captureContentEffect } from '../../../../lib/content-effects-store';
export async function effectAction(_: {message:string}, form:FormData) {
 const admin=await requireAdmin('manage');
 try {
  if(form.get('operation')==='capture') await captureContentEffect(admin.id,String(form.get('id')));
  else if(form.get('operation')==='link') await linkContentEffect(admin.id,{version:Number(form.get('version')),opportunityId:String(form.get('opportunityId')),hypothesis:String(form.get('hypothesis')),engine:String(form.get('engine')),timezone:String(form.get('timezone'))});
  else throw Error('操作无效。');
  revalidatePath('/admin/content/effects');
  return {ok:true,message:'记录已保存；内容发布状态未改变。'};
 } catch(error) {return {ok:false,message:error instanceof Error&&!/prisma|sql|database|connection/i.test(error.message)?error.message:'保存未完成，请刷新后重试。'};}
}
