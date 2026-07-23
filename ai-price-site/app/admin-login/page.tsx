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
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-sm font-bold text-white">
              G
            </div>
            <div>
              <p className="text-base font-bold text-slate-950">GeoSub</p>
              <p className="text-xs text-slate-500">管理后台</p>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center px-5 py-10 sm:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center lg:gap-20">
          <div className="max-w-xl">
            <p className="text-sm font-semibold text-blue-700">内部工作台</p>
            <h1 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
              管理采集、审核与内容发布
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">
              登录后优先查看今日待办，再进入产品采集、数据质量和内容维护流程。
            </p>
          </div>

          <div className="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-slate-950">登录后台</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                使用管理员账号继续。
              </p>
            </div>

              {errorText ? (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
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
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-700/10"
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
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-700/10"
                    placeholder="请输入管理员密码"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-blue-700 bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-700/15"
                >
                  登录
                </button>
              </form>

              <details className="mt-6 border-t border-slate-200 pt-5 text-sm text-slate-600">
                <summary className="cursor-pointer font-semibold text-slate-700 outline-none focus:text-blue-700">
                  无法登录？
                </summary>
                <p className="mt-3 leading-6">
                  当前为单管理员模式，不通过邮件发送重置链接。请使用服务器管理通道运行管理员密码重置工具，恢复后再回到这里登录。
                </p>
              </details>
          </div>
        </div>
      </section>
    </main>
  );
}
