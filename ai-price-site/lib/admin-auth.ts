import "server-only";

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";

const COOKIE_NAME = "geosub_admin_session";
const DEFAULT_SESSION_HOURS = 24;
const MAX_SESSION_HOURS = 24 * 7;
const MAX_ACTIVE_SESSIONS = 5;
const LOGIN_WINDOW_MINUTES = 15;
const LOGIN_BLOCK_MINUTES = 30;
const LOGIN_ATTEMPT_RETENTION_DAYS = 7;

type LoginThrottleKey = {
  keyHash: string;
  scope: "account" | "ip";
  limit: number;
};

type LoginThrottleRow = {
  blocked_until: Date | null;
};

function getSessionHours() {
  const configured = Number(process.env.GEOSUB_ADMIN_SESSION_HOURS);

  if (!Number.isFinite(configured)) {
    return DEFAULT_SESSION_HOURS;
  }

  return Math.min(Math.max(Math.trunc(configured), 1), MAX_SESSION_HOURS);
}

function hashLoginThrottleKey(scope: LoginThrottleKey["scope"], value: string) {
  return createHash("sha256")
    .update(`${scope}:${value.trim().toLowerCase()}`)
    .digest("hex");
}

function getLoginThrottleKeys(email: string, ipAddress: string): LoginThrottleKey[] {
  return [
    {
      keyHash: hashLoginThrottleKey("ip", ipAddress || "unknown"),
      scope: "ip",
      limit: 5,
    },
    {
      keyHash: hashLoginThrottleKey("account", email),
      scope: "account",
      limit: 8,
    },
  ];
}

export async function getAdminLoginThrottle(email: string, ipAddress: string) {
  const keys = getLoginThrottleKeys(email, ipAddress);
  const rows = await prisma.$queryRaw<LoginThrottleRow[]>(Prisma.sql`
    SELECT blocked_until
    FROM admin_login_attempts
    WHERE key_hash IN (${Prisma.join(keys.map((key) => key.keyHash))})
      AND blocked_until > NOW()
    ORDER BY blocked_until DESC
    LIMIT 1
  `);
  const blockedUntil = rows[0]?.blocked_until || null;

  return {
    blocked: Boolean(blockedUntil),
    retryAfterSeconds: blockedUntil
      ? Math.max(1, Math.ceil((blockedUntil.getTime() - Date.now()) / 1000))
      : 0,
  };
}

export async function recordAdminLoginFailure(email: string, ipAddress: string) {
  const keys = getLoginThrottleKeys(email, ipAddress);

  await prisma.$transaction(
    keys.map((key) =>
      prisma.$executeRaw(Prisma.sql`
        INSERT INTO admin_login_attempts (
          key_hash,
          scope,
          attempt_count,
          window_started_at,
          blocked_until,
          updated_at
        )
        VALUES (${key.keyHash}, ${key.scope}, 1, NOW(), NULL, NOW())
        ON CONFLICT (key_hash) DO UPDATE
        SET
          scope = EXCLUDED.scope,
          attempt_count = CASE
            WHEN admin_login_attempts.window_started_at < NOW() - make_interval(mins => ${LOGIN_WINDOW_MINUTES})
              THEN 1
            ELSE admin_login_attempts.attempt_count + 1
          END,
          window_started_at = CASE
            WHEN admin_login_attempts.window_started_at < NOW() - make_interval(mins => ${LOGIN_WINDOW_MINUTES})
              THEN NOW()
            ELSE admin_login_attempts.window_started_at
          END,
          blocked_until = CASE
            WHEN admin_login_attempts.blocked_until > NOW()
              THEN admin_login_attempts.blocked_until
            WHEN (
              CASE
                WHEN admin_login_attempts.window_started_at < NOW() - make_interval(mins => ${LOGIN_WINDOW_MINUTES})
                  THEN 1
                ELSE admin_login_attempts.attempt_count + 1
              END
            ) >= ${key.limit}
              THEN NOW() + make_interval(mins => ${LOGIN_BLOCK_MINUTES})
            ELSE NULL
          END,
          updated_at = NOW()
      `)
    )
  );

  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM admin_login_attempts
    WHERE updated_at < NOW() - make_interval(days => ${LOGIN_ATTEMPT_RETENTION_DAYS})
  `);
}

export async function clearAdminLoginFailures(email: string, ipAddress: string) {
  const keys = getLoginThrottleKeys(email, ipAddress);

  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM admin_login_attempts
    WHERE key_hash IN (${Prisma.join(keys.map((key) => key.keyHash))})
  `);
}

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

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `scrypt:${salt}:${hash}`;
}

export function getAdminPasswordPolicyError(password: string) {
  if (password.length < 14) {
    return "新密码至少需要 14 个字符。";
  }

  if (password.length > 128) {
    return "新密码不能超过 128 个字符。";
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return "新密码需要同时包含大写和小写英文字母。";
  }

  if (!/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return "新密码需要同时包含数字和符号。";
  }

  return null;
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAdminSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + getSessionHours() * 60 * 60 * 1000);

  await prisma.adminSession.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  await prisma.adminSession.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  const staleSessions = await prisma.adminSession.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: MAX_ACTIVE_SESSIONS,
    select: {
      id: true,
    },
  });

  if (staleSessions.length > 0) {
    await prisma.adminSession.deleteMany({
      where: {
        id: {
          in: staleSessions.map((session) => session.id),
        },
      },
    });
  }

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
    priority: "high",
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
    await prisma.adminSession.delete({
      where: {
        id: session.id,
      },
    });

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

export async function changeCurrentAdminPassword({
  userId,
  currentPassword,
  newPassword,
}: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return { ok: false as const, reason: "session" as const };
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

  if (
    !session ||
    session.userId !== userId ||
    session.expiresAt.getTime() < Date.now() ||
    session.user.status !== "ACTIVE"
  ) {
    return { ok: false as const, reason: "session" as const };
  }

  if (!verifyPassword(currentPassword, session.user.passwordHash)) {
    return { ok: false as const, reason: "current" as const };
  }

  if (verifyPassword(newPassword, session.user.passwordHash)) {
    return { ok: false as const, reason: "unchanged" as const };
  }

  const deletedSessions = await prisma.$transaction(async (tx) => {
    await tx.adminUser.update({
      where: {
        id: userId,
      },
      data: {
        passwordHash: hashPassword(newPassword),
      },
    });

    const revoked = await tx.adminSession.deleteMany({
      where: {
        userId,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "change_password",
        targetType: "admin_user",
        targetId: userId,
        newValue: {
          otherSessionsRevoked: Math.max(0, revoked.count - 1),
          currentSessionRotated: true,
        },
        note: "Administrator changed the account password from system settings.",
      },
    });

    return revoked.count;
  });

  await createAdminSession(userId);

  return {
    ok: true as const,
    revokedSessions: Math.max(0, deletedSessions - 1),
  };
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
