import { AdminPageHeader } from "@/components/admin/AdminCard";
import { AdminButton, AdminLinkButton } from "@/components/admin/AdminButton";
import { AdminActionForm } from "@/components/admin/AdminPermissions";
import AdminPagination from "@/components/admin/AdminPagination";
import { adminControlClassName } from "@/components/admin/admin-control";
import { requireAdmin } from "@/lib/admin-auth";
import { names } from "@/lib/game-offers";
import { reviewGameOffer } from "./game-review-action";
import { gameReviewPageSize, getGameReviewPage, type GameReviewRow } from "./game-review-store";

const dateTime = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});
function time(value: Date | string) {
  return dateTime.format(new Date(value));
}
function amount(value: { purchasable_status: string; public_price: string | null; currency: string | null }) {
  if (value.purchasable_status === "unavailable") return "商店页面显示不可购买";
  return value.public_price !== null ? `${value.currency} ${value.public_price}` : "无公开报价";
}

function ReviewRecord({ row }: { row: GameReviewRow }) {
  const label = [
    row.product_name,
    names[row.platform],
    names[row.market] ?? row.market,
    names[row.edition],
    row.offer_type === "upgrade" ? "升级包" : "游戏本体",
  ].join(" · ");
  const pending = row.review_status === "pending";
  return (
    <article
      className="min-w-0 space-y-3 rounded-admin-card border border-admin-border bg-admin-surface p-4"
      data-game-run={row.run_id}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="break-words text-sm font-semibold text-admin-text">{label}</h2>
        <a
          className="text-sm text-admin-accent underline"
          href={row.store_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          打开官方商品页
        </a>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-admin-text-muted">上次核准价</dt>
          <dd className="font-semibold tabular-nums text-admin-text">
            {row.prior ? amount(row.prior) : pending || row.has_audit ? "首次核验" : "历史对照未记录"}
          </dd>
          {row.prior && <dd className="text-xs text-admin-text-muted">核价 {time(row.prior.verified_at)}</dd>}
        </div>
        <div>
          <dt className="text-admin-text-muted">本次公开价</dt>
          <dd className="font-semibold tabular-nums text-admin-text">{amount(row)}</dd>
          <dd className="text-xs text-admin-text-muted">采集 {time(row.observed_at)}</dd>
        </div>
      </dl>
      {row.review_reason && (
        <p className="text-sm font-medium text-admin-text">
          异常原因 ·{" "}
          {row.review_reason === "price_jump"
            ? "价格波动超过阈值，请核对商品与公开售价。"
            : row.review_reason}
        </p>
      )}
      {pending && row.prior && new Date(row.prior.verified_at) > row.observed_at && (
        <p className="text-sm text-admin-text-muted">已有更新的核准样本，通过此条仅保留历史记录。</p>
      )}
      {pending ? (
        <details>
          <summary className="w-fit cursor-pointer py-2 text-sm font-semibold text-admin-accent">
            审核这条报价
          </summary>
          <AdminActionForm
            action={reviewGameOffer}
            confirmMessage={`确认提交「${label}」的审核决定？`}
            className="mt-2 space-y-3"
          >
            <input type="hidden" name="runId" value={row.run_id} />
            <input type="hidden" name="expectedPrior" value={row.prior?.run_id ?? ""} />
            <label className="block text-sm text-admin-text">
              审核理由
              <textarea
                name="reason"
                required
                maxLength={500}
                rows={2}
                className={adminControlClassName + " mt-1 w-full py-2"}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <AdminButton name="decision" value="approved" type="submit">
                通过
              </AdminButton>
              <AdminButton name="decision" value="rejected" type="submit" variant="danger">
                驳回
              </AdminButton>
            </div>
          </AdminActionForm>
        </details>
      ) : (
        <div className="border-t border-admin-border pt-2 text-sm text-admin-text-secondary">
          <p>
            {row.review_status === "approved" ? "已通过" : "已驳回"} · {row.reviewer ?? "审核人未记录"} ·{" "}
            {row.reviewed_at && time(row.reviewed_at)}
          </p>
          <p className="whitespace-pre-wrap break-words">{row.note ?? "审核理由未记录"}</p>
        </div>
      )}
    </article>
  );
}

export default async function GameOfferReview({
  product,
  history,
  page,
}: {
  product: string;
  history: boolean;
  page: number;
}) {
  await requireAdmin("read");
  const data = await getGameReviewPage(product, history, page);
  function href(past: boolean, number = 1) {
    const params = new URLSearchParams({ source: "games" });
    if (product) params.set("product", product);
    if (past) params.set("gameView", "history");
    if (number > 1) params.set("gamePage", String(number));
    return "/admin/review?" + params;
  }
  return (
    <div className="space-y-4">
      <AdminPageHeader
        eyebrow="价格工作流"
        title="游戏报价审核"
        description="按官方商品核对公开购买价。时间均为北京时间。"
        action={
          <AdminLinkButton variant="secondary" href="/admin/review">
            返回异常审核
          </AdminLinkButton>
        }
      />
      <nav aria-label="游戏报价状态" className="flex flex-wrap items-center gap-2">
        <AdminLinkButton href={href(false)} variant={history ? "secondary" : "primary"}>
          待审核
        </AdminLinkButton>
        <AdminLinkButton href={href(true)} variant={history ? "primary" : "secondary"}>
          审核记录
        </AdminLinkButton>
        {product && (
          <AdminLinkButton
            href={"/admin/review?source=games" + (history ? "&gameView=history" : "")}
            variant="ghost"
          >
            清除产品筛选 · {product}
          </AdminLinkButton>
        )}
      </nav>
      {!data ? (
        <p role="status">本环境尚未启用游戏报价采集。</p>
      ) : (
        <>
          <AdminPagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            pageSize={gameReviewPageSize}
            pageHref={(number) => href(history, number)}
            ariaLabel="游戏报价分页"
          />
          {data.rows.length === 0 && (
            <p role="status" className="text-sm text-admin-text-muted">
              {history ? "暂无审核记录。" : "暂无待审游戏报价。"}
            </p>
          )}
          {data.rows.map((row) => (
            <ReviewRecord row={row} key={row.run_id} />
          ))}
        </>
      )}
    </div>
  );
}
