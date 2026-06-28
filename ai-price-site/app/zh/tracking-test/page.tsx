import TrackedLink from "../../../components/analytics/TrackedLink";
import TrackedButton from "../../../components/analytics/TrackedButton";

export default function TrackingTestPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-bold text-blue-700">GeoSub Tracking Test</p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          埋点测试页
        </h1>

        <p className="mt-4 text-sm leading-7 text-slate-600">
          这个页面用于测试 TrackedLink 和 TrackedButton 是否能自动写入 event_logs。
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <TrackedLink
            href="/zh/"
            eventKey="click_internal_link"
            eventName="Click Internal Link"
            buttonKey="go_home"
            placement="tracking_test"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-800 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            测试内部链接
          </TrackedLink>

          <TrackedLink
            href="https://chatgpt.com/"
            eventKey="click_official"
            eventName="Click Official Website"
            buttonKey="chatgpt_official"
            placement="tracking_test"
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-800 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            测试官方入口
          </TrackedLink>

          <TrackedButton
            eventKey="click_button"
            eventName="Click Test Button"
            buttonKey="test_button"
            placement="tracking_test"
            className="rounded-2xl border border-blue-700 bg-blue-700 px-5 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
          >
            测试普通按钮
          </TrackedButton>

          <TrackedButton
            eventKey="click_affiliate"
            eventName="Click Affiliate"
            buttonKey="test_affiliate_button"
            placement="tracking_test"
            source="affiliate_test"
            className="rounded-2xl border border-green-700 bg-green-700 px-5 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-green-800"
          >
            测试 Affiliate 点击
          </TrackedButton>
        </div>
      </div>
    </main>
  );
}
