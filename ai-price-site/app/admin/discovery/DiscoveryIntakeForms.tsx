"use client";

import { useActionState, useState } from "react";
import { PackagePlus, Radar } from "lucide-react";
import {
  createDiscoverySource,
  createManualCandidate,
  type DiscoveryActionState,
} from "./actions";

type IntakeMode = "candidate" | "source";

const initialState: DiscoveryActionState = {
  ok: false,
  message: "",
};

const inputClassName =
  "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

const labelClassName = "text-xs font-semibold text-slate-500";

function ActionMessage({ state }: { state: DiscoveryActionState }) {
  if (!state.message) return null;

  return (
    <div
      className={[
        "rounded-lg border px-3 py-2 text-sm",
        state.ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700",
      ].join(" ")}
    >
      {state.message}
    </div>
  );
}

function ModeButton({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex min-h-[92px] items-start gap-3 rounded-xl border p-4 text-left transition",
        active
          ? "border-blue-200 bg-blue-50 text-blue-950 ring-1 ring-blue-100"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
      ].join(" ")}
    >
      <span
        className={[
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          active ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-500",
        ].join(" ")}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-bold">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>
    </button>
  );
}

function ProductCandidateForm() {
  const [state, formAction, pending] = useActionState(
    createManualCandidate,
    initialState
  );

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <ActionMessage state={state} />
      </div>

      <label className="block">
        <span className={labelClassName}>产品名</span>
        <input
          name="name"
          required
          className={inputClassName}
          placeholder="DeepSeek"
        />
      </label>

      <label className="block">
        <span className={labelClassName}>Slug</span>
        <input
          name="suggestedSlug"
          className={inputClassName}
          placeholder="deepseek"
        />
      </label>

      <label className="block">
        <span className={labelClassName}>分类</span>
        <select
          name="suggestedCategory"
          defaultValue="ai"
          className={inputClassName}
        >
          <option value="ai">AI 订阅</option>
          <option value="software">软件订阅</option>
          <option value="streaming">流媒体</option>
          <option value="game">游戏</option>
          <option value="gift_card">礼品卡</option>
          <option value="vpn">网络工具</option>
          <option value="payment">支付服务</option>
          <option value="other">其他</option>
        </select>
      </label>

      <label className="block">
        <span className={labelClassName}>服务商</span>
        <input
          name="provider"
          className={inputClassName}
          placeholder="OpenAI / DeepSeek"
        />
      </label>

      <label className="block md:col-span-2">
        <span className={labelClassName}>官网</span>
        <input
          name="officialUrl"
          type="url"
          className={inputClassName}
          placeholder="https://example.com"
        />
      </label>

      <label className="block md:col-span-2">
        <span className={labelClassName}>定价页</span>
        <input
          name="pricingUrl"
          type="url"
          className={inputClassName}
          placeholder="https://example.com/pricing"
        />
      </label>

      <label className="block">
        <span className={labelClassName}>线索来源</span>
        <select
          name="sourceType"
          defaultValue="manual_tip"
          className={inputClassName}
        >
          <option value="manual_tip">人工线索</option>
          <option value="official_site">官网</option>
          <option value="search">搜索</option>
          <option value="competitor">竞品站</option>
          <option value="rss">RSS</option>
          <option value="social">社媒</option>
          <option value="other">其他</option>
        </select>
      </label>

      <label className="block">
        <span className={labelClassName}>置信度</span>
        <input
          name="confidenceScore"
          type="number"
          min="0"
          max="100"
          defaultValue="65"
          className={inputClassName}
        />
      </label>

      <label className="block md:col-span-2">
        <span className={labelClassName}>发现原因</span>
        <textarea
          name="discoveryReason"
          rows={3}
          className={inputClassName}
          placeholder="为什么值得进入候选池？"
        />
      </label>

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {pending ? "正在添加..." : "添加到候选池"}
        </button>
      </div>
    </form>
  );
}

function DiscoverySourceForm() {
  const [state, formAction, pending] = useActionState(
    createDiscoverySource,
    initialState
  );

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <ActionMessage state={state} />
      </div>

      <label className="block">
        <span className={labelClassName}>来源名称</span>
        <input
          name="name"
          required
          className={inputClassName}
          placeholder="OpenAI Blog"
        />
      </label>

      <label className="block">
        <span className={labelClassName}>来源类型</span>
        <select
          name="sourceType"
          defaultValue="official_site"
          className={inputClassName}
        >
          <option value="official_site">官网</option>
          <option value="rss">RSS</option>
          <option value="search">搜索</option>
          <option value="competitor">竞品站</option>
          <option value="app_store">App Store</option>
          <option value="google_play">Google Play</option>
          <option value="social">社媒</option>
          <option value="other">其他</option>
        </select>
      </label>

      <label className="block md:col-span-2">
        <span className={labelClassName}>URL</span>
        <input
          name="url"
          type="url"
          required
          className={inputClassName}
          placeholder="https://example.com/blog"
        />
      </label>

      <label className="block">
        <span className={labelClassName}>分类提示</span>
        <select name="categoryHint" defaultValue="ai" className={inputClassName}>
          <option value="ai">AI 订阅</option>
          <option value="software">软件订阅</option>
          <option value="streaming">流媒体</option>
          <option value="game">游戏</option>
          <option value="other">其他</option>
        </select>
      </label>

      <label className="block">
        <span className={labelClassName}>检查间隔</span>
        <input
          name="scanIntervalHours"
          type="number"
          min="1"
          max="720"
          defaultValue="24"
          className={inputClassName}
        />
      </label>

      <label className="block">
        <span className={labelClassName}>关键词</span>
        <input
          name="query"
          className={inputClassName}
          placeholder="pricing / new model"
        />
      </label>

      <label className="block">
        <span className={labelClassName}>可靠度</span>
        <input
          name="reliabilityScore"
          type="number"
          min="0"
          max="100"
          defaultValue="60"
          className={inputClassName}
        />
      </label>

      <label className="block">
        <span className={labelClassName}>判断策略</span>
        <select name="strategy" defaultValue="auto" className={inputClassName}>
          <option value="auto">自动判断</option>
          <option value="pricing_page">价格页</option>
          <option value="announcement_feed">官方动态</option>
          <option value="marketplace">应用市场</option>
          <option value="competitor_page">竞品页</option>
          <option value="search_result">搜索结果</option>
        </select>
      </label>

      <label className="block">
        <span className={labelClassName}>入池门槛</span>
        <input
          name="promoteThreshold"
          type="number"
          min="0"
          max="100"
          defaultValue="60"
          className={inputClassName}
        />
      </label>

      <label className="block">
        <span className={labelClassName}>观察门槛</span>
        <input
          name="watchThreshold"
          type="number"
          min="0"
          max="100"
          defaultValue="40"
          className={inputClassName}
        />
      </label>

      <label className="block md:col-span-2">
        <span className={labelClassName}>备注</span>
        <textarea
          name="note"
          rows={3}
          className={inputClassName}
          placeholder="这个来源适合监控什么？"
        />
      </label>

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {pending ? "正在保存..." : "保存来源配置"}
        </button>
      </div>
    </form>
  );
}

export default function DiscoveryIntakeForms() {
  const [mode, setMode] = useState<IntakeMode>("candidate");

  return (
    <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
      <div className="mb-5">
        <p className="text-sm font-bold tracking-tight text-blue-700">
          线索入口
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
          添加发现线索
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          已经明确是某个产品时，先放进候选池等待审核；如果只是一个值得长期监控的网站、频道或应用市场入口，就保存为发现来源，后续由扫描器定期检查。
        </p>
      </div>

      <div className="mb-6 grid gap-3 lg:grid-cols-2">
        <ModeButton
          active={mode === "candidate"}
          icon={<PackagePlus size={18} strokeWidth={2} />}
          title="具体产品线索"
          description="你已经知道某个产品、模型、套餐或定价页，先进入候选池。"
          onClick={() => setMode("candidate")}
        />
        <ModeButton
          active={mode === "source"}
          icon={<Radar size={18} strokeWidth={2} />}
          title="长期发现来源"
          description="配置一个后续自动扫描的来源，例如官网、博客、应用市场或竞品页。"
          onClick={() => setMode("source")}
        />
      </div>

      {mode === "candidate" ? <ProductCandidateForm /> : <DiscoverySourceForm />}
    </section>
  );
}
