import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clampAdminPage } from "@/lib/admin-list-params";
import type { Edition, Market } from "@/lib/game-offers";

type Prior = {
  run_id: string;
  public_price: string | null;
  currency: string | null;
  purchasable_status: string;
  verified_at: string;
  valid_until: string;
};
export type GameReviewRow = {
  run_id: string;
  product_name: string;
  platform: "ps5" | "xbox";
  edition: Edition;
  market: Market;
  offer_type: "full_game" | "upgrade";
  store_url: string;
  currency: string | null;
  public_price: string | null;
  purchasable_status: string;
  review_reason: string | null;
  observed_at: Date;
  prior: Prior | null;
  review_status: "pending" | "approved" | "rejected";
  reviewed_at: Date | null;
  reviewer: string | null;
  note: string | null;
  has_audit: boolean;
};
export const gameReviewPageSize = 12;
const auditType = "game_offer_attempt";
const priorSnapshot = Prisma.sql`CASE WHEN v.run_id IS NOT NULL THEN jsonb_build_object(
  'run_id', v.run_id, 'public_price', v.public_price::text, 'currency', v.currency,
  'purchasable_status', v.purchasable_status, 'verified_at', v.verified_at, 'valid_until', v.valid_until) END`;

export async function getGameReviewPage(product: string, history: boolean, requestedPage: number) {
  const [schema] = await prisma.$queryRaw<{ ready: boolean }[]>`
    SELECT to_regclass('game_offer_latest_verified') IS NOT NULL AS ready`;
  if (!schema.ready) return null;
  const filter = Prisma.sql`FROM game_offer_attempts a
    JOIN game_offer_targets t ON t.id=a.target_id JOIN products p ON p.id=t.product_id
    WHERE (${product}='' OR p.slug=${product})
    AND a.review_status IN (${Prisma.join(history ? ["approved", "rejected"] : ["pending"])})`;
  return prisma.$transaction(
    async (tx) => {
      const [count] = await tx.$queryRaw<{ total: number }[]>`SELECT count(*)::int AS total ${filter}`;
      const { page, totalPages } = clampAdminPage(requestedPage, count.total, gameReviewPageSize);
      const order = history
        ? Prisma.sql`a.reviewed_at DESC, a.run_id DESC`
        : Prisma.sql`a.observed_at, a.run_id`;
      const rows = await tx.$queryRaw<GameReviewRow[]>`
      WITH selected AS (SELECT a.run_id ${filter} ORDER BY ${order}
        LIMIT ${gameReviewPageSize} OFFSET ${(page - 1) * gameReviewPageSize})
      SELECT a.run_id,p.name AS product_name,t.platform,t.edition,t.market,t.offer_type,t.store_url,
        a.public_price::text,a.currency,a.purchasable_status,a.observed_at,a.review_reason,
        a.review_status,a.reviewed_at,l.id IS NOT NULL AS has_audit,l.note,
        COALESCE(l.new_value->>'reviewer',u.name,u.email) AS reviewer,
        CASE WHEN a.review_status='pending' THEN ${priorSnapshot} ELSE l.old_value END AS prior
      FROM selected JOIN game_offer_attempts a USING(run_id) JOIN game_offer_targets t ON t.id=a.target_id
      JOIN products p ON p.id=t.product_id LEFT JOIN game_offer_latest_verified v ON v.target_id=t.id
      LEFT JOIN audit_logs l ON l.target_type=${auditType} AND l.target_id=a.run_id AND l.action IN ('approved','rejected')
      LEFT JOIN admin_users u ON u.id=l.actor_id ORDER BY ${order}`;
      return { rows, page, totalPages, total: count.total };
    },
    { isolationLevel: "RepeatableRead" },
  );
}

export async function decideGameOffer(input: {
  runId: string;
  expectedPrior: string;
  decision: "approved" | "rejected";
  reason: string;
  actorId: string;
  reviewer: string;
}) {
  return prisma.$transaction(
    async (tx) => {
      // Serialize decisions for the same SKU, then re-read the baseline in a fresh statement.
      const [target] = await tx.$queryRaw<{ id: string }[]>`
      SELECT t.id FROM game_offer_targets t JOIN game_offer_attempts a ON t.id=a.target_id
      WHERE a.run_id=${input.runId}::uuid FOR UPDATE OF t`;
      if (!target) return { error: "报价记录不存在。" };
      const [previous] = await tx.$queryRaw<{ prior: Prior }[]>`
      SELECT ${priorSnapshot} AS prior FROM game_offer_latest_verified v WHERE target_id=${target.id}::uuid`;
      if ((previous?.prior.run_id ?? "") !== input.expectedPrior) {
        return { error: "该商品的核准记录已更新，请刷新后重新核对价格。" };
      }
      const written = await tx.$executeRaw`
        WITH decision AS (
          UPDATE game_offer_attempts SET review_status=${input.decision}, reviewed_at=clock_timestamp()
          WHERE run_id=${input.runId}::uuid AND review_status='pending'
          RETURNING run_id,target_id,review_status,reviewed_at,public_price,currency,purchasable_status
        )
        INSERT INTO audit_logs (id,actor_id,target_type,target_id,action,note,created_at,old_value,new_value)
        SELECT gen_random_uuid(),${input.actorId}::uuid,${auditType},run_id,review_status,${input.reason},
          reviewed_at,${previous ? JSON.stringify(previous.prior) : null}::jsonb,
          jsonb_build_object('reviewer',${input.reviewer}::text,'public_price',public_price::text,
            'currency',currency,'purchasable_status',purchasable_status,'target_id',target_id)
        FROM decision`;
      if (!written) return { error: "这条报价已处理或无法审核，请刷新查看记录。" };
      return { ok: true };
    },
    { isolationLevel: "ReadCommitted" },
  );
}
