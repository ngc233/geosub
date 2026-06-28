import "server-only";

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";

const COOKIE_NAME = "geosub_admin_session";
const SESSION_DAYS = 7;

export function verifyPassword(password: string, passwordHash: string) {
  const parts = passwordHash.split(":");

  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }

  const salt = parts[1];
  const storedHash = parts[2];

  const inputHash = scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (inputHash.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(inputHash, storedBuffer);
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAdminSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.adminSession.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);

  const session = await prisma.adminSession.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.adminSession.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  if (session.user.status !== "ACTIVE") {
    return null;
  }

  return session.user;
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin-login");
  }

  return admin;
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    const tokenHash = hashSessionToken(token);

    await prisma.adminSession.deleteMany({
      where: {
        tokenHash,
      },
    });
  }

  cookieStore.delete(COOKIE_NAME);
}
