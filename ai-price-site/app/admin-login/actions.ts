"use server";

import { redirect } from "next/navigation";
import { prisma } from "../../lib/prisma";
import { createAdminSession, verifyPassword } from "../../lib/admin-auth";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect("/admin-login?error=missing");
  }

  const user = await prisma.adminUser.findUnique({
    where: {
      email,
    },
  });

  if (!user || user.status !== "ACTIVE") {
    redirect("/admin-login?error=invalid");
  }

  const valid = verifyPassword(password, user.passwordHash);

  if (!valid) {
    redirect("/admin-login?error=invalid");
  }

  await createAdminSession(user.id);

  redirect("/admin");
}
