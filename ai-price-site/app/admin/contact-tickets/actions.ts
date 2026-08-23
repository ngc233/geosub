"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../lib/admin-auth";
import { prisma } from "../../../lib/prisma";

const statuses = new Set(["new", "in_progress", "replied", "closed"]);

export async function updateContactTicket(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  const adminNote = String(formData.get("adminNote") || "").trim().slice(0, 5000) || null;
  if (!id || !statuses.has(status)) redirect("/admin/contact-tickets?error=invalid");

  await prisma.contactTicket.update({
    where: { id },
    data: {
      status,
      adminNote,
      repliedAt: status === "replied" ? new Date() : undefined,
      closedAt: status === "closed" ? new Date() : null,
    },
  });
  revalidatePath("/admin/contact-tickets");
  redirect(`/admin/contact-tickets?updated=${id.slice(0, 8)}`);
}
