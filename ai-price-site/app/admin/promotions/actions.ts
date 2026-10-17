"use server";
import { revalidatePath } from "next/cache";
import { mutatePromotion } from "../../../lib/first-party-promotion-store";
export async function promotionAction(_: { message: string }, form: FormData) {
  try {
    await mutatePromotion(form);
    revalidatePath("/admin/promotions");
    return { ok: true, message: "已保存。草稿不会自动投放；请核对最新状态。" };
  } catch (error) {
    return { ok: false, message: error instanceof Error && !/prisma|postgres|database|query|sql|connection|uuid/i.test(error.message) ? error.message : "操作未完成。请确认推广数据库迁移和运行配置已完成，再刷新重试。" };
  }
}
