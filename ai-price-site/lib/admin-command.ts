import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "./admin-auth";
import type { AdminCapability } from "./admin-permissions";
import {
  invalidateAdminCatalogReadModels,
  invalidateAdminPricingReadModels,
  invalidateAdminSeoReadModels,
  invalidateAdminSystemReadModels,
} from "./admin-read-model-cache";
import { AdminSaveConflict } from "./admin-save";
import { adminPrisma } from "./prisma";

export type AdminCommandErrorCode =
  | "INVALID_INPUT"
  | "CONFLICT"
  | "UNIQUE_CONSTRAINT"
  | "RELATION_CHANGED"
  | "INTERNAL_ERROR";

export type AdminCommandDomain = "pricing" | "catalog" | "seo" | "system";

export type AdminCommandAuditInput = {
  action: string;
  targetType: string;
  targetId?: string | null;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  note?: string | null;
};

export type AdminCommandResult<TData> =
  | { ok: true; data: TData; requestId: string }
  | {
      ok: false;
      code: AdminCommandErrorCode;
      message: string;
      requestId: string;
    };

export class AdminCommandInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminCommandInputError";
  }
}

type AdminActor = Awaited<ReturnType<typeof requireAdmin>>;
type AdminDbClient = PrismaClient | Prisma.TransactionClient;

function isNextControlFlowError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("digest" in error)) {
    return false;
  }
  const digest = String((error as { digest?: unknown }).digest ?? "");
  return digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND");
}

function invalidateDomains(domains: readonly AdminCommandDomain[] | undefined) {
  if (!domains?.length) return;
  for (const domain of domains) {
    if (domain === "pricing") invalidateAdminPricingReadModels();
    else if (domain === "catalog") invalidateAdminCatalogReadModels();
    else if (domain === "seo") invalidateAdminSeoReadModels();
    else if (domain === "system") invalidateAdminSystemReadModels();
  }
}

export async function executeAdminCommand<TInput, TData>({
  name,
  capability,
  input: rawInput,
  parseInput,
  preflight,
  transactional = true,
  db = adminPrisma,
  execute,
  audit,
  invalidate,
  revalidatePaths,
  afterCommit,
}: {
  name: string;
  capability: AdminCapability;
  input: unknown;
  parseInput?: (raw: unknown) => TInput;
  preflight?: (ctx: {
    admin: AdminActor;
    input: TInput;
    db: PrismaClient;
    requestId: string;
  }) => Promise<void> | void;
  transactional?: boolean;
  db?: PrismaClient;
  execute: (ctx: {
    admin: AdminActor;
    input: TInput;
    tx: AdminDbClient;
    requestId: string;
  }) => Promise<TData>;
  audit?: (ctx: {
    admin: AdminActor;
    input: TInput;
    data: TData;
    requestId: string;
  }) => AdminCommandAuditInput | null | undefined;
  invalidate?: readonly AdminCommandDomain[];
  revalidatePaths?:
    | readonly string[]
    | ((ctx: { input: TInput; data: TData }) => readonly string[]);
  afterCommit?: (ctx: {
    admin: AdminActor;
    input: TInput;
    data: TData;
    requestId: string;
  }) => Promise<void> | void;
}): Promise<AdminCommandResult<TData>> {
  const requestId = randomUUID();
  const admin = await requireAdmin(capability);

  let parsedInput: TInput;
  try {
    parsedInput = parseInput ? parseInput(rawInput) : (rawInput as TInput);
  } catch (error) {
    if (error instanceof AdminCommandInputError) {
      return {
        ok: false,
        code: "INVALID_INPUT",
        message: error.message,
        requestId,
      };
    }
    throw error;
  }

  try {
    if (preflight) {
      await preflight({ admin, input: parsedInput, db, requestId });
    }

    const runBody = async (tx: AdminDbClient) => {
      const data = await execute({
        admin,
        input: parsedInput,
        tx,
        requestId,
      });

      const auditEntry = audit?.({
        admin,
        input: parsedInput,
        data,
        requestId,
      });
      if (auditEntry) {
        await tx.auditLog.create({
          data: {
            actorId: admin.id,
            action: auditEntry.action,
            targetType: auditEntry.targetType,
            targetId: auditEntry.targetId ?? undefined,
            oldValue: auditEntry.oldValue,
            newValue: auditEntry.newValue,
            note: auditEntry.note ?? undefined,
          },
        });
      }

      return data;
    };

    const data = transactional
      ? await db.$transaction((tx) => runBody(tx))
      : await runBody(db);

    invalidateDomains(invalidate);

    const paths =
      typeof revalidatePaths === "function"
        ? revalidatePaths({ input: parsedInput, data })
        : revalidatePaths ?? [];
    for (const targetPath of paths) {
      revalidatePath(targetPath);
    }

    if (afterCommit) {
      await afterCommit({ admin, input: parsedInput, data, requestId });
    }

    return { ok: true, data, requestId };
  } catch (error) {
    if (isNextControlFlowError(error)) {
      throw error;
    }

    if (error instanceof AdminCommandInputError) {
      return {
        ok: false,
        code: "INVALID_INPUT",
        message: error.message,
        requestId,
      };
    }

    if (error instanceof AdminSaveConflict) {
      return {
        ok: false,
        code: "CONFLICT",
        message: error.message,
        requestId,
      };
    }

    const prismaCode =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : null;

    if (prismaCode === "P2002") {
      return {
        ok: false,
        code: "UNIQUE_CONSTRAINT",
        message: "名称或网址标识已被使用，请修改后重试。输入仍保留。",
        requestId,
      };
    }

    if (prismaCode === "P2003" || prismaCode === "P2025") {
      return {
        ok: false,
        code: "RELATION_CHANGED",
        message: "关联记录已变化，本次保存已撤销。请核对关联对象后重试，输入仍保留。",
        requestId,
      };
    }

    const errorName =
      error instanceof Error ? error.name : typeof error;
    console.error(
      JSON.stringify({
        event: "admin_command_error",
        command: name,
        requestId,
        actorId: admin.id,
        errorName,
      }),
    );

    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "操作执行失败，请稍后重试或联系站点负责人排查。",
      requestId,
    };
  }
}
