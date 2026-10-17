"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/admin-auth";
import { prisma } from "../../../lib/prisma";
import { adminRecordVersion, assertAdminVersion, attemptAdminSave } from "../../../lib/admin-save";
const statuses = new Set(["new", "in_progress", "replied", "closed"]);
export async function updateContactTicket(formData: FormData) {
 const admin=await requireAdmin("manage");
 const id=String(formData.get("id")||""),status=String(formData.get("status")||"");
 const text=String(formData.get("adminNote")||"").trim();
 if(!/^[0-9a-f-]{36}$/i.test(id)||!statuses.has(status)||text.length>5000)return {error:"请核对工单、处理状态及备注长度，输入仍保留。"};
 const result=await attemptAdminSave(prisma,async tx=>{
  await tx.$executeRaw`SELECT id FROM contact_tickets WHERE id = ${id}::uuid FOR UPDATE`;
  const current=await tx.contactTicket.findUnique({where:{id}});assertAdminVersion(current,formData.get('recordVersion'));
  const saved=await tx.contactTicket.update({where:{id},data:{status,adminNote:text||null,repliedAt:status==='replied'?(current!.repliedAt||new Date()):current!.repliedAt,closedAt:status==='closed'?(current!.closedAt||new Date()):null}});
  await tx.auditLog.create({data:{actorId:admin.id,action:'contact_ticket_update',targetType:'contact_ticket',targetId:id,newValue:{status,noteChanged:current!.adminNote!==saved.adminNote}}});
  return adminRecordVersion(saved);
 });
 if(!result.ok)return {error:result.error};
 revalidatePath('/admin/contact-tickets');return {recordVersion:result.value};
}
