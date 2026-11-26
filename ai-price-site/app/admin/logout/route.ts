import { clearAdminSession } from "../../../lib/admin-auth";
import {
  adminRouteJson,
  adminRouteRedirect,
  verifyAdminMutationOrigin,
} from "../../../lib/admin-route-guard";

export async function POST(request: Request) {
  const originCheck = verifyAdminMutationOrigin(request);
  if (!originCheck.ok) {
    return adminRouteJson(
      {
        ok: false,
        code: "INVALID_ORIGIN",
        message: "请求来源校验未通过，请刷新后台页面后重试。",
      },
      { status: 403 },
    );
  }

  await clearAdminSession();
  return adminRouteRedirect("/admin-login", 303);
}
