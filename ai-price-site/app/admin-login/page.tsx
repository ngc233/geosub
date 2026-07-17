import { loginAction } from "./actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const error = params?.error;

  let errorText = "";

  if (error === "missing") {
    errorText = "请输入邮箱和密码。";
  }

  if (error === "invalid") {
    errorText = "邮箱或密码不正确。";
  }

  if (error === "throttled") {
    errorText = "登录尝试过于频繁，请 30 分钟后重试。";
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1fr_520px]">
        <section className="hidden border-r border-slate-200 bg-white px-12 py-12 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-700 text-sm font-bold text-white shadow-sm">
                G
              </div>

              <div>
                <p className="text-sm font-bold tracking-tight text-blue-700">
                  GeoSub
                </p>
                <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-950">
                  Admin Console
                </h1>
              </div>
            </div>

            <div className="mt-16 max-w-xl">
              <p className="text-sm font-bold text-blue-700">自建后台</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">
                管理全球数字服务价格数据。
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                GeoSub Admin 用于管理数字服务、套餐、地区价格、文章、SEO、广告、Affiliate 和审核流程。
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-500">数据库</p>
              <p className="mt-2 text-lg font-bold text-slate-950">PostgreSQL</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-500">ORM</p>
              <p className="mt-2 text-lg font-bold text-slate-950">Prisma</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-500">模式</p>
              <p className="mt-2 text-lg font-bold text-slate-950">Self-built</p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-700 text-sm font-bold text-white shadow-sm">
                  G
                </div>

                <div>
                  <p className="text-sm font-bold tracking-tight text-blue-700">
                    GeoSub
                  </p>
                  <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-950">
                    Admin Console
                  </h1>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/70">
              <div className="mb-8">
                <p className="text-sm font-bold text-blue-700">Login</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                  登录后台
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  使用管理员账号进入 GeoSub 自建后台。
                </p>
              </div>

              {errorText ? (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {errorText}
                </div>
              ) : null}

              <form action={loginAction} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    邮箱
                  </label>
                  <input
                    name="email"
                    type="email"
                    autoComplete="username"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-700/10"
                    placeholder="管理员邮箱"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    密码
                  </label>
                  <input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-700/10"
                    placeholder="请输入管理员密码"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-blue-700 bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-blue-900/10 transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-700/15"
                >
                  登录
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
