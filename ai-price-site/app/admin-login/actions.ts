"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "../../lib/prisma";
import {
  clearAdminLoginFailures,
  createAdminSession,
  findTrustedDevice,
  getAdminLoginThrottle,
  recordAdminLoginFailure,
  recordTrustedDeviceFailure,
  rememberTrustedDevice,
  verifyPassword,
} from "../../lib/admin-auth";
import { getTrustedClientIp } from "../../lib/client-ip";

const DUMMY_PASSWORD_HASH =
  "scrypt:geosub-dummy-salt:1ea3ba8bee17bd70e4f8a055759009fbe18dfe5e51a3dde1d630bc3d638f0afd5ef9fa17c5b4e37f9b07a7d8b33f89b032e6776eaf0a799052c7a6286c972e66";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect("/admin-login?error=missing");
  }

  const requestHeaders = await headers();
  const ipAddress = getTrustedClientIp(requestHeaders);
  const user = await prisma.adminUser.findUnique({
    where: {
      email,
    },
  });
  const trustedDevice =
    user?.status === "ACTIVE" ? await findTrustedDevice(user.id) : null;
  const throttle = await getAdminLoginThrottle(email, ipAddress, {
    trustedDevice: Boolean(trustedDevice),
  });

  if (throttle.blocked) {
    redirect("/admin-login?error=throttled");
  }

  const valid = verifyPassword(password, user?.passwordHash || DUMMY_PASSWORD_HASH);

  if (!user || user.status !== "ACTIVE" || !valid) {
    await recordAdminLoginFailure(email, ipAddress);
    if (trustedDevice) await recordTrustedDeviceFailure(trustedDevice.id);
    redirect("/admin-login?error=invalid");
  }

  await clearAdminLoginFailures(email, ipAddress);
  await rememberTrustedDevice(user.id, trustedDevice?.id ?? null);
  await createAdminSession(user.id);

  redirect("/admin");
}
